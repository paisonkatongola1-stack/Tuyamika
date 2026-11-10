import { Router } from 'express';
import z from 'zod';
import { db, now, fail } from '../lib/db.mjs';
import { authRequired, authOptional } from '../middleware/auth.mjs';
import { orderView } from '../views/index.mjs';
import { guestLimiter } from '../middleware/ratelimit.mjs';

export const fulfilRouter = Router();
fulfilRouter.use(authRequired);

const FORWARD = {
  paid: ['processing'],
  processing: ['dispatched'],
  dispatched: ['delivered', 'collected'],
  delivered: [],
  collected: [],
};

const ffView = (ff) => ({
  id: ff.id,
  order_id: ff.order_id,
  hub_receipt: !!ff.hub_receipt,
  wrapping: !!ff.wrapping,
  decoration: !!ff.decoration,
  proof_of_delivery: ff.proof_of_delivery ?? null,
  status: ff.status,
});

function itemsFor(orderId) {
  return db
    .prepare(
      `SELECT oi.*, p.title FROM order_items oi
       JOIN registry_items ri ON ri.id = oi.registry_item_id
       JOIN products p ON p.id = ri.product_id
       WHERE oi.order_id = ?`
    )
    .all(orderId);
}

function withFulfilment(row) {
  const ff = db.prepare('SELECT * FROM fulfilment_records WHERE order_id = ?').get(row.id);
  return { ...orderView(row), items: itemsFor(row.id), fulfilment: ff ? ffView(ff) : null };
}

function visibleOrders(req) {
  if (req.user.role === 'admin') {
    return db
      .prepare(`SELECT * FROM orders WHERE status IN ('paid','processing','dispatched','delivered','collected') ORDER BY created_at DESC LIMIT 200`)
      .all();
  }
  return db
    .prepare(
      `SELECT DISTINCT o.* FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       JOIN registry_items ri ON ri.id = oi.registry_item_id
       JOIN products p ON p.id = ri.product_id
       JOIN businesses b ON b.id = p.business_id
       WHERE b.user_id = ? AND o.status IN ('paid','processing','dispatched','delivered','collected')
       ORDER BY o.created_at DESC LIMIT 200`
    )
    .all(req.user.id);
}

fulfilRouter.get('/', (req, res) => {
  res.json({ orders: visibleOrders(req).map(withFulfilment) });
});

// Customer order history for the Tracking screen.
fulfilRouter.get('/mine', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM orders WHERE purchaser_id = ? ORDER BY created_at DESC LIMIT 50')
    .all(req.user.id);
  res.json({ orders: rows.map(withFulfilment) });
});

const PatchFf = z
  .object({
    hub_receipt: z.boolean(),
    wrapping: z.boolean(),
    decoration: z.boolean(),
    proof_of_delivery: z.string(),
    order_status: z.enum(['processing', 'dispatched', 'delivered', 'collected']),
  })
  .partial()
  .refine((b) => Object.keys(b).length > 0, 'nothing to update');

fulfilRouter.patch('/:recordId', (req, res) => {
  const parsed = PatchFf.safeParse(req.body || {});
  if (!parsed.success) throw fail(400, 'validation failed', { details: parsed.error.flatten() });
  const b = parsed.data;

  const ff = db.prepare('SELECT * FROM fulfilment_records WHERE id = ?').get(req.params.recordId);
  if (!ff) throw fail(404, 'fulfilment record not found');
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(ff.order_id);
  if (!order) throw fail(404, 'order not found');

  if (req.user.role !== 'admin') {
    const mine = db
      .prepare(
        `SELECT COUNT(*) n FROM order_items oi
         JOIN registry_items ri ON ri.id = oi.registry_item_id
         JOIN products p ON p.id = ri.product_id
         JOIN businesses bb ON bb.id = p.business_id
         WHERE oi.order_id = ? AND bb.user_id = ?`
      )
      .get(order.id, req.user.id).n;
    if (!mine) throw fail(404, 'fulfilment record not found');
  }

  if (b.order_status) {
    const allowed = FORWARD[order.status];
    if (!allowed || !allowed.includes(b.order_status)) {
      throw fail(409, `order ${order.status} cannot move to ${b.order_status}`);
    }
    const tx = db.transaction(() => {
      db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?').run(b.order_status, now(), order.id);
      db.prepare('UPDATE fulfilment_records SET status = ?, updated_at = ? WHERE id = ?').run(b.order_status, now(), ff.id);
      if (b.order_status === 'processing') {
        db.prepare(
          `UPDATE registry_items SET status = 'fulfil_in_progress'
           WHERE status = 'purchased' AND id IN (SELECT registry_item_id FROM order_items WHERE order_id = ?)`
        ).run(order.id);
      }
      if (b.order_status === 'delivered' || b.order_status === 'collected') {
        db.prepare(
          `UPDATE registry_items SET status = 'fulfilled'
           WHERE status IN ('purchased', 'fulfil_in_progress')
             AND id IN (SELECT registry_item_id FROM order_items WHERE order_id = ?)`
        ).run(order.id);
      }
    });
    tx();
    console.log(`fulfilment: order ${order.id} -> ${b.order_status}`);
  }

  const cols = {};
  for (const k of ['hub_receipt', 'wrapping', 'decoration']) if (b[k] !== undefined) cols[k] = b[k] ? 1 : 0;
  if (b.proof_of_delivery !== undefined) cols.proof_of_delivery = b.proof_of_delivery;
  const keys = Object.keys(cols);
  if (keys.length) {
    db.prepare(`UPDATE fulfilment_records SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ?`).run(
      ...keys.map((k) => cols[k]),
      now(),
      ff.id
    );
  }
  res.json(withFulfilment(db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id)));
});

// --- public tracking: /api/orders/track/:ref ------------------------------
export const trackRouter = Router();
trackRouter.use(guestLimiter);

trackRouter.get('/track/:ref', authOptional, (req, res) => {
  const order = db
    .prepare('SELECT * FROM orders WHERE payment_ref = ? OR id = ?')
    .get(req.params.ref, req.params.ref);
  if (!order) throw fail(404, 'order not found');

  const isOwner = req.user ? req.user.id === order.purchaser_id : false;
  const hasRef = req.params.ref === order.payment_ref;
  if (!hasRef && !isOwner) throw fail(404, 'order not found');

  const ff = db.prepare('SELECT * FROM fulfilment_records WHERE order_id = ?').get(order.id);
  res.json({
    order: orderView(order),
    items: itemsFor(order.id),
    fulfilment: ff ? ffView(ff) : null,
  });
});
