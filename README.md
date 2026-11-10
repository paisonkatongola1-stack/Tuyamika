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
  index.mjs             express app: CSP/HSTS, HTTPS force, static SPA, api routers
  routes/               auth, registry, events, specials, fulfilment, catalog,
                        guest, payments, errors, legal, retailer, admin,
                        notifications
  middleware/           auth (RBAC + session/verify/opt-out tokens), rate limiting
  lib/                  db (node:sqlite), reservation (locks/TTL/sweep),
                        payment.stub + payment.momo, firebase, notifier
                        (email/SMS outbox), errorlog
  views/                server-rendered guest share page + API views/escaping
public/                 owner/retailer/admin console SPA (vanilla JS, hash router)
scripts/                seed-demo.mjs, smoke-test.mjs (self-spawn scratch server)
app/                    Expo RN app (own package.json + README)
app/website/ app/webapp/ marketing site + prebuilt web bundle
docs/                   roadmap.md, technical-proposal.md
THIRD_PARTY.md          third-party SDK register + content-license rules
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
npm test                # 74-check smoke test; spawns its own scratch server + DB
```

## Operator configuration (`/.env`)

| Variable | Purpose |
| --- | --- |
| `JWT_SECRET` | session signing — required outside dev, server refuses to start without it |
| `BUSINESS_NAME/EMAIL/PHONE/ADDRESS` | identity shown in the console footer and `/legal/*` pages |
| `FORCE_HTTPS` | `1` = 301-redirect GET traffic behind your TLS proxy |
| `RESERVATION_TTL_MINUTES`, `FREE_MAX_*` | free-tier entitlements per PRD §25 |
| `PAYMENT_PROVIDER`, `MOMO_*/AIRTEL_*/ECOCASH_*` | payments (stub default) |
| `SMTP_*`, `SMS_GATEWAY_*` | notification channels; email footer carries the unsubscribe link |
| `FIREBASE_*` | optional server-side Firebase auth exchange |
| `RL_AUTH_MAX/WINDOW_MIN` etc. | rate-limit lane tuning |

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
- `DELETE /api/auth/account` (self-service data deletion — tombstones personal data)
- `GET /api/auth/unsubscribe/:token` (email opt-out flip; link embedded in every email footer)
- `POST /api/auth/firebase`, `GET /api/auth/firebase-config` (optional Firebase/Google sign in)
- `GET|POST /api/products`, `GET /api/categories`, `GET|POST /api/products/:id/reviews` (verified buyers only)
- `GET|POST|PATCH /api/registries`, `POST|DELETE /api/registries/:id/items`
- `GET|POST|PATCH /api/events`, `POST /api/events/:id/rsvp` (private events invite-only), `POST|PATCH /api/events/:id/tasks`
- `GET|POST|DELETE /api/specials` (vendor promos, owner/admin)
- `GET|PATCH /api/fulfilment`, `GET /api/fulfilment/mine`, `GET /api/orders/track/:ref` (public-by-ref)
- `GET /api/r/:token` (guest JSON), `GET /r/:token` (guest HTML)
- `POST /api/r/:token/reservations`, `POST /api/r/:token/checkout`, `POST /api/reservations/:id/release`
- `POST /api/pay/simulate` (stub flow), `POST /api/pay/status/:ref`, `POST /api/webhook/payment` (secret-gated, idempotent by `event_id`)
- `GET|POST /api/retailer/*` (business onboarding behind admin approval, products, orders)
- `GET /api/admin/*` (users, business approval, orders, logs, error ledger)
- `POST /api/client-errors`, `GET|DELETE /api/admin/errors`
- `GET /legal/privacy|terms|refund|cookies` (server-rendered policy pages)
- `GET /healthz`

## Web console (`public/`)

Login, role-gated navigation:

- **Owner** — registries (create/publish/close/settings), registry detail (add gifts
  from catalog, remove, surprise-privacy toggle), notifications, account tab with
  self-service data deletion.
- **Retailer** — businesses (register, status), products, specials, fulfilment pipeline.
- **Admin** — users, business approval, orders + fulfilment transitions, audit logs,
  error ledger (server 5xx + client reports), clear/dismiss.

Vanilla JS hash-router module, no build step, CSP-safe (no inline scripts/styles).
Session token lives in `sessionStorage` by default (private-session behaviour);
"Keep me signed in" moves it to `localStorage` and only applies when cookie
consent was accepted. Expired sessions auto-clear with a toast and redirect.
First visit shows a cookie/storage consent banner (honours Do-Not-Track and
Global Privacy Control as auto-decline; footer "Cookie settings" reopens it).

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
  Production refuses to boot with the fallback JWT secret (fail-fast in `middleware/auth.mjs`).
- Surprise registries hide buyer/giver identity and mask `purchased_by` on both API
  views and owner notifications (`payment.stub.mjs` skips owner notification for
  surprise registries deliberately).
- Per-route rate limits: auth, guest share/reserve/checkout, payment simulate.
  In-memory store (per-process; counts collapse in multi-instance deploys).
- Reservations: short-TTL locks with idempotency, demand-driven sweep plus 60-second loop timer.
- All SQL uses prepared statements; every write body passes a zod schema; update
  column lists are whitelisted (no mass-assignment/field tampering);
  ownership re-checked per row (`owner_id`/business join) before any mutation.
- `helmet` CSP (self-only origins, `frame-ancestors 'self'`, `form-action 'self'`),
  HSTS 180 days, nosniff, X-Frame-Options, `Referrer-Policy: no-referrer`;
  `FORCE_HTTPS=1` 301-redirects GET traffic when behind a TLS-terminating proxy.
- Signup carries an invisible honeypot field (bots filling it get 400).
- Full dependency audit clean: `npm audit --omit=dev` reports 0 vulnerabilities.

## Compliance & privacy (what is enforced in code)

Documented for users at `/legal/privacy|terms|refund|cookies` and for operators in
`THIRD_PARTY.md`; the runtime behaviours behind those pages:

| Requirement | Implementation |
|---|---|
| Cookie consent banner | console: first-visit banner, `tuyamika.cookieconsent`, DNT/GPC respected |
| Form consent | signup requires checked consent checkbox; server rejects otherwise (400) |
| Data minimisation | account collects name/email/phone/country only |
| Third-party SDK audit | `THIRD_PARTY.md` register; all adapters optional + env-gated |
| Data deletion | `DELETE /api/auth/account` + Account-tab UI; tombstone + FK-safe anonymization |
| Unsubscribe | every email footer tokenized opt-out link; marketing queue skips opted-out users; transactional always send |
| No absolute URLs of secrets | client only ever receives *public* Firebase config |
| Parameterized queries | everywhere; zod validation on every write body |
| Restrict uploads | no upload endpoints exist; policy documented before any are added |
| Trim API responses | hashes and internal refs never serialized; surprise registries mask purchase identities |
| Reviews integrity | verified-purchase gate + UNIQUE(product, order); platform writes no reviews |
| Security headers | CSP/HSTS/nosniff/X-Frame-Options/Referrer-Policy/HTTPS-force |
| Accessibility | focus-visible outlines, WCAG-AA contrast fixes, aria labels on icon imagery |
| Business details | `BUSINESS_NAME/EMAIL/PHONE/ADDRESS` env drive footer + legal pages |
| Error telemetry | client pages report faults to `/api/client-errors`; admin ledger surfaces them |

Smoke suite (`npm test`) covers the compliance behaviours — 74 checks including
consent gate (400), honeypot (400), invite-only private event RSVP, unsubscribe
token guard, account deletion + tombstone, policy pages and security headers.

## Key constraints from PRD §25 (open decisions remain open)

Free tier ≤ 3 registries / 12 items; reservation TTL configurable; contribution
pooling legal-review pending. Code reads these as runtime config, not baked values.

## Next build steps (from `docs/roadmap.md`)

1. Wire the Expo app's screens to the live MVP API (replace `app/src/data.js` mocks).
2. Payment provider selection (MoMo MTN/Airtel via aggregator, cards, international later).
3. Notifications channels (push/email/SMS), Gift Hub fulfilment records.
4. Legal review: pooled-funds handling, consumer protection, both markets.
