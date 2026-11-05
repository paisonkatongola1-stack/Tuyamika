<<<<<<< HEAD
# Tuyamika — MVP Foundation

African-heritage gifting platform scaffold. Minimal viable foundation built from the PRD: accounts/profiles, individual registries, gift reservations, checkout/payment stub, order records, retailer order dashboard, admin controls. Deferred beyond session: notifications, fulfilment hub, Specials, international payments — tracked in `docs/roadmap.md`.

## Running

```bash
cp .env.example .env   # JWT_SECRET must change in any non-dev environment
npm install
npm run db:seed        # creates ./data/tuyamika.db, wipes to demo data
npm start              # node bin/server.mjs  (port from .env, default 3000)
npm test               # runs scripts/smoke-test.mjs against a running server; resets demo DB first
```

CI (`.github/workflows/ci.yml`) runs lint, syntax check, seed, and the smoke test on every push.

## Demo accounts (from `npm run db:seed`)

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@tuyamika.app` | `admin-demo-2026` |
| Retailer | `zulwazi@crafts.africa` | `retail-demo-2026` |
| Registry owner | `tino@example.com` | `owner-demo-2026` |

Guest share link after seed: `http://localhost:3000/r/demo-share-2026` (HTML page) or `/api/r/demo-share-2026` (JSON).

## API surface (MVP)

- `POST /api/auth/signup|login`, `GET /api/auth/me`, `GET /api/auth/verify/:token`
- `GET|POST|PATCH /api/registries`, `POST|DELETE /api/registries/:id/items`
- `GET /api/r/:token` (guest JSON), `GET /r/:token` (guest HTML)
- `POST /api/r/:token/reservations`, `POST /api/r/:token/checkout`, `POST /api/reservations/:id/release`
- `POST /api/pay/simulate` (guest payment for stub flow), `POST /api/webhook/payment` (secret-gated)
- `GET|POST /api/retailer/*` (business onboarding, products, orders)
- `GET /api/admin/*` (users, businesses approval, orders, logs)
- `GET /api/notifications`, `POST /api/notifications/:id/read`
- `GET /healthz`

## Stack (decision log)

- Node ≥ 23.4 (`node:sqlite` built in), `node --watch` for dev.
- Express 4, built-in `node:sqlite` (zero native deps; needs Node ≥ 23.4, or ≥ 22.5 with `--experimental-sqlite`), zod for validation, bcryptjs for password hashing, jsonwebtoken for sessions, helmet, cors, morgan.
- Replacement rationale: better-sqlite3 Native addon source was abandoned after a nondeterministic `RemoveEnvironmentCleanupHook` abort on Node 24 teardown; switch to `node:sqlite` for no external binaries or native builds.
- Payment routing stubbed behind `PAYMENT_PROVIDER=stub`; replace with real provider per launch market. Stubs expose idempotency keys so webhook re-firing cannot duplicate orders/settlements (PRD §14.5).
- Mobile-first SPA frontend not in MVP; shared registry pages render server-side so guests without an account can view gifts on mobile web (PRD §6.6).

## Key constraints from PRD §25 (open decisions remain open)

Free tier ≤ 3 registries / 12 items; reservation TTL configurable; contribution pooling legal-review pending. Code reads these as runtime config, not baked values.

## Architecture sketch

`routes/` → `middleware/auth.mjs`, `lib/db.mjs`, `lib/reservation.mjs`, `lib/payment.stub.mjs`, `views/`
Single SQLite file. No ORM; SQL strings kept short with prepared statements. Event-specific permissions enforced server-side per role table (`event_memberships`).

## Security notes for reviewers

- All secrets are env-only; `.env` is gitignored, and seed data is throwaway demo credentials only.
- Per-route rate limiting is applied to auth, guest share/reserve/checkout, and payment simulate; in-memory store only (per-process — counts collapse in multi-instance deploys).
- Webhooks authenticate via shared secret header (`PAYMENT_WEBHOOK_SECRET`) and are idempotent by `event_id`.
- Reservation expiry includes a demand-driven sweep plus a 60-second loop timer.
=======
# Tuyamika

**The Beauty of Giving, The Joy of Sharing.**

Gifting, celebrations and events platform for Zambia and Zimbabwe:
gift registries, guest reservations with surprise privacy, group contributions,
event workspaces, curated Tuyamika Specials, marketplace, payments and delivery tracking.

## What is inside

| Path | What it is |
|---|---|
| `App.js`, `src/` | Expo React Native app — one codebase runs **Android, iOS and web** |
| `src/data.js` | PRD-derived mock data: products K850–K1250, registries, campaigns, events, providers |
| `src/store.js` | Global state + registry item lifecycle (`Available → Reserved → Purchased`), contributions, orders |
| `src/screens/` | All 16 designed screens: Splash, Gifts, Gift Detail, Registries, Registry Detail, Create, Share, Group Gifting, Events, Event Detail, Specials, Discover, Checkout, Payment (MoMo/card/bank), Tracking, Profile |
| `website/index.html` | Standalone marketing/pitch website |
| `webapp/` | Prebuilt web bundle of the app (serve statically) |

Brand system implemented: Warm Ivory `#F8F4EC`, Champagne `#D8C3A5`, Muted Gold `#B18A52`,
Deep Espresso `#302821`, Soft Blush `#E8DCD0`, Honey/Walnut/Dark Wood accents.
Interface typeface: Poppins. Display heading: Alkatra (free substitute for Sawa Erma —
commercial Sawa Erma licence must be confirmed before release; drop the TTF in `assets/fonts/`
and update `src/theme.js` to swap).

## Run

```bash
npm install
npx expo start          # press a for Android, i for iOS, w for web
EXPO_OFFLINE=1 npx expo start   # if Expo's version check is blocked by network
```

Phone demo: install **Expo Go** (Android/iOS), scan the QR from `npx expo start`.

Website: `python3 -m http.server 8080 --directory website`
Prebuilt app web bundle: `python3 -m http.server 8081 --directory webapp`

## Prototype behaviour

- Registry gift reservation: tap **Reserve** → checkout → payment → slot becomes **Purchased** for everyone.
- Group contribution: contribute → campaign progress updates from verified "payment".
- Surprise privacy: registry owners see "Someone has arranged a gift…" — purchaser identity and gift stay hidden; backend enforcement is required at build stage (PRD §9.6).
- Payment confirmation is simulated (1800 ms). Real integration needs a provider (mobile money aggregator + card PSP), idempotency, webhook/server-side confirmation per PRD §14.5.

## Next build steps (from PRD roadmap)

1. Backend: accounts, RBAC, registries, reservations with expiry, orders, idempotent payments.
2. Payment provider selection (MoMo: MTN/Airtel via aggregator; cards; international later).
3. Retailer business portal + admin dashboard (approval workflow, settlements).
4. Notifications (push/email/SMS), Gift Hub fulfilment records.
5. Legal review: pooled-funds handling, consumer protection, privacy in both markets.
>>>>>>> 2484f1b5095c60c0b0d9dd55d95a1128a45f0ad7

## Expo app (`app/`)

The full 16-screen product prototype (Expo React Native — Android, iOS, web) lives in `app/`, with its own `package.json`, mock data store, marketing site (`app/website/`) and prebuilt web bundle (`app/webapp/`). Run with `npm install && npx expo start` from `app/`. Details: `app/README.md`.
