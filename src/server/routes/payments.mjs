import { Router } from 'express';
import z from 'zod';
import { db, uid, fail } from '../lib/db.mjs';
import { applyPaymentEvent, WEBHOOK_SECRET } from '../lib/payment.stub.mjs';
import { orderView } from '../views/index.mjs';
import { payLimiter } from '../middleware/ratelimit.mjs';

export const paymentRouter = Router();

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

  const order = db.prepare('SELECT * FROM orders WHERE payment_ref = ?').get(parsed.data.payment_ref);
  if (!order) throw fail(404, 'payment intent not found');

  if (order.status !== 'pending') {
    return res.json({ ok: true, deduped: true, order: orderView(order) });
  }

  const result = applyPaymentEvent({
    order_id: order.id,
    event_id: `evt_${uid()}`,
    type: parsed.data.outcome === 'failed' ? 'payment.failed' : 'payment.succeeded',
  });
  res.json({ ok: true, ...result, order: orderView(db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id)) });
});
