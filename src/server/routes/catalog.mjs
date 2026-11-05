import { Router } from 'express';
import { db } from '../lib/db.mjs';
import { authRequired } from '../middleware/auth.mjs';

export const catalogRouter = Router();
catalogRouter.use(authRequired);

catalogRouter.get('/products', (req, res) => {
  const { category, search } = req.query;
  let sql =
    'SELECT p.id, p.title, p.description, p.price_cents, p.category, p.stock, b.name AS business FROM products p JOIN businesses b ON b.id = p.business_id WHERE b.status = ?';
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
