import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import z from 'zod';
import { db, uid, now, q, fail } from '../lib/db.mjs';
import { signSession, authRequired, JWT_SECRET, signOptoutToken } from '../middleware/auth.mjs';
import { userView } from '../views/index.mjs';
import { authLimiter } from '../middleware/ratelimit.mjs';
import { firebaseConfigView, verifyFirebaseIdToken, firebaseAdminEmails } from '../lib/firebase.mjs';
import { queueNotify } from '../lib/notifier.mjs';

const VERIFY_TTL = `${process.env.VERIFY_EMAIL_TTL_HOURS || 24}h`;

export function signVerifyToken(userId) {
  const token = jwt.sign({ sub: userId, kind: 'verify' }, JWT_SECRET, { expiresIn: VERIFY_TTL });
  console.log(`verify_token: issued for user ${userId} expires ${VERIFY_TTL}`);
  return token;
}

// Unsubscribe links ride in every marketing-capable email footer. Tokens last
// 90 days and only flip users.email_optout — never a session bearer.
export { signOptoutToken };

export const authRouter = Router();

const Signup = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(1),
  phone: z.string().min(1).optional(),
  country: z.string().length(2).default('ZW'),
  role: z.enum(['customer', 'business_owner', 'service_provider']).default('customer'),
  consent: z.literal(true, { invalid_type_error: 'privacy consent required to create an account' }),
  hp: z.string().max(0).optional(), // honeypot: bots fill it, humans never see it
});

const Login = z.object({ email: z.string().optional(), phone: z.string().optional(), password: z.string().min(1) }).refine(
  (b) => b.email || b.phone,
  'email or phone required'
);

authRouter.post('/signup', authLimiter, (req, res) => {
  const parsed = Signup.safeParse(req.body);
  if (!parsed.success) throw fail(400, 'validation failed', { details: parsed.error.flatten() });
  const body = parsed.data;
  if (body.hp) throw fail(400, 'validation failed'); // honeypot filled: treat as bot

  const clash = q.getUserByIdOrPhone().get(body.email ?? null, body.phone ?? null);
  if (clash) throw fail(409, 'email or phone already registered');

  const id = uid();
  db.prepare(
    `INSERT INTO users (id, email, phone, password_hash, full_name, country, role, created_at, verified)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`
  ).run(
    id,
    body.email,
    body.phone ?? null,
    bcrypt.hashSync(body.password, 10),
    body.full_name,
    body.country,
    body.role,
    now()
  );
  const user = q.getUser().get(id);
  const verify_token = signVerifyToken(id);
  const stubs = { verification: `GET /api/auth/verify/${verify_token} (${VERIFY_TTL}; email delivery deferred, see docs/roadmap.md)` };
  const base = process.env.APP_PUBLIC_URL;
  if (base) {
    queueNotify({
      recipient_id: id,
      channel: 'email',
      trigger: 'subject:Verify your Tuyamika email',
      recipient: user.email,
      message: `Welcome to Tuyamika! Verify your email: ${base}/api/auth/verify/${verify_token} (link valid ${VERIFY_TTL}).`,
    });
    delete stubs.verification;
  }
  res.status(201).json({ user: userView(user), token: signSession(user), stubs });
});

authRouter.post('/login', authLimiter, (req, res) => {
  const parsed = Login.safeParse(req.body);
  if (!parsed.success) throw fail(400, 'validation failed', { details: parsed.error.flatten() });
  const { email, phone, password } = parsed.data;
  const row = q.getUserByIdOrPhone().get(email ?? null, phone ?? null);
  if (!row || !bcrypt.compareSync(password, row.password_hash)) throw fail(401, 'invalid credentials');
  res.json({ user: userView(row), token: signSession(row) });
});

// Data deletion (privacy right). FK graph makes a hard DELETE unsafe
// (orders/events/contributions carry money records that must persist), so the
// account row is tombstoned: every personal field is overwritten, links are
// dropped, and owned registries/events are removed. Financial rows remain
// anonymized for accounting and fraud compliance — documented in the privacy
// policy (/legal/privacy).
const TOMB = {
  emailPrefix: 'deleted-',
  emailDomain: '@tombstone.invalid',
};

authRouter.delete('/account', authRequired, (req, res) => {
  const user = q.getUser().get(req.user.id);
  if (!user) throw fail(404, 'user not found');
  if (user.role === 'admin' && db.prepare('SELECT COUNT(*) n FROM users WHERE role = ?').get('admin').n <= 1) {
    throw fail(409, 'refusing to delete the only admin account');
  }

  const tx = db.transaction(() => {
    const tombEmail = `${TOMB.emailPrefix}${user.id}${TOMB.emailDomain}`;
    db.prepare(
      `UPDATE users SET
         email = ?, phone = NULL, password_hash = '!deleted', full_name = 'Deleted user',
         country = 'ZZ', firebase_uid = NULL, email_optout = 1
       WHERE id = ?`
    ).run(tombEmail, user.id);

    db.prepare(`DELETE FROM registries WHERE owner_id = ?`).run(user.id);         // cascades items
    db.prepare(`DELETE FROM events WHERE owner_id = ?`).run(user.id);              // cascades memberships/tasks
    db.prepare(
      `UPDATE orders SET recipient_name = '(deleted)', recipient_contact = NULL
       WHERE purchaser_id = ?`
    ).run(user.id);
    db.prepare(`UPDATE registry_items SET purchased_by = NULL, purchased_at = NULL WHERE purchased_by = ?`).run(user.id);
    db.prepare(
      `UPDATE notifications SET read = 1 WHERE recipient_id = ?`
    ).run(user.id);
  });
  tx();

  console.log(`account_deleted: ${user.id} (${user.role}) — personal data tombstoned, money records anonymized`);
  res.json({
    ok: true,
    deleted_at: new Date().toISOString(),
    kept: 'Anonymized order/payment records retained for accounting and fraud compliance.',
  });
});

