import { Router } from 'express';
import z from 'zod';
import { db, uid, now, fail } from '../lib/db.mjs';
import { authRequired } from '../middleware/auth.mjs';

export const specialRouter = Router();

// Public: hero promos for Home/Specials screens.
specialRouter.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT s.*, p.title, p.price_cents, p.category, b.name AS business
       FROM specials s
       JOIN products p ON p.id = s.product_id
       JOIN businesses b ON b.id = s.business_id
       WHERE s.status = 'active' AND (s.starts_at IS NULL OR s.starts_at <= ?)
         AND (s.ends_at IS NULL OR s.ends_at > ?)
       ORDER BY s.created_at DESC LIMIT 50`
    )
    .all(now(), now());
  res.json({
    specials: rows.map((s) => ({
      id: s.id,
      product_id: s.product_id,
      title: s.title,
      price_cents: s.price_cents,
      was_cents: s.discount_pct ? Math.round((s.price_cents * 100) / Math.max(100 - s.discount_pct, 1)) : null,
      discount_pct: s.discount_pct,
      tag: s.tag,
      category: s.category,
      business: s.business,
    })),
  });
});

specialRouter.use(authRequired);

const CreateSpecial = z.object({
  product_id: z.string().min(1),
  discount_pct: z.number().int().min(1).max(90),
  title: z.string().optional(),
  tag: z.string().max(20).optional(),
  ends_at: z.number().int().nullish(),
});

specialRouter.post('/', (req, res) => {
  const parsed = CreateSpecial.safeParse(req.body || {});
  if (!parsed.success) throw fail(400, 'validation failed', { details: parsed.error.flatten() });
  const b = parsed.data;

  const product = db
    .prepare(
      `SELECT p.*, b.user_id AS owner FROM products p JOIN businesses b ON b.id = p.business_id WHERE p.id = ?`
    )
    .get(b.product_id);
  if (!product) throw fail(404, 'product not found');
  if (product.owner !== req.user.id && req.user.role !== 'admin') throw fail(403, 'not your product');
  if (req.user.role !== 'admin' && db.prepare(`SELECT status FROM businesses WHERE id = ?`).get(product.business_id).status !== 'approved') {
    throw fail(403, 'business not approved yet');
  }

  const active = db.prepare(`SELECT id FROM specials WHERE product_id = ? AND status = 'active' AND (ends_at IS NULL OR ends_at > ?)`).get(b.product_id, now());
  if (active) throw fail(409, 'an active promo already exists for this product');

  const id = uid();
  db.prepare(
    `INSERT INTO specials (id, product_id, business_id, title, tag, discount_pct, starts_at, ends_at, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`
  ).run(id, b.product_id, product.business_id, b.title || product.title, b.tag ?? null, b.discount_pct, now(), b.ends_at ?? null, now());
  res.status(201).json({ special: db.prepare('SELECT * FROM specials WHERE id = ?').get(id) });
});

specialRouter.delete('/:id', (req, res) => {
  const s = db.prepare('SELECT * FROM specials WHERE id = ?').get(req.params.id);
  if (!s) throw fail(404, 'special not found');
  const product = db.prepare('SELECT p.id, b.user_id AS owner FROM products p JOIN businesses b ON b.id = p.business_id WHERE p.id = ?').get(s.product_id);
  if (!product || (product.owner !== req.user.id && req.user.role !== 'admin')) throw fail(403, 'not your promo');
  db.prepare(`UPDATE specials SET status = 'ended' WHERE id = ?`).run(s.id);
  res.json({ ok: true });
});
