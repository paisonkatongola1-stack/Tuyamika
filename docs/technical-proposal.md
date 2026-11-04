# Tuyamika — Technical Proposal (MVP scope)

Derived from PRD §26. All deferred decisions are flagged.

## 1. Recommended architecture

Vertical slice, single SQLite file per service instance, prepared statements everywhere, no ORM.

```
routes/            auth.mjs registry.mjs guest.mjs events.mjs retailer.mjs admin.mjs
lib/
  db.mjs           schema init, migrations, helpers
  reservation.mjs reservation expiry sweep + idempotency keys
  payment.stub.mjs stub returning deterministic ids; replace later
middleware/auth.mjs  JWT verify + role gating on each sensitive action
views/             json shape helper (no templates)
data/schema.sql    21 tables per PRD §21 + role tables
scripts/seed-demo.mjs   demo retail products, one registry, one contribution goal
```

## 2. Module map

| Module | Files | MVP state |
| --- | --- | --- |
| Account | `accounts` table, signup, login, verify-email stub, guest token | done |
| Registries | `registries`, `registry_items`, `reservations` | done |
| Checkout | `orders`, `order_items`, reservations → purchase on payment stub webhook | done (stub) |
| Retailer dashboard | `businesses`, `products`, `retailer_orders` | seeded |
| Admin dashboard | `admin_users`, moderation flag tables | done |
| Deferred | notifications, fulfilment hub, Specials, international gifting, reviews, quoted booking | next phases |

## 3. Payment model to wire first

Stub that: returns `{status:'pending'}`; accepts `{idempotencyKey}`; exposes `POST /webhook/payment` verified by `PAYMENT_WEBHOOK_SECRET` with signature check on future providers. Webhook handler is the single source of truth for `Pending→Paid→Processing…`. Duplicate webhook event → same key returns cached order. This satisfies PRD §14.4 / §14.5 without a real provider.

## 4. Idempotency

Reservations carry `reservation_id + item_id` as natural keys; checkout requests carry `checkout_idempotency_key` stored in the reservation row; payment webhooks keyed by `order_id+webhook_event_id`. Any duplicate event returns existing row; new checkout for the same item fails safe (`available`).

## 5. Registry privacy enforcement

`registry_items.purchased_by` and `purchased_at` nullable while `registry.surprise=1`. When owner queries purchases they get `null`. Backend authorization checks this; UI hides rows by default and never shows giver. Update revelation flow separate from this build.

## 6. Phase gating

MVP done when demo account flows: signup → create registry → publish link → guest visits shared page → reserves → checkout stub pays → owner learns via notification stub. Acceptance criteria from PRD §24.3 exercised end-to-end. Remaining phases documented in docs/roadmap.md, not in code.
