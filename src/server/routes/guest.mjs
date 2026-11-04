import { Router } from 'express';
import z from 'zod';
import { db, uid, now, fail } from '../lib/db.mjs';
import { sweepExpired, releaseReservation, createReservation } from '../lib/reservation.mjs';
import { createIntent } from '../lib/payment.stub.mjs';
import { publicRegistryView, guestRegistryPage, reservationView, orderView, registryItemView } from '../views/index.mjs';
import { guestLimiter } from '../middleware/ratelimit.mjs';

export const guestRouter = Router();
guestRouter.use(guestLimiter);
export const shareRouter = Router();
shareRouter.use(guestLimiter);

function registryByToken(tokenValue) {
  const reg = db.prepare('SELECT * FROM registries WHERE share_token = ?').get(tokenValue);
  if (!reg || reg.visibility === 'private' || reg.status !== 'published') throw fail(404, 'registry not found');
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

shareRouter.get('/r/:token', (req, res) => {
  const reg = registryByToken(req.params.token);
  const items = itemsFor(reg.id).map(registryItemView);
  res.type('html').send(guestRegistryPage(reg, items));
});

guestRouter.get('/r/:token', (req, res) => {
  sweepExpired();
  const reg = registryByToken(req.params.token);
  const items = itemsFor(reg.id).map(registryItemView);
  res.json({ registry: publicRegistryView(reg, items) });
});

const Reserve = z.object({
  session_token: z.string().min(8),
  registry_item_id: z.string().min(1),
  idempotency_key: z.string().min(8),
});

guestRouter.post('/r/:token/reservations', (req, res) => {
  sweepExpired();
  const reg = registryByToken(req.params.token);
  const parsed = Reserve.safeParse(req.body);
  if (!parsed.success) throw fail(400, 'validation failed', { details: parsed.error.flatten() });
  const b = parsed.data;

  if (reg.expires_at && now() > reg.expires_at) throw fail(410, 'registry expired');
  const item = db
    .prepare('SELECT * FROM registry_items WHERE id = ? AND registry_id = ?')
    .get(b.registry_item_id, reg.id);
  if (!item) throw fail(404, 'item not found');

  const { reservation, deduped } = createReservation({ item, session_token: b.session_token, idempotency_key: b.idempotency_key });
  res.status(deduped ? 200 : 201).json({
    reservation: reservationView(reservation),
    ttl_minutes: +(process.env.RESERVATION_TTL_MINUTES || 30),
    deduped,
  });
});

guestRouter.post('/reservations/:reservationId/release', (req, res) => {
  const parsed = z.object({ session_token: z.string().min(8) }).safeParse(req.body);
  if (!parsed.success) throw fail(400, 'validation failed', { details: parsed.error.flatten() });
  const r = db.prepare('SELECT * FROM reservations WHERE reservation_id = ?').get(req.params.reservationId);
  if (!r) throw fail(404, 'reservation not found');
  releaseReservation({ reservation: r, session_token: parsed.data.session_token });
  res.json({ ok: true });
});

const Checkout = z.object({
  session_token: z.string().min(8),
  idempotency_key: z.string().min(8),
  recipient_name: z.string().optional(),
  recipient_contact: z.string().optional(),
  destination: z.enum(['recipient', 'event', 'self']).default('recipient'),
  delivery: z.enum(['self', 'event', 'recipient', 'collection']).default('recipient'),
  special_instructions: z.string().optional(),
});

guestRouter.post('/r/:token/checkout', (req, res) => {
  sweepExpired();
  const reg = registryByToken(req.params.token);
  const parsed = Checkout.safeParse(req.body);
  if (!parsed.success) throw fail(400, 'validation failed', { details: parsed.error.flatten() });
  const b = parsed.data;

  const existing = db.prepare('SELECT * FROM orders WHERE idempotency_key = ?').get(b.idempotency_key);
  if (existing) {
    return res.json({
      order: orderView(existing),
      deduped: true,
      payment: existing.payment_ref
        ? { payment_ref: existing.payment_ref, status: 'pending', simulate: { method: 'POST', url: '/api/pay/simulate', payment_ref: existing.payment_ref } }
        : null,
    });
  }

  const resvs = db
    .prepare(
      `SELECT r.* FROM reservations r
       JOIN registry_items ri ON ri.id = r.registry_item_id
       WHERE r.session_token = ? AND r.status = 'pending' AND r.expires_at > ? AND ri.registry_id = ?`
    )
    .all(b.session_token, now(), reg.id);
  if (!resvs.length) throw fail(400, 'no active reservations for this session');

  const total = resvs.reduce((sum, r) => {
    const item = db.prepare('SELECT unit_price FROM registry_items WHERE id = ?').get(r.registry_item_id);
    return sum + item.unit_price * r.quantity;
  }, 0);

  const order_id = uid();
  const t = now();
  const intent = createIntent({ order_id, amount_cents: total, currency: 'USD' });

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO orders (id, purchaser_id, recipient_name, recipient_contact, destination, total_cents, currency, payment_ref, status, idempotency_key, created_at, updated_at)
       VALUES (?, NULL, ?, ?, ?, ?, 'USD', ?, 'pending', ?, ?, ?)`
    ).run(order_id, b.recipient_name ?? null, b.recipient_contact ?? null, b.destination, total, intent.payment_ref, b.idempotency_key, t, t);
    const ins = db.prepare(
      `INSERT INTO order_items (order_id, registry_item_id, quantity, unit_price, retailer_group_id, delivery, special_instructions)
       VALUES (?, ?, ?, ?, NULL, ?, ?)`
    );
    for (const r of resvs) {
      const item = db.prepare('SELECT unit_price FROM registry_items WHERE id = ?').get(r.registry_item_id);
      ins.run(order_id, r.registry_item_id, r.quantity, item.unit_price, b.delivery, b.special_instructions ?? null);
    }
  });
  tx();

  res.status(201).json({
    order: { ...orderView(db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id)), reservation_ids: resvs.map((r) => r.reservation_id) },
    payment: { ...intent, simulate: { method: 'POST', url: '/api/pay/simulate', payment_ref: intent.payment_ref } },
  });
});
