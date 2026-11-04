import crypto from 'node:crypto';
import { db, now, fail } from './db.mjs';

export const TTL_MINUTES = () => +(process.env.RESERVATION_TTL_MINUTES || 30);

export function sweepExpired() {
  const expired = db
    .prepare(
      `UPDATE reservations SET status = 'expired'
       WHERE status = 'pending' AND expires_at <= ?
       RETURNING reservation_id, registry_item_id`
    )
    .all(now());
  const release = db.prepare(
    `UPDATE registry_items SET status = 'available'
     WHERE id = ? AND status = 'reserved'`
  );
  for (const row of expired) release.run(row.registry_item_id);
  return expired.length;
}

export function createReservation({ item, session_token, idempotency_key }) {
  if (!session_token) throw fail(400, 'session_token required');
  if (!idempotency_key) throw fail(400, 'idempotency_key required');

  const existing = db
    .prepare('SELECT * FROM reservations WHERE idempotency_key = ?')
    .get(idempotency_key);
  if (existing) return { reservation: existing, deduped: true };

  if (item.status !== 'available') throw fail(409, 'item not available', { item_status: item.status });

  const tx = db.transaction(() => {
    const claimed = db
      .prepare(`UPDATE registry_items SET status = 'reserved' WHERE id = ? AND status = 'available'`)
      .run(item.id);
    if (claimed.changes !== 1) throw fail(409, 'item not available');
    const expires_at = now() + TTL_MINUTES() * 60_000;
    const reservation_id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO reservations (reservation_id, registry_item_id, session_token, quantity, idempotency_key, expires_at, created_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`
    ).run(reservation_id, item.id, session_token, item.quantity, idempotency_key, expires_at, now());
    return db.prepare('SELECT * FROM reservations WHERE reservation_id = ?').get(reservation_id);
  });

  return { reservation: tx(), deduped: false };
}

export function releaseReservation({ reservation, session_token }) {
  if (reservation.session_token !== session_token) throw fail(403, 'forbidden');
  if (reservation.status !== 'pending') throw fail(409, `reservation ${reservation.status}`);
  const tx = db.transaction(() => {
    db.prepare(`UPDATE reservations SET status = 'released' WHERE reservation_id = ?`).run(
      reservation.reservation_id
    );
    db.prepare(`UPDATE registry_items SET status = 'available' WHERE id = ? AND status = 'reserved'`).run(
      reservation.registry_item_id
    );
  });
  tx();
}
