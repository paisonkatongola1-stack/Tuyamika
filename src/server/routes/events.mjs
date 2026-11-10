import { Router } from 'express';
import z from 'zod';
import { db, uid, now, fail } from '../lib/db.mjs';
import { authRequired } from '../middleware/auth.mjs';

export const eventRouter = Router();
eventRouter.use(authRequired);

function memberEvents(userId) {
  const rows = db
    .prepare(
      `SELECT e.*, em.role AS member_role FROM events e
       JOIN event_memberships em ON em.event_id = e.id
       WHERE em.user_id = ? OR e.owner_id = ?
       ORDER BY e.event_date ASC, e.created_at DESC
       LIMIT 100`
    )
    .all(userId, userId);
  return rows.filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i);
}

function eventDetail(e) {
  const members = db
    .prepare(
      `SELECT em.user_id, em.role, em.permissions, u.full_name FROM event_memberships em
       LEFT JOIN users u ON u.id = em.user_id WHERE em.event_id = ?
       ORDER BY CASE em.role WHEN 'owner' THEN 0 WHEN 'chairperson' THEN 1 WHEN 'treasurer' THEN 2 WHEN 'secretary' THEN 3 WHEN 'member' THEN 4 ELSE 5 END`
    )
    .all(e.id);
  return {
    id: e.id,
    owner_id: e.owner_id,
    name: e.name,
    occasion: e.occasion,
    event_date: e.event_date,
    location: e.location,
    budget_cents: e.budget_cents,
    visibility: e.visibility,
    cover_image: e.cover_image,
    status: e.status,
    members: members.map((m) => ({ user_id: m.user_id, name: m.full_name || 'Committee member', role: m.role, ...safePerms(m.permissions) })),
    rsvp_count: members.filter((m) => safePerms(m.permissions).rsvp === 'going').length,
    guest_count: members.reduce((n, m) => {
      const p = safePerms(m.permissions);
      return n + (p.rsvp === 'going' ? 1 + (p.guests || 0) : 0);
    }, 0),
    tasks: db.prepare('SELECT * FROM tasks WHERE event_id = ? ORDER BY deadline').all(e.id),
  };
}

const safePerms = (raw) => {
  try {
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
};

const CreateEvent = z.object({
  name: z.string().min(1),
  occasion: z.string().optional(),
  event_date: z.string().optional(),
  location: z.string().optional(),
  budget_cents: z.number().int().nullish(),
  visibility: z.enum(['private', 'unlisted', 'public']).default('unlisted'),
});

eventRouter.get('/', (req, res) => {
  res.json({ events: memberEvents(req.user.id).map(eventDetail) });
});

eventRouter.post('/', (req, res) => {
  const parsed = CreateEvent.safeParse(req.body || {});
  if (!parsed.success) throw fail(400, 'validation failed', { details: parsed.error.flatten() });
  const b = parsed.data;
  const id = uid();
  const t = now();
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO events (id, owner_id, name, occasion, event_date, location, budget_cents, visibility, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'planned', ?)`
    ).run(id, req.user.id, b.name, b.occasion ?? null, b.event_date ?? null, b.location ?? null, b.budget_cents ?? null, b.visibility, t);
    db.prepare(
      `INSERT OR IGNORE INTO event_memberships (event_id, user_id, role, permissions) VALUES (?, ?, 'owner', '[]')`
    ).run(id, req.user.id);
  });
  tx();
  res
    .status(201)
    .json({ event: eventDetail(db.prepare('SELECT * FROM events WHERE id = ?').get(id)) });
});

function requireEventMember(req) {
  const e = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!e) throw fail(404, 'event not found');
  const isOwner = e.owner_id === req.user.id;
  const mem = db
    .prepare('SELECT * FROM event_memberships WHERE event_id = ? AND user_id = ?')
    .get(e.id, req.user.id);
  if (!isOwner && !mem) throw fail(403, 'not a member of this event');
  return { e, isOwner, mem };
}

eventRouter.get('/:id', (req, res) => {
  const { e } = requireEventMember(req);
  res.json({ event: eventDetail(e) });
});

const Rsvp = z.object({
  status: z.enum(['going', 'declined', 'maybe']),
  guests: z.number().int().min(0).default(0),
  name: z.string().optional(),
});

eventRouter.post('/:id/rsvp', (req, res) => {
  const parsed = Rsvp.safeParse(req.body || {});
  if (!parsed.success) throw fail(400, 'validation failed', { details: parsed.error.flatten() });
  const e = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!e) throw fail(404, 'event not found');

  db.prepare(
    `INSERT INTO event_memberships (event_id, user_id, role, permissions) VALUES (?, ?, 'guest', ?)
     ON CONFLICT (event_id, user_id) DO UPDATE SET permissions = excluded.permissions`
  ).run(e.id, req.user.id, JSON.stringify({ rsvp: parsed.data.status, guests: parsed.data.guests }));
  res.json({ event: eventDetail(e) });
});

const AddTask = z.object({
  title: z.string().min(1),
  assigned_to: z.string().nullish(),
  deadline: z.number().int().nullish(),
  priority: z.enum(['normal', 'high', 'low']).default('normal'),
});

eventRouter.post('/:id/tasks', (req, res) => {
  const { e, isOwner, mem } = requireEventMember(req);
  const role = isOwner ? 'owner' : mem.role;
  if (!isOwner && !['owner', 'chairperson', 'secretary'].includes(role)) {
    throw fail(403, 'only committee leads can add tasks');
  }
  const parsed = AddTask.safeParse(req.body || {});
  if (!parsed.success) throw fail(400, 'validation failed', { details: parsed.error.flatten() });
  const b = parsed.data;
  const id = uid();
  db.prepare(
    `INSERT INTO tasks (id, event_id, title, assigned_to, deadline, priority, status) VALUES (?, ?, ?, ?, ?, ?, 'todo')`
  ).run(id, e.id, b.title, b.assigned_to ?? null, b.deadline ?? null, b.priority);
  res.status(201).json({ task: db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) });
});

const PatchTask = z.object({ status: z.enum(['todo', 'done']) });

eventRouter.patch('/:id/tasks/:taskId', (req, res) => {
  const { e } = requireEventMember(req);
  const parsed = PatchTask.safeParse(req.body || {});
  if (!parsed.success) throw fail(400, 'validation failed', { details: parsed.error.flatten() });
  const r = db
    .prepare('UPDATE tasks SET status = ? WHERE id = ? AND event_id = ?')
    .run(parsed.data.status, req.params.taskId, e.id);
  if (!r.changes) throw fail(404, 'task not found');
  res.json({ task: db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.taskId) });
});
