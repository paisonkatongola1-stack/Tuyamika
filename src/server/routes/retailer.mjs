import { Router } from 'express';
import z from 'zod';
import { db, uid, now, fail } from '../lib/db.mjs';
import { orderView } from '../views/index.mjs';
import { authRequired } from '../middleware/auth.mjs';

export const retailerRouter = Router();
retailerRouter.use(authRequired);

function ownedBusiness(req) {
  const biz = db.prepare('SELECT * FROM businesses WHERE id = ?').get(req.params.businessId);
  if (!biz || (biz.user_id !== req.user.id && req.user.role !== 'admin')) throw fail(404, 'business not found');
  return biz;
}

retailerRouter.get('/businesses', (req, res) => {
  const rows = db.prepare('SELECT * FROM businesses WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  const pc = db.prepare('SELECT COUNT(*) n FROM products WHERE business_id = ?');
  res.json({ businesses: rows.map((b) => ({ ...b, product_count: pc.get(b.id).n })) });
});

const CreateBiz = z.object({
  type: z.enum(['retailer', 'service_provider']),
  name: z.string().min(1),
  description: z.string().optional(),
});

retailerRouter.post('/businesses', (req, res) => {
  const parsed = CreateBiz.safeParse(req.body);
  if (!parsed.success) throw fail(400, 'validation failed', { details: parsed.error.flatten() });
  const b = parsed.data;
  const id = uid();
  db.prepare(
    `INSERT INTO businesses (id, user_id, type, name, description, status, created_at) VALUES (?, ?, ?, ?, ?, 'pending', ?)`
  ).run(id, req.user.id, b.type, b.name, b.description ?? null, now());
  res.status(201).json({ business: db.prepare('SELECT * FROM businesses WHERE id = ?').get(id) });
});

const CreateProduct = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  price_cents: z.number().int().min(0),
  category: z.string().min(1),
  stock: z.number().int().min(0).default(0),
  variants: z.array(z.object({ size: z.string().optional(), color: z.string().optional() })).default([]),
});

retailerRouter.post('/businesses/:businessId/products', (req, res) => {
  const biz = ownedBusiness(req);
  if (biz.status !== 'approved') throw fail(403, `business ${biz.status}; admin approval required`);

  const parsed = CreateProduct.safeParse(req.body);
  if (!parsed.success) throw fail(400, 'validation failed', { details: parsed.error.flatten() });
  const b = parsed.data;

  const id = uid();
  db.prepare(
    `INSERT INTO products (id, business_id, title, description, price_cents, category, stock, variants, images)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]')`
  ).run(id, biz.id, b.title, b.description ?? null, b.price_cents, b.category, b.stock, JSON.stringify(b.variants));
  res.status(201).json({ product: db.prepare('SELECT * FROM products WHERE id = ?').get(id) });
});

retailerRouter.get('/businesses/:businessId/products', (req, res) => {
  const biz = ownedBusiness(req);
  res.json({ products: db.prepare('SELECT * FROM products WHERE business_id = ? ORDER BY rowid').all(biz.id) });
});

retailerRouter.get('/orders', (req, res) => {
  const biz = db
    .prepare('SELECT * FROM businesses WHERE id = ?')
    .get(req.query.business_id);
  if (!biz || (biz.user_id !== req.user.id && req.user.role !== 'admin')) throw fail(404, 'business not found');

  const rows = db
    .prepare(
      `SELECT DISTINCT o.* FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       JOIN registry_items ri ON ri.id = oi.registry_item_id
       JOIN products p ON p.id = ri.product_id
       WHERE p.business_id = ?
       ORDER BY o.created_at DESC`
    )
    .all(biz.id);
  res.json({ orders: rows.map(orderDetail) });
});

function orderDetail(o) {
  const items = db
    .prepare(
      `SELECT oi.*, p.title, p.business_id FROM order_items oi
       JOIN registry_items ri ON ri.id = oi.registry_item_id
       JOIN products p ON p.id = ri.product_id
       WHERE oi.order_id = ?`
    )
    .all(o.id);
  return { ...orderView(o), items };
}
