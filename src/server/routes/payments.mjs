import { Router } from 'express';
import z from 'zod';
import { db, fail } from '../lib/db.mjs';
import { applyPaymentEvent, WEBHOOK_SECRET } from '../lib/payment.stub.mjs';
import { providerInfo, providerEnabled, checkProviderIntent, providerEventId } from '../lib/payment.momo.mjs';
import { orderView } from '../views/index.mjs';
import { payLimiter } from '../middleware/ratelimit.mjs';

export const paymentRouter = Router();

const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

paymentRouter.get('/pay/providers', (req, res) => {
  res.json(providerInfo());
});

paymentRouter.post('/webhook/payment', (req, res) => {
  const provided = req.get('x-webhook-secret');
  if (!provided || provided !== WEBHOOK_SECRET) throw fail(401, 'bad webhook secret');

  const parsed = z
    .object({ order_id: z.string().min(1), event_id: z.string().min(1), type: z.string().default('payment.succeeded') })
    .safeParse(req.body);
  if (!parsed.success) throw fail(400, 'validation failed', { details: parsed.error.flatten() });

  const result = applyPaymentEvent(parsed.data);
  res.json({ ok: true, ...result });
});

paymentRouter.post('/pay/simulate', payLimiter, (req, res) => {
  const parsed = z
    .object({
      payment_ref: z.string().min(4),
      outcome: z.enum(['succeeded', 'failed']).default('succeeded'),
    })
    .safeParse(req.body);
  if (!parsed.success) throw fail(400, 'validation failed', { details: parsed.error.flatten() });

  if (process.env.PAYMENT_PROVIDER && process.env.PAYMENT_PROVIDER !== 'stub') {
    throw fail(409, `simulate unavailable with PAYMENT_PROVIDER=${process.env.PAYMENT_PROVIDER}`);
  }

  const order = db.prepare('SELECT * FROM orders WHERE payment_ref = ?').get(parsed.data.payment_ref);
  if (!order) throw fail(404, 'payment intent not found');

  if (order.status !== 'pending') {
    return res.json({ ok: true, deduped: true, order: orderView(order) });
  }

  const result = applyPaymentEvent({
    order_id: order.id,
    event_id: `evt_${Math.random().toString(36).slice(2)}`,
    type: parsed.data.outcome === 'failed' ? 'payment.failed' : 'payment.succeeded',
  });
  res.json({ ok: true, ...result, order: orderView(db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id)) });
});

// Poll real providers and settle the order when paid. Stub has no external
// state; callers confirm via /pay/simulate, so polling is refused with 503.
paymentRouter.post('/pay/status/:ref', payLimiter, ah(async (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE payment_ref = ?').get(req.params.ref);
  if (!order) throw fail(404, 'payment intent not found');

  const provider = process.env.PAYMENT_PROVIDER || 'stub';
  if (provider === 'stub' || !providerEnabled()) throw fail(503, 'payment provider not configured');

  if (order.status !== 'pending') {
    return res.json({ ok: true, provider, deduped: true, order: orderView(order) });
  }

  const outcome = await checkProviderIntent(req.params.ref);

  let applied = null;
  if (outcome.status === 'paid') {
    applied = applyPaymentEvent({
      order_id: order.id,
      event_id: providerEventId(order.payment_ref, 'paid'),
      type: 'payment.succeeded',
    });
  } else if (outcome.status === 'failed') {
    applied = applyPaymentEvent({
      order_id: order.id,
      event_id: providerEventId(order.payment_ref, 'failed'),
      type: 'payment.failed',
    });
  }

  const fresh = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
  res.json({ ok: true, provider, check: outcome, applied, order: orderView(fresh) });
}));
