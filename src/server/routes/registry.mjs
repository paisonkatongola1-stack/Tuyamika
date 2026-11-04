import { Router } from 'express';
import z from 'zod';
import { db, uid, now, token, fail } from '../lib/db.mjs';
import { authRequired } from '../middleware/auth.mjs';
import { registryItemView } from '../views/index.mjs';

export const registryRouter = Router();
registryRouter.use(authRequired);

function entitlements(userId) {
  const sub = db
    .prepare(
      `SELECT entitlements FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY start_at DESC LIMIT 1`
    )
    .get(userId);
  if (sub) {
    try {
      return JSON.parse(sub.entitlements);
    } catch { return null; }
  }
  return {
    max_registries: +(process.env.FREE_MAX_REGISTRIES || 3),
    max_items: +(process.env.FREE_MAX_ITEMS || 12),
  };
}

function ownedRegistry(req) {
  const reg = db.prepare('SELECT * FROM registries WHERE id = ?').get(req.params.id);
  if (!reg || reg.owner_id !== req.user.id) throw fail(404, 'registry not found');
  return reg;
}

function itemsFor(registryId) {
  return db
    .prepare(
      `SELECT ri.*, p.title, p.category
       FROM registry_items ri JOIN products p ON p.id = ri.product_id
       WHERE ri.registry_id = ? ORDER BY ri.rowid`
    )
    .all(registryId);
}

registryRouter.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM registries WHERE owner_id = ? ORDER BY created_at DESC').all(req.user.id);
  const count = db.prepare('SELECT COUNT(*) n FROM registry_items WHERE registry_id = ?');
  res.json({ registries: rows.map((r) => ({ ...r, surprise: !!r.surprise, item_count: count.get(r.id).n })) });
});

const CreateReg = z.object({
  name: z.string().min(1),
  occasion: z.string().min(1),
  event_date: z.string().optional(),
  message: z.string().optional(),
  visibility: z.enum(['private', 'unlisted', 'public']).default('unlisted'),
  surprise: z.boolean().default(true),
  expires_at: z.number().int().nullish(),
});

registryRouter.post('/', (req, res) => {
  const parsed = CreateReg.safeParse(req.body);
  if (!parsed.success) throw fail(400, 'validation failed', { details: parsed.error.flatten() });
  const b = parsed.data;

  const lim = entitlements(req.user.id);
  const n = db.prepare('SELECT COUNT(*) n FROM registries WHERE owner_id = ?').get(req.user.id).n;
  if (n >= lim.max_registries) throw fail(403, 'registry limit reached', { max_registries: lim.max_registries });

  const id = uid();
  const t = now();
  db.prepare(
    `INSERT INTO registries (id, owner_id, name, occasion, event_date, message, cover_image, visibility, surprise, share_token, expires_at, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, 'draft', ?, ?)`
  ).run(
    id,
    req.user.id,
    b.name,
    b.occasion,
    b.event_date ?? null,
    b.message ?? null,
    b.visibility,
    b.surprise ? 1 : 0,
    token(12),
    b.expires_at ?? null,
    t,
    t
  );
  res.status(201).json({ registry: db.prepare('SELECT * FROM registries WHERE id = ?').get(id) });
});

registryRouter.get('/:id', (req, res) => {
  const reg = ownedRegistry(req);
  let items = itemsFor(reg.id).map(registryItemView);
  if (reg.surprise) items = items.map((i) => ({ ...i, purchased_by: null, purchased_at: null }));
  res.json({ registry: { ...reg, surprise: !!reg.surprise }, items });
});

const PatchReg = z.object({
  name: z.string().min(1).optional(),
  occasion: z.string().min(1).optional(),
  event_date: z.string().nullish(),
  message: z.string().nullish(),
  visibility: z.enum(['private', 'unlisted', 'public']).optional(),
  surprise: z.boolean().optional(),
  cover_image: z.string().nullish(),
  expires_at: z.number().int().nullish(),
  status: z.enum(['draft', 'published', 'closed']).optional(),
});

registryRouter.patch('/:id', (req, res) => {
  const reg = ownedRegistry(req);
  const parsed = PatchReg.safeParse(req.body);
  if (!parsed.success) throw fail(400, 'validation failed', { details: parsed.error.flatten() });
  const b = parsed.data;

  const cols = {};
  for (const k of ['name', 'occasion', 'visibility']) if (b[k] !== undefined) cols[k] = b[k];
  for (const k of ['event_date', 'message', 'cover_image', 'expires_at']) if (b[k] !== undefined) cols[k] = b[k] ?? null;
  if (b.surprise !== undefined) cols.surprise = b.surprise ? 1 : 0;
  if (b.status !== undefined) {
    if (reg.status === 'closed' && b.status !== 'closed') throw fail(409, 'closed registry cannot reopen');
    cols.status = b.status;
  }
  const keys = Object.keys(cols);
  if (keys.length) {
    db.prepare(`UPDATE registries SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ?`).run(
      ...keys.map((k) => cols[k]),
      now(),
      reg.id
    );
  }
  res.json({ registry: db.prepare('SELECT * FROM registries WHERE id = ?').get(reg.id) });
});

const AddItem = z.object({
  product_id: z.string().min(1),
  quantity: z.number().int().min(1).default(1),
  variant: z.object({ size: z.string().optional(), color: z.string().optional() }).default({}),
  notes: z.string().optional(),
});

registryRouter.post('/:id/items', (req, res) => {
  const reg = ownedRegistry(req);
  const parsed = AddItem.safeParse(req.body);
  if (!parsed.success) throw fail(400, 'validation failed', { details: parsed.error.flatten() });
  const b = parsed.data;

  const lim = entitlements(req.user.id);
  const n = db.prepare('SELECT COUNT(*) n FROM registry_items WHERE registry_id = ?').get(reg.id).n;
  if (n >= lim.max_items) throw fail(403, 'item limit reached', { max_items: lim.max_items });

  const product = db
    .prepare(
      `SELECT p.*, b.status AS business_status FROM products p JOIN businesses b ON b.id = p.business_id WHERE p.id = ?`
    )
    .get(b.product_id);
  if (!product || product.business_status !== 'approved') throw fail(404, 'product not available');

  const id = uid();
  db.prepare(
    `INSERT INTO registry_items (id, registry_id, product_id, quantity, unit_price, variant, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'available')`
  ).run(id, reg.id, product.id, b.quantity, product.price_cents, JSON.stringify(b.variant), b.notes ?? null);

  res.status(201).json({ item: registryItemView(db.prepare('SELECT * FROM registry_items WHERE id = ?').get(id)) });
});

registryRouter.delete('/:id/items/:itemId', (req, res) => {
  const reg = ownedRegistry(req);
  const item = db.prepare('SELECT * FROM registry_items WHERE id = ? AND registry_id = ?').get(req.params.itemId, reg.id);
  if (!item) throw fail(404, 'item not found');
  if (item.status !== 'available') throw fail(409, `item ${item.status}; cannot remove`);
  db.prepare('DELETE FROM registry_items WHERE id = ?').run(item.id);
  res.json({ ok: true });
});
