# Compliance checklist

Status of every item on the launch-compliance list, with where it is implemented and how it is verified. Verified by the smoke suite (`npm test`, 87 checks) unless noted.

| # | Requirement | Status | Where | Verification |
| --- | --- | --- | --- | --- |
| 1 | Privacy policy | done | `/legal/privacy` (`src/server/routes/legal.mjs`) | smoke: page 200 |
| 2 | Terms of service | done | `/legal/terms` | smoke: page 200 |
| 3 | Refund policy | done | `/legal/refund` | smoke: page 200 |
| 4 | Cookie policy | done | `/legal/cookies` | smoke: page 200 |
| 5 | Cookie consent banner | done | `public/app.js` `#cookiebanner`, Accept/Decline, reopened via footer "Cookie settings"; honours DNT/GPC as decline | smoke: banner + settings flow |
| 6 | Form consent check | done | signup requires `consent: z.literal(true)` (`src/server/routes/auth.mjs`) | smoke: 400 without consent |
| 7 | Collect only needed data | done | signup asks email/name/country only; whitelisted column updates everywhere | route audit |
| 8 | Audit third-party SDKs | done | `THIRD_PARTY.md` register (Firebase, MTN/Airtel/EcoCash MoMo, SMTP, SMS — all env-gated lazy-init, none load by default) | `npm audit --omit=dev` = 0 vulns |
| 9 | No dark patterns | done | no urgency/scarcity/superlative strings in console or app copy (grep audit, 2026-11) | grep audit clean |
| 10 | No hidden fees | done | platform fee shown at checkout before payment (`calculateFee` display); `THIRD_PARTY.md` pricing-integrity note | code + copy review |
| 11 | No fake reviews | done | reviews require verified purchase (`product_reviews` UNIQUE(product, order)); platform writes none | route + DB constraints |
| 12 | No unsupported claims | done | product/service copy is owner-authored; no platform marketing claims exist | copy review |
| 13 | Alt text on images | done | `ProductImage` in Expo app is decorative-only (`accessibilityElementsHidden`); screen labels carry the meaning; QR gets `role="img" aria-label` | a11y pass |
| 14 | Color contrast | done | WCAG AA fixes in `public/styles.css` (button text espresso-on-gold ≥4.5:1, muted wood tones, focus outlines) | contrast review |
| 15 | Keyboard navigation | done | global `:focus-visible` outlines; console is standard focusable markup | manual tab-through |
| 16 | Business details visible | done | footer business line + legal pages use `BUSINESS_NAME/EMAIL/PHONE/ADDRESS` env (`src/server/routes/legal.mjs`) | smoke: page 200 |
| 17 | Unsubscribe link in emails | done | every marketing email embeds tokenized link → `/api/auth/unsubscribe/:token` flips `users.email_optout` (`src/server/lib/notifier.mjs`) | smoke: unsubscribe flow |
| 18 | Marketing opt-out honoured | done | opted-out users' marketing notifications queue as `opted_out` and never send | notifier logic |
| 19 | Licensed stock images | done | app ships **zero** stock/remote images — inline SVG icons only | build review |
| 20 | Data deletion option | done | `DELETE /api/auth/account` tombstones the user, deletes owned registries/events, anonymizes order recipient fields | smoke: deletion + tombstone |
| 21 | Hide API keys | done | all provider keys in `.env` (gitignored); `.env.example` placeholders only | git history scan |
| 22 | Purge git secrets | done | full history scanned — only false positives (FontAwesome bundles, demo fallbacks); `.env` never committed | `git log -p` scan |
| 23 | No public DB key | done | SQLite file lives on the server; no DB port or dashboard exposed; admin actions need admin JWT | config review |
| 24 | Row-level security | done-equivalent | SQLite has no RLS; equivalent: every read/write is scoped by `owner_id`/membership SQL + auth middleware | route audit (8 routers) |
| 25 | Encrypt sensitive data | done-equivalent | bcrypt password hashing; card data/PINs never touch our DB (MoMo payee-prompted); no column-level AES needed for stored data | design review |
| 26 | Secure session cookies | n/a | console uses bearer-token sessions (sessionStorage by default, opt-in localStorage behind cookie consent); no cookies ⇒ no CSRF surface | design review |
| 27 | HTTPS enforcement | done | `FORCE_HTTPS=1` behind TLS proxy: 301 redirect + HSTS 180d + CSP upgrade-insecure-requests | smoke: headers |
| 28 | Rate limiting | done | `express-rate-limit` on auth, guest, payment limiers | route audit |
| 29 | Security headers | done | helmet CSP/Referrer-Policy/nosniff/X-Frame-Options/HSTS (`src/server/index.mjs`) | smoke: headers |
| 30 | Vulnerability scan | done | `npm audit --omit=dev` = 0; zod 4.6.7, firebase-admin 14 | audit output |

## Remaining external dependencies

- Real payment providers, real email/SMS delivery, account-verification email: need credentials/decisions from the operator (see `docs/roadmap.md` Milestone 1).
- Contribution pooling: deliberately not implemented pending legal review (Milestone 3 note).