authRouter.get('/unsubscribe/:token', (req, res) => {
  let payload;
  try {
    payload = jwt.verify(req.params.token, JWT_SECRET);
  } catch {
    throw fail(400, 'unsubscribe link expired — emails for marketing will not be sent again');
  }
  if (payload.kind !== 'optout') throw fail(400, 'wrong token kind');
  const r = db.prepare('UPDATE users SET email_optout = 1 WHERE id = ?').run(payload.sub);
  if (!r.changes) throw fail(404, 'user not found');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Tuyamika — Unsubscribed</title><link rel="stylesheet" href="/styles.css"></head><body><main class="card"><h1>Unsubscribed</h1><p>You will no longer receive marketing emails from Tuyamika. Atuyamika-required emails (order updates, account security) still arrive.</p><p class="muted">Changed your mind? Sign in to your account and clear the marketing preference, or contact support@tuyamika.</p><p><a href="/">Back to Tuyamika</a></p></main></body></html>`;
  res.type('html').send(html);
});

authRouter.get('/me', authRequired, (req, res) => {
  const user = q.getUser().get(req.user.id);
  if (!user) throw fail(404, 'user not found');
  res.json({ user: userView(user) });
});

const MePatch = z
  .object({
    full_name: z.string().min(1).max(80),
    phone: z.string().min(1).max(20),
    country: z.enum(['ZM', 'ZW']),
  })
  .partial()
  .refine((b) => Object.keys(b).length > 0, 'nothing to update');

authRouter.patch('/me', authRequired, (req, res) => {
  const parsed = MePatch.safeParse(req.body || {});
  if (!parsed.success) throw fail(400, 'validation failed', { details: parsed.error.flatten() });
  const body = parsed.data;

  const user = q.getUser().get(req.user.id);
  if (!user) throw fail(404, 'user not found');
  if (body.phone && body.phone !== user.phone) {
    const clash = q.getUserByIdOrPhone().get(null, body.phone);
    if (clash && clash.id !== user.id) throw fail(409, 'phone already registered');
  }
  db.prepare(
    `UPDATE users SET full_name = COALESCE(?, full_name), phone = ?, country = COALESCE(?, country) WHERE id = ?`
  ).run(body.full_name ?? null, body.phone ?? user.phone, body.country ?? null, user.id);
  res.json({ user: userView(q.getUser().get(user.id)) });
});

authRouter.get('/verify/:token', authLimiter, (req, res) => {
  let payload;
  try {
    payload = jwt.verify(req.params.token, JWT_SECRET);
  } catch {
    throw fail(400, 'invalid or expired token');
  }
  if (payload.kind !== 'verify') throw fail(400, 'wrong token kind');
  const r = db.prepare('UPDATE users SET verified = 1 WHERE id = ?').run(payload.sub);
  if (!r.changes) throw fail(404, 'user not found');
  res.json({ ok: true });
});

const FirebaseExchange = z.object({ id_token: z.string().min(10) });

// Express 4 cannot route rejections to the error handler; wrap async handlers.
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

authRouter.get('/firebase-config', (req, res) => {
  res.json(firebaseConfigView());
});

authRouter.post('/firebase', authLimiter, ah(async (req, res) => {
  const parsed = FirebaseExchange.safeParse(req.body || {});
  if (!parsed.success) throw fail(400, 'validation failed', { details: parsed.error.flatten() });

  let decoded;
  try {
    decoded = await verifyFirebaseIdToken(parsed.data.id_token);
  } catch (e) {
    throw fail(e.status || 401, e.message);
  }
  if (!decoded.email) throw fail(400, 'firebase token has no email claim');

  const email = String(decoded.email).toLowerCase();
  const admins = firebaseAdminEmails();
  let user = q.getUserByEmail().get(email);
  if (!user) {
    const id = uid();
    db.prepare(
      `INSERT INTO users (id, email, phone, password_hash, full_name, country, role, firebase_uid, created_at, verified)
       VALUES (?, ?, NULL, '', ?, 'ZW', ?, ?, ?, 1)`
    ).run(
      id,
      email,
      decoded.name || email.split('@')[0],
      admins.includes(email) ? 'admin' : 'customer',
      decoded.uid,
      now()
    );
    console.log(`firebase_signup: ${email} role ${admins.includes(email) ? 'admin' : 'customer'}`);
    user = q.getUser().get(id);
  } else if (!user.firebase_uid || user.firebase_uid !== decoded.uid) {
    db.prepare('UPDATE users SET firebase_uid = ?, verified = 1 WHERE id = ?').run(decoded.uid, user.id);
    user = q.getUser().get(user.id);
  }
  res.json({ user: userView(user), token: signSession(user) });
}));
