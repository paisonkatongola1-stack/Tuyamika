import { Router } from 'express';
import z from 'zod';
import { db, uid, now, fail } from '../lib/db.mjs';
import { authRequired, requireAdmin } from '../middleware/auth.mjs';

export const adminRouter = Router();
adminRouter.use(authRequired, requireAdmin);

adminRouter.get('/users', (req, res) => {
  const rows = db
    .prepare('SELECT id, email, phone, full_name, country, role, verified, created_at FROM users ORDER BY created_at DESC')
    .all();
  res.json({ users: rows });
});

adminRouter.get('/businesses', (req, res) => {
  const status = req.query.status;
  const rows = status
    ? db.prepare('SELECT * FROM businesses WHERE status = ? ORDER BY created_at DESC').all(status)
    : db.prepare('SELECT * FROM businesses ORDER BY created_at DESC').all();
  res.json({ businesses: rows });
});

adminRouter.post('/businesses/:id/status', (req, res) => {
  const parsed = z
    .object({ status: z.enum(['pending', 'approved', 'rejected', 'suspended']) })
    .safeParse(req.body);
  if (!parsed.success) throw fail(400, 'validation failed', { details: parsed.error.flatten() });

  const biz = db.prepare('SELECT * FROM businesses WHERE id = ?').get(req.params.id);
  if (!biz) throw fail(404, 'business not found');
  if (biz.status === parsed.data.status) throw fail(409, `already ${biz.status}`);

  db.prepare('UPDATE businesses SET status = ? WHERE id = ?').run(parsed.data.status, biz.id);
  db.prepare(
    `INSERT INTO admin_logs (id, admin_id, action, entity, entity_id, details, created_at) VALUES (?, ?, 'business.status', 'business', ?, ?, ?)`
  ).run(uid(), req.user.id, biz.id, JSON.stringify({ from: biz.status, to: parsed.data.status }), now());
  res.json({ business: db.prepare('SELECT * FROM businesses WHERE id = ?').get(biz.id) });
});

adminRouter.get('/orders', (req, res) => {
  const rows = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  res.json({ orders: rows });
});

adminRouter.get('/logs', (req, res) => {
  res.json({ logs: db.prepare('SELECT * FROM admin_logs ORDER BY created_at DESC LIMIT 100').all() });
});

adminRouter.get('/errors', (req, res) => {
  const severity = req.query.source;
  const rows = severity
    ? db.prepare('SELECT * FROM error_logs WHERE source = ? ORDER BY created_at DESC LIMIT 200').all(severity)
    : db.prepare('SELECT * FROM error_logs ORDER BY created_at DESC LIMIT 200').all();
  const counts = Object.fromEntries(
    db.prepare("SELECT source, COUNT(*) n FROM error_logs GROUP BY source").all().map((r) => [r.source, r.n])
  );
  res.json({ errors: rows, counts });
});

adminRouter.delete('/errors', (req, res) => {
  const r = db.prepare('DELETE FROM error_logs').run();
  res.json({ ok: true, deleted: r.changes });
});

adminRouter.delete('/errors/:id', (req, res) => {
  const r = db.prepare('DELETE FROM error_logs WHERE id = ?').run(req.params.id);
  if (!r.changes) throw fail(404, 'error log not found');
  res.json({ ok: true });
});
