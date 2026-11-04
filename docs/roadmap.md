# Tuyamika — Roadmap

Deferred phases live here, not in code (proposal §6). Order mirrors PRD §26 expansion plan; each item ships when its naming milestone lands.

## Milestone 1 — launch readiness (code exists, needs hardening)

| Item | Status | Notes |
| --- | --- | --- |
| Real payment providers | stubbed | `PAYMENT_PROVIDER=stub`; per-market provider (mobile money ZW, card PSPs) behind same webhook contract. Idempotency + event dedupe already enforced (`webhook_events`). |
| Real email delivery | stubbed | Signup returns a `verify_token` URL stub (`stubs.verification`). Replace with provider + templated mail; TTL via `VERIFY_EMAIL_TTL_HOURS`. |
| Account verification UX | backend only | `users.verified` exists; no account settings screens yet. |

## Milestone 2 — notifications hub

- `notifications` table + in-app feed done; add email/SMS channels and delivery worker.
- Kill the surprise-registry mute rule only when revelation flow ships (proposal §5).

## Milestone 3 — fulfilment hub

- `fulfilment_records` schema exists; no hub UI/receipt flow.
- Order status transitions beyond `paid` (`processing → dispatched → delivered/collected`) are manual SQL today; build hub endpoints + retailer pipeline.

## Milestone 4 — engagement

- Specials (vendor promos). No schema yet.
- Product reviews. No schema yet.
- Quoted service booking (`quotes` schema exists, no routes).

## Milestone 5 — international gifting

- Cross-border delivery, multi-currency beyond USD, customs/duty messaging.

## Held pending external decision

- **Contribution pooling** — legal review pending (PRD §25). `contribution_campaigns`/`goals` schema seeded but no payment routes; do not light this up before sign-off.
- **Expansion phases** — per PRD §26 sequencing after Milestone 5.

## Known deferred in MVP code

- Reservation TTL sweep is demand-driven (fires on guest routes + 60s timer); needs queued job runner if traffic grows.
- Rate limiting is per-process in-memory (`express-rate-limit`); needs shared store for multi-instance deploys.
- Registry sharing is token links; no QR/share sheets yet (PRD §6.6 falls back to mobile web page).
