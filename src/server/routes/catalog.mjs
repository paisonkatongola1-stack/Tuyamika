import { Router } from 'express';
import z from 'zod';
import { db, uid, now, fail } from '../lib/db.mjs';
import { authRequired } from '../middleware/auth.mjs';

export const catalogRouter = Router();

const reviewAgg = `LEFT JOIN (
  SELECT product_id, AVG(rating) AS avg_rating, COUNT(*) AS review_count
  FROM product_reviews GROUP BY product_id
) rv ON rv.product_id = p.id`;

catalogRouter.get('/products', (req, res) => {
  const { category, search } = req.query;
  let sql = `SELECT p.id, p.title, p.description, p.price_cents, p.category, p.stock,
    ROUND(rv.avg_rating * 10) / 10 AS rating, rv.review_count,
    b.name AS business FROM products p
    JOIN businesses b ON b.id = p.business_id ${reviewAgg} WHERE b.status = ?`;
  const params = ['approved'];
  if (category) { sql += ' AND p.category = ?'; params.push(String(category)); }
  if (search) { sql += ' AND (p.title LIKE ? OR p.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  sql += ' ORDER BY p.category, p.title LIMIT 200';
  res.json({ products: db.prepare(sql).all(...params) });
});

catalogRouter.get('/categories', (req, res) => {
  const rows = db
    .prepare(
      `SELECT DISTINCT p.category FROM products p JOIN businesses b ON b.id = p.business_id
       WHERE b.status = 'approved' ORDER BY p.category`
    )
    .all();
  res.json({ categories: rows.map((r) => r.category) });
});

// --- product reviews (Rating + Comments product feature) --------------------
catalogRouter.get('/products/:id/reviews', (req, res) => {
  const rows = db
    .prepare(
      `SELECT pr.id, pr.rating, pr.title, pr.body, pr.created_at, u.full_name AS author
       FROM product_reviews pr JOIN users u ON u.id = pr.author_id
       WHERE pr.product_id = ? ORDER BY pr.created_at DESC LIMIT 50`
    )
    .all(req.params.id);
  const agg = db
    .prepare('SELECT ROUND(AVG(rating) * 10) / 10 AS rating, COUNT(*) AS reviews FROM product_reviews WHERE product_id = ?')
    .get(req.params.id);
  res.json({ reviews: rows, rating: agg.rating ?? null, review_count: agg.reviews });
});

const CreateReview = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(80).optional(),
  body: z.string().max(600).optional(),
});

catalogRouter.post('/products/:id/reviews', authRequired, (req, res) => {
  const parsed = CreateReview.safeParse(req.body || {});
  if (!parsed.success) throw fail(400, 'validation failed', { details: parsed.error.flatten() });
  const b = parsed.data;

  const product = db
    .prepare(
      `SELECT p.id, b.status AS business_status FROM products p JOIN businesses b ON b.id = p.business_id WHERE p.id = ?`
    )
    .get(req.params.id);
  if (!product) throw fail(404, 'product not found');

  // verified buyers only: order containing this product, paid or beyond
  const proof = db
    .prepare(
      `SELECT oi.order_id AS order_id FROM order_items oi
       JOIN registry_items ri ON ri.id = oi.registry_item_id
       JOIN orders o ON o.id = oi.order_id
       WHERE ri.product_id = ? AND o.purchaser_id = ? AND o.status IN ('paid','processing','dispatched','delivered','collected')
       LIMIT 1`
    )
    .get(req.params.id, req.user.id);
  if (!proof) throw fail(403, 'verified purchase required to review');

  try {
    db.prepare(
      `INSERT INTO product_reviews (id, product_id, author_id, order_id, rating, title, body, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(uid(), req.params.id, req.user.id, proof.order_id, b.rating, b.title ?? null, b.body ?? null, now());
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) throw fail(409, 'you already reviewed this product');
    throw err;
  }
  res.status(201).json({ ok: true });
});
