import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import z from 'zod';
import { db, uid, now, q, fail } from '../lib/db.mjs';
import { signSession, authRequired, JWT_SECRET } from '../middleware/auth.mjs';
import { userView } from '../views/index.mjs';
import { authLimiter } from '../middleware/ratelimit.mjs';

const VERIFY_TTL = `${process.env.VERIFY_EMAIL_TTL_HOURS || 24}h`;

export function signVerifyToken(userId) {
  return jwt.sign({ sub: userId, kind: 'verify' }, JWT_SECRET, { expiresIn: VERIFY_TTL });
}

export const authRouter = Router();

const Signup = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(1),
  phone: z.string().min(1).optional(),
  country: z.string().length(2).default('ZW'),
  role: z.enum(['customer', 'business_owner', 'service_provider']).default('customer'),
});

const Login = z.object({ email: z.string().optional(), phone: z.string().optional(), password: z.string().min(1) }).refine(
  (b) => b.email || b.phone,
  'email or phone required'
);

authRouter.post('/signup', authLimiter, (req, res) => {
  const parsed = Signup.safeParse(req.body);
  if (!parsed.success) throw fail(400, 'validation failed', { details: parsed.error.flatten() });
  const body = parsed.data;

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
  res.status(201).json({
    user: userView(user),
    token: signSession(user),
    stubs: { verification: `GET /api/auth/verify/${verify_token} (${VERIFY_TTL}; email delivery deferred, see docs/roadmap.md)` },
  });
});

authRouter.post('/login', authLimiter, (req, res) => {
  const parsed = Login.safeParse(req.body);
  if (!parsed.success) throw fail(400, 'validation failed', { details: parsed.error.flatten() });
  const { email, phone, password } = parsed.data;
  const row = q.getUserByIdOrPhone().get(email ?? null, phone ?? null);
  if (!row || !bcrypt.compareSync(password, row.password_hash)) throw fail(401, 'invalid credentials');
  res.json({ user: userView(row), token: signSession(row) });
});

authRouter.get('/me', authRequired, (req, res) => {
  const user = q.getUser().get(req.user.id);
  if (!user) throw fail(404, 'user not found');
  res.json({ user: userView(user) });
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
