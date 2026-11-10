import nodemailer from 'nodemailer';
import { db, uid, now } from './db.mjs';
import { signOptoutToken } from '../middleware/auth.mjs';

// Milestone 2: notifications hub channels.
// inapp rows go to `notifications` (already existing callers); email/sms are
// queued in `notify_outbox` and flushed by the worker loop with capped retries.
//
// Adapter config (all optional; channels quietly skip when unset):
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_SECURE
//   SMS_GATEWAY_URL  (POST JSON {to, message}), SMS_GATEWAY_TOKEN, SMS_SENDER
//
// No explicit global transport: experimental adapters stay lazily created like
// payment.momo.mjs, so absent credentials never touch the network.

let mailer = null;
function smtpEnabled() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

function getMailer() {
  if (!smtpEnabled()) return null;
  if (mailer) return mailer;
  mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: +(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === '1' || process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return mailer;
}

const smsEnabled = () => !!(process.env.SMS_GATEWAY_URL && process.env.SMS_SENDER);

// Queue an email/sms delivery attempt. recipient is an address/phone; caller
// decides who gets which channel. Failures queue silently (worker retries).
//
// marketing: true marks bulk/promo sends; those are queued but silently
// dropped at flush time when the user has opted out (users.email_optout, set
// by the unsubscribe route). Transactional sends (orders, verification) always
// go through.
export function queueNotify({ recipient_id = null, channel, trigger, recipient, message, marketing = false }) {
  if (!recipient) return null;
  let optedOut = false;
  if (marketing && channel === 'email' && recipient_id) {
    optedOut = !!db.prepare('SELECT email_optout FROM users WHERE id = ?').get(recipient_id)?.email_optout;
  }
  const sign = recipient_id && channel === 'email' ? signOptoutToken(recipient_id) : null;
  const fullMessage = sign ? `${message}\n\nUnsubscribe from marketing emails: ${process.env.APP_PUBLIC_URL || 'https://tuyamika.co.zm'}/api/auth/unsubscribe/${sign}` : message;
  try {
    db.prepare(
      `INSERT INTO notify_outbox (id, recipient_id, channel, trigger, recipient, message, status, attempts, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`
    ).run(uid(), recipient_id, channel, trigger, recipient, fullMessage, optedOut ? 'opted_out' : 'pending', now());
  } catch (err) {
    console.log(`notifier_queue_error: ${err.message}`);
  }
}

function wrapEmail(trigger, message) {
  const url = process.env.APP_PUBLIC_URL || 'https://tuyamika.co.zm';
  const lines = message.split('\n').filter(Boolean);
  const unsubHtml = lines.length > 1
    ? `<p style="font-size:12px"><a href="${lines[lines.length - 1].replace('Unsubscribe from marketing emails: ', '')}">Unsubscribe</a></p>`
    : '';
  const body = lines.length > 1 ? lines.slice(0, -1).join('</p><p>') : lines.join('</p><p>');
  return `<p>${body}</p>${unsubHtml}<p style="color:#888;font-size:12px">Tuyamika — The Beauty of Giving, The Joy of Sharing.<br>${url}</p>`;
}

const senders = {
  async email(row) {
    const m = getMailer();
    if (!m) throw new Error('SMTP not configured');
    const info = await m.sendMail({
      from: process.env.SMTP_FROM,
      to: row.recipient,
      subject: row.trigger.startsWith('subject:') ? row.trigger.slice(8) : `Tuyamika — ${row.trigger.replace(/[._]/g, ' ')}`,
      text: row.message,
      html: wrapEmail(row.trigger, row.message),
    });
    if (!info.messageId) throw new Error('SMTP rejected message');
  },
  async sms(row) {
    if (!smsEnabled()) throw new Error('SMS gateway not configured');
    const res = await fetch(process.env.SMS_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.SMS_GATEWAY_TOKEN ? { Authorization: `Bearer ${process.env.SMS_GATEWAY_TOKEN}` } : {}),
      },
      body: JSON.stringify({ to: row.recipient, sender: process.env.SMS_SENDER, message: row.message }),
    });
    if (!res.ok) throw new Error(`sms gateway ${res.status}`);
  },
};

const MAX_ATTEMPTS = 3;

async function flushOne(row) {
  const adapter = senders[row.channel];
  if (!adapter) {
    db.prepare(`UPDATE notify_outbox SET status = 'failed', last_error = ? WHERE id = ?`).run('unknown channel', row.id);
    return false;
  }
  try {
    await adapter(row);
    db.prepare(`UPDATE notify_outbox SET status = 'sent', sent_at = ?, attempts = attempts + 1 WHERE id = ?`).run(now(), row.id);
    return true;
  } catch (err) {
    const attempts = row.attempts + 1;
    const status = attempts >= MAX_ATTEMPTS ? 'failed' : 'pending';
    db.prepare(`UPDATE notify_outbox SET attempts = ?, last_error = ?, status = ? WHERE id = ?`).run(
      attempts,
      String(err.message).slice(0, 200),
      status,
      row.id
    );
    if (status === 'failed') console.log(`notifier_failed: ${row.channel} ${row.id} ${err.message}`);
    return false;
  }
}

async function flushPending() {
  if (!smtpEnabled() && !smsEnabled()) return { checked: 0, sent: 0 };
  const rows = db
    .prepare(
      `SELECT * FROM notify_outbox WHERE status = 'pending' ORDER BY created_at LIMIT 20`
    )
    .all();
  let sent = 0;
  for (const row of rows) {
    // email channel silently stays queued when SMTP is off but SMS is on
    if (row.channel === 'email' && !smtpEnabled()) continue;
    if (row.channel === 'sms' && !smsEnabled()) continue;
    if (row.status === 'opted_out') continue;             // unsubscribe honored, retry window irrelevant
    if (await flushOne(row)) sent += 1;
  }
  return { checked: rows.length, sent };
}

export function notifierStatus() {
  const counts = db
    .prepare(`SELECT status, COUNT(*) n FROM notify_outbox GROUP BY status`)
    .all()
    .reduce((acc, r) => ({ ...acc, [r.status]: r.n }), {});
  return {
    email: smtpEnabled() ? 'configured' : 'off',
    sms: smsEnabled() ? 'configured' : 'off',
    outbox: counts,
  };
}

export function startNotifierWorker() {
  const timer = setInterval(() => {
    flushPending().catch((err) => console.log(`notifier_worker_error: ${err.message}`));
  }, 30_000);
  timer.unref();
  return timer;
}

export { flushPending };
