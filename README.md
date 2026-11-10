# Tuyamika

**The Beauty of Giving, The Joy of Sharing.**

Gifting, celebrations and events platform for Zambia and Zimbabwe: gift registries,
guest reservations with surprise privacy, group contributions, event workspaces,
curated Tuyamika Specials, a retailer marketplace, payments and delivery tracking.

This repository is one project in two halves:

| Path | What it is |
|---|---|
| Root (`src/server`, `bin`, `public`) | **MVP backend + web console** — Node/Express API, SQLite (`node:sqlite`), vanilla-JS SPA for owner/retailer/admin |
| `app/` | **Expo React Native product prototype** — 16 designed screens running Android, iOS and web from one codebase, plus marketing site (`app/website/`) and prebuilt web bundle (`app/webapp/`) |

The root backend is real: accounts with roles, registries with surprise/privacy
enforcement server-side, guest reservation + checkout with idempotency keys,
a payment-provider abstraction (`PAYMENT_PROVIDER=stub` by default), retailer
onboarding behind admin approval, an admin console, notifications and rate limiting.
The Expo app still runs on mock data (`app/src/data.js`) and is the next stage of
wiring (see Next build steps).

## Repository map

```
bin/server.mjs          server boot (PORT, DATA_DIR, JWT_SECRET from env/.env)
src/server/
  index.mjs             express app: CSP, static SPA, api routers, guest HTML
  routes/               auth, registry, catalog, guest, payments, retailer,
                        admin, notifications
  middleware/           auth (RBAC), rate limiting (auth/guest/pay lanes)
  lib/                  db (node:sqlite), reservation (locks/TTL/sweep),
                        payment.stub, announcements
  views/                server-rendered guest share page + API views/escaping
public/                 owner/retailer/admin console SPA (vanilla JS, hash router)
scripts/                seed-demo.mjs, smoke-test.mjs (self-spawn scratch server)
app/                    Expo RN app (own package.json + README)
app/website/ app/webapp/ marketing site + prebuilt web bundle
docs/                   roadmap.md, technical-proposal.md
```

## Quick start (backend + console)

```bash
cp .env.example .env    # JWT_SECRET must change in any non-dev environment
npm install
npm run db:seed         # creates ./data/tuyamika.db, wipes to demo data
npm start               # node bin/server.mjs (port from .env, default 3000)
open http://localhost:3000          # web console (login: owner / retailer / admin)
open http://localhost:3000/r/demo-share-2026   # guest share page
```

CI (`.github/workflows/ci.yml`) runs lint, syntax check, unit tests and the smoke
test on every push.

```bash
npm run test:unit       # node --test unit suite (views/middleware edge cases)
npm test                # 27-step smoke test; spawns its own scratch server + DB
```

