import { Router } from 'express';
import z from 'zod';
import { db, uid, now, fail } from '../lib/db.mjs';
import { authRequired } from '../middleware/auth.mjs';

// Milestone 4: quoted service booking (catering, decor, photography...).
// PRD §21 state machine: pending | viewed | responded | accepted | declined | expired.
// Customer asks an approved service_provider business; provider answers with a
// price; customer accepts or declines. Accepting does NOT create an order —
// money stays out until real invoicing is configured. One open quote per
// customer/provider pair prevents spam.

export const quoteRouter = Router();
quoteRouter.use(authRequired);

const CreateQuote = z.object({
  provider_id: z.string().min(1),
  event_type: z.string().min(1).max(60),
  event_date: z.string().optional(),
  location: z.string().max(120).optional(),
  budget_cents: z.number().int().min(0).max(100_000_000).optional(),
  requirements: z.string().min(1).max(2000),
});

const RespondQuote = z.object({
  price_cents: z.number().int().min(0).max(100_000_000),
  message: z.string().max(2000).optional(),
});

quoteRouter.post('/', (req, res) => {
  const parsed = CreateQuote.safeParse(req.body || {});
  if (!parsed.success) throw fail(400, 'validation failed', { details: parsed.error.flatten() });
  const b = parsed.data;

  const biz = db.prepare('SELECT * FROM businesses WHERE id = ?').get(b.provider_id);
  if (!biz || biz.type !== 'service_provider') throw fail(404, 'service provider not found');
  if (biz.status !== 'approved') throw fail(403, 'provider not approved yet');

  const open = db
    .prepare(
      `SELECT id FROM quotes WHERE customer_id = ? AND provider_id = ? AND status IN ('pending','viewed') LIMIT 1`
    )
    .get(req.user.id, biz.id);
  if (open) throw fail(409, 'you already have an open quote with this provider');

  const id = uid();
  db.prepare(
    `INSERT INTO quotes (id, customer_id, provider_id, event_type, event_date, location, budget_cents, requirements, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
  ).run(id, req.user.id, biz.id, b.event_type, b.event_date ?? null, b.location ?? null, b.budget_cents ?? null, b.requirements, now());
  db.prepare(
    `INSERT INTO notifications (id, recipient_id, channel, trigger, message, link, read, created_at)
     VALUES (?, ?, 'inapp', 'quote.requested', ?, '#/retailer', 0, ?)`
  ).run(uid(), biz.user_id, `New quote request: ${b.event_type}`, now());
  res.status(201).json({ quote: db.prepare('SELECT * FROM quotes WHERE id = ?').get(id) });
});

quoteRouter.get('/providers', (req, res) => {
  const rows = db
    .prepare(
      `SELECT b.id, b.name, b.description FROM businesses b WHERE b.type = 'service_provider' AND b.status = 'approved' ORDER BY b.name`
    )
    .all();
  res.json({ providers: rows });
});

quoteRouter.get('/', (req, res) => {
  if (req.user.role === 'business_owner' || req.user.role === 'service_provider') {
    const mine = db
      .prepare(
        `SELECT qt.* FROM quotes qt
         JOIN businesses q2 ON q2.id = qt.provider_id WHERE q2.user_id = ?
         ORDER BY qt.created_at DESC LIMIT 100`
      )
      .all(req.user.id);
    return res.json({ quotes: mine });
  }
  const rows = db
    .prepare('SELECT * FROM quotes WHERE customer_id = ? ORDER BY created_at DESC LIMIT 100')
    .all(req.user.id);
  res.json({ quotes: rows });
});

// Fetches the quote after role-visibility check; provider access flips a
// pending quote to viewed (provider knows customer read nothing — this marks
// that the provider SAW it, per PRD §21.1).
function visibleQuote(req) {
  const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id);
  if (!quote) throw fail(404, 'quote not found');
  if (quote.customer_id === req.user.id || req.user.role === 'admin') return { quote, isProvider: false };
  const biz = db.prepare('SELECT * FROM businesses WHERE id = ? AND user_id = ?').get(quote.provider_id, req.user.id);
  if (!biz) throw fail(404, 'quote not found');
  if (quote.status === 'pending') {
    db.prepare(`UPDATE quotes SET status = 'viewed' WHERE id = ?`).run(quote.id);
    quote.status = 'viewed';
  }
  return { quote, isProvider: true, biz };
}

quoteRouter.get('/:id', (req, res) => {
  const { quote } = visibleQuote(req);
  res.json({ quote, response: quote.response ? JSON.parse(quote.response) : null });
});

quoteRouter.post('/:id/response', (req, res) => {
  const parsed = RespondQuote.safeParse(req.body || {});
  if (!parsed.success) throw fail(400, 'validation failed', { details: parsed.error.flatten() });
  const { quote, biz } = visibleQuote(req);
  if (!biz) throw fail(403, 'only the service provider responds');
  if (['accepted', 'declined', 'expired'].includes(quote.status)) throw fail(409, `quote already ${quote.status}`);

  db.prepare(`UPDATE quotes SET response = ?, status = 'responded' WHERE id = ?`).run(
    JSON.stringify({ price_cents: parsed.data.price_cents, message: parsed.data.message ?? null, at: now() }),
    quote.id
  );
  db.prepare(
    `INSERT INTO notifications (id, recipient_id, channel, trigger, message, link, read, created_at)
     VALUES (?, ?, 'inapp', 'quote.responded', ?, '#/quotes', 0, ?)`
  ).run(uid(), quote.customer_id, `Quote responded: ${quote.event_type} — $${(parsed.data.price_cents / 100).toFixed(2)}`, now());
  res.json({ quote: db.prepare('SELECT * FROM quotes WHERE id = ?').get(quote.id) });
});

quoteRouter.post('/:id/accept', (req, res) => {
  const { quote, isProvider } = visibleQuote(req);
  if (isProvider) throw fail(403, 'only the customer accepts');
  const decision = String(req.query.decision || 'accepted');
  if (!['accepted', 'declined'].includes(decision)) throw fail(400, 'decision must be accepted or declined');
  if (quote.status !== 'responded') throw fail(409, `quote ${quote.status}; no response to accept yet`);

  db.prepare('UPDATE quotes SET status = ? WHERE id = ?').run(decision, quote.id);
  const biz = db.prepare('SELECT user_id FROM businesses WHERE id = ?').get(quote.provider_id);
  if (biz) {
    db.prepare(
      `INSERT INTO notifications (id, recipient_id, channel, trigger, message, link, read, created_at)
       VALUES (?, ?, 'inapp', 'quote.decision', ?, '#/retailer', 0, ?)`
    ).run(uid(), biz.user_id, `Quote ${decision}: ${quote.event_type}`, now());
  }
  res.json({ quote: db.prepare('SELECT * FROM quotes WHERE id = ?').get(quote.id) });
});

// 30-day staleness sweep, wired into the main sweep interval by index.mjs.
export function sweepExpiredQuotes() {
  const r = db
    .prepare(
      `UPDATE quotes SET status = 'expired'
       WHERE status IN ('pending','viewed','responded') AND created_at < ?`
    )
    .run(now() - 30 * 24 * 3600 * 1000);
  return r.changes;
}
