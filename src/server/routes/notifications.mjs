import { Router } from 'express';
import { db, fail } from '../lib/db.mjs';
import { authRequired } from '../middleware/auth.mjs';

export const notificationsRouter = Router();
notificationsRouter.use(authRequired);

notificationsRouter.get('/', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM notifications WHERE recipient_id = ? ORDER BY created_at DESC LIMIT 50')
    .all(req.user.id);
  res.json({ notifications: rows, unread: rows.filter((n) => !n.read).length });
});

notificationsRouter.post('/:id/read', (req, res) => {
  const n = db.prepare('SELECT * FROM notifications WHERE id = ? AND recipient_id = ?').get(req.params.id, req.user.id);
  if (!n) throw fail(404, 'notification not found');
  db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(n.id);
  res.json({ ok: true });
});