## Demo accounts (from `npm run db:seed`)

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@tuyamika.app` | `admin-demo-2026` |
| Retailer | `zulwazi@crafts.africa` | `retail-demo-2026` |
| Registry owner | `tino@example.com` | `owner-demo-2026` |

Seed demo data: Zulwazi Crafts store (products K85–K125), guest share link
`/r/demo-share-2026`, sample paid order and notifications.

## API surface

- `POST /api/auth/signup|login`, `GET|PATCH /api/auth/me`, `GET /api/auth/verify/:token`
- `POST /api/auth/firebase`, `GET /api/auth/firebase-config` (optional Firebase/Google sign in)
- `GET|POST /api/products`, `GET /api/categories` (catalog, public read)
- `GET|POST|PATCH /api/registries`, `POST|DELETE /api/registries/:id/items`
- `GET /api/r/:token` (guest JSON), `GET /r/:token` (guest HTML)
- `POST /api/r/:token/reservations`, `POST /api/r/:token/checkout`, `POST /api/reservations/:id/release`
- `POST /api/pay/simulate` (stub flow), `POST /api/webhook/payment` (secret-gated, idempotent by `event_id`)
- `GET|POST /api/retailer/*` (business onboarding behind admin approval, products, orders)
- `GET /api/admin/*` (users, business approval, orders, logs)
- `GET /api/notifications`, `POST /api/notifications/:id/read`
- `GET /healthz`

## Web console (`public/`)

Login, role-gated navigation:

- **Owner** — registries (create/publish/close/settings), registry detail (add gifts
  from catalog, remove, surprise-privacy toggle), notifications.
- **Retailer** — businesses (register, status), products (CRUD once admin-approved), orders.
- **Admin** — users, business approval, orders, audit logs.

Vanilla JS hash-router module, no build step, CSP-safe (no inline scripts/styles),
JWT stored in `localStorage`.

## Expo app (`app/`)

16 designed screens: Splash, Gifts, Gift Detail, Registries, Registry Detail,
Create, Share, Group Gifting, Events, Event Detail, Specials, Discover, Checkout,
Payment (MoMo/card/bank UI), Tracking, Profile. Global state in `app/src/store.js`
handles the registry item lifecycle (`Available → Reserved → Purchased`).
Payment confirmation is simulated (1800 ms); backend payment enforcement is part
of the next build stage.

```bash
cd app && npm install
npx expo start          # a Android, i iOS, w web
EXPO_OFFLINE=1 npx expo start   # if Expo's version check is blocked by network
```

Auth providers: the app picks a provider at boot.

- `EXPO_PUBLIC_API_BASE_URL` set → live API (`ApiAuthProvider`: signup/login,
  `PATCH /api/auth/me` profile sync, JWT persisted in SecureStore).
- else in dev → device-local mock accounts (`LocalAuthProvider`, DEV only).
- else in release → `UnconfiguredAuthProvider` (signs in are blocked).

Optional Google sign in (web builds): set `EXPO_PUBLIC_FIREBASE_API_KEY`,
`EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`,
`EXPO_PUBLIC_FIREBASE_APP_ID` and the matching server side `FIREBASE_*`
credential keys (see `.env.example`). Google button appears on web only; tokens
are exchanged at `POST /api/auth/firebase`. Phone demo: install **Expo Go**,
scan the QR. Website:
`python3 -m http.server 8080 --directory app/website`. Prebuilt web bundle:
`python3 -m http.server 8081 --directory app/webapp`.

Brand system (both console + app): Warm Ivory `#F8F4EC`, Champagne `#D8C3A5`,
Muted Gold `#B18A52`, Deep Espresso `#302821`, Soft Blush `#E8DCD0`. Interface
typeface Poppins, display heading Alkatra (free substitute for Sawa Erma —
commercial Sawa Erma licence must be confirmed before release; drop the TTF in
`app/assets/fonts/` and update `app/src/theme.js` to swap).

## Stack (decision log)

- Node ≥ 23.4 built-in `node:sqlite` — zero native deps. Replacement rationale:
  better-sqlite3's native addon source was abandoned after a nondeterministic
  `RemoveEnvironmentCleanupHook` abort on Node 24 teardown. Single SQLite file,
  no ORM, prepared statements.
- Express 4, helmet/CSP, morgan, zod validation, bcryptjs hashing, jsonwebtoken
  sessions, cors. Rate limiting per lane (auth/guest/pay), IP-keyed v8 express-rate-limit.
- Payments stubbed behind `PAYMENT_PROVIDER=stub`; stub exposes idempotency keys so
  webhook re-firing cannot duplicate orders/settlements (PRD §14.5). Replace with a
  real provider (mobile-money aggregator + card PSP) per launch market.
- Web console: no framework/build, served same-origin behind CSP.

## Security notes for reviewers

- All secrets env-only; `.env` is gitignored; seed credentials are throwaway demo data.
- Surprise registries hide buyer/giver identity and mask `purchased_by` on both API
  views and owner notifications (`payment.stub.mjs` skips owner notification for
  surprise registries deliberately).
- Per-route rate limits: auth, guest share/reserve/checkout, payment simulate.
  In-memory store (per-process; counts collapse in multi-instance deploys).
- Reservations: short-TTL locks with idempotency, demand-driven sweep plus 60-second loop timer.
- SPA fallback constrained to non-API, non-`/r/` GETs; everything else stays JSON.

## Key constraints from PRD §25 (open decisions remain open)

Free tier ≤ 3 registries / 12 items; reservation TTL configurable; contribution
pooling legal-review pending. Code reads these as runtime config, not baked values.

## Next build steps (from `docs/roadmap.md`)

1. Wire the Expo app's screens to the live MVP API (replace `app/src/data.js` mocks).
2. Payment provider selection (MoMo MTN/Airtel via aggregator, cards, international later).
3. Notifications channels (push/email/SMS), Gift Hub fulfilment records.
4. Legal review: pooled-funds handling, consumer protection, both markets.
