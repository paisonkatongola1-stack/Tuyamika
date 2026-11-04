import { db, uid, now, fail } from './db.mjs';

export const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || 'dev-webhook-secret';

export function createIntent({ order_id, amount_cents, currency }) {
  return { payment_ref: 'pay_' + uid(), status: 'pending', amount_cents, currency, order_id };
}

export function applyPaymentEvent({ order_id, event_id, type = 'payment.succeeded' }) {
  if (!order_id || !event_id) throw fail(400, 'order_id and event_id required');

  try {
    db.prepare(
      'INSERT INTO webhook_events (event_id, order_id, type, processed_at) VALUES (?, ?, ?, ?)'
    ).run(event_id, order_id, type, now());
  } catch {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id);
    return { deduped: true, order_status: order ? order.status : null };
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id);
  if (!order) throw fail(404, 'order not found');

  if (type === 'payment.failed') {
    db.prepare(`UPDATE orders SET status = 'cancelled', updated_at = ? WHERE id = ?`).run(now(), order_id);
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order_id);
    for (const oi of items) {
      db.prepare(`UPDATE registry_items SET status = 'available' WHERE id = ? AND status = 'reserved'`).run(
        oi.registry_item_id
      );
    }
    db.prepare(
      `UPDATE reservations SET status = 'released'
       WHERE status = 'pending' AND registry_item_id IN (SELECT registry_item_id FROM order_items WHERE order_id = ?)`
    ).run(order_id);
    return { ok: true, order_status: 'cancelled' };
  }

  const tx = db.transaction(() => {
    db.prepare(`UPDATE orders SET status = 'paid', updated_at = ? WHERE id = ?`).run(now(), order_id);
      const items = db
        .prepare(
          `SELECT oi.registry_item_id, r.reservation_id
         FROM order_items oi
         LEFT JOIN reservations r
           ON r.registry_item_id = oi.registry_item_id AND r.status = 'pending'
           AND ((? IS NULL AND r.session_token IS NULL) OR r.session_token = ?)`
        )
        .all(order.session_token, order.session_token);
    const nowMs = now();
    for (const it of items) {
      db.prepare(
        `UPDATE registry_items SET status = 'purchased', purchased_at = ? WHERE id = ? AND status IN ('reserved','available')`
      ).run(nowMs, it.registry_item_id);
      if (it.reservation_id) {
        db.prepare('UPDATE reservations SET status = ?, checkout_ref = ? WHERE reservation_id = ?').run(
          'completed',
          order_id,
          it.reservation_id
        );
      }
    }
  });
  tx();

  notifyOwners(order_id);
  return { ok: true, order_status: 'paid' };
}

function notifyOwners(order_id) {
  const rows = db
    .prepare(
      `SELECT DISTINCT reg.id AS registry_id, reg.owner_id, reg.name AS registry_name, reg.surprise
       FROM order_items oi
       JOIN registry_items ri ON ri.id = oi.registry_item_id
       JOIN registries reg ON reg.id = ri.registry_id
       WHERE oi.order_id = ?`
    )
    .all(order_id);
  const titles = db
    .prepare(
      `SELECT p.title, oi.quantity
       FROM order_items oi
       JOIN registry_items ri ON ri.id = oi.registry_item_id
       JOIN products p ON p.id = ri.product_id
       WHERE oi.order_id = ?`
    )
    .all(order_id);
  const message = titles.length
    ? `Reserved gifts purchased for ${rows[0].registry_name}: ${titles.map((t) => `${t.quantity}x ${t.title}`).join(', ')}`
    : `Reserved gifts purchased for ${rows[0].registry_name}`;
  for (const reg of rows) {
    if (reg.surprise) continue;
    db.prepare(
      `INSERT INTO notifications (id, recipient_id, channel, trigger, message, link, read, created_at)
       VALUES (?, ?, 'inapp', 'order.paid', ?, ?, 0, ?)`
    ).run(uid(), reg.owner_id, message, `/r/${reg.id}`, now());
  }
}
