# Third-party Inventory & Compliance Notes

Operator-facing register of third-party code, content and data flows in
Tuyamika. Keeping this current is part of the platform's compliance posture
(privacy policy /legal/privacy summarizes the identical story for users).

## Runtime dependencies (server, npm)

| Package | Purpose | Notes |
|---|---|---|
| express, cors, morgan, helmet | HTTP stack + security headers (CSP, HSTS 180d, nosniff, frame guard) | `npm audit --omit=dev` clean at time of writing |
| node:sqlite (built-in) | Data store, WAL, parameterized prepared statements only | no string-concatenated SQL anywhere; column names come from whitelisted key sets |
| bcryptjs | password hashing (10 rounds) | plaintext never persisted |
| jsonwebtoken | session + verify/optout tokens | production refuses to boot without an operator-set JWT_SECRET |
| express-rate-limit | auth / guest / pay lanes | per-user + per-IP keys |
| zod (v4) | request validation everywhere | all POST/PATCH bodies schema-checked |
| nodemailer | SMTP adapter (off until credentials set) | |
| firebase-admin (v14, optional) | Firebase Authentication id-token verification | see SDK section below |

## Third-party services / SDKs (all optional, credentials-gated)

| Service | Where | Data shared | Client config visibility |
|---|---|---|---|
| Firebase Authentication | web console + Expo app sign-in | email, name, verified-status | only the **public** web-app config (project id) — private keys stay in server env |
| MTN Mobile Money (MoMo) | payments | payment intent token, amount, currency | server env only |
| Airtel Money | payments | same | server env only |
| EcoCash | payments | same | server env only |
| SMTP provider | notifications hub | recipient email, message | server env only |
| SMS gateway | notifications hub | phone, message | server env only |

SDK hygiene rules:
- No service-account JSON or provider secret exists in `app/`, `public/` or git history (verified before the first public push).
- The web console never receives a private/admin key; Firebase client config is public by design.
- Adapters are lazily created: unset credentials guarantee zero network chatter.

## Images, fonts, and stock media

- `public/` and `app/` ship **no third-party stock photographs, binary art or licensed media files**. Product "images" are decorative gradients + Material icon paths rendered locally (inline SVG, CSP-safe) in the console, and in the Expo app via `expo-linear-gradient` (no network images).
- Ionicons and Material icon glyph paths are parts of already-shipped libraries (`@expo/vector-icons`, hand-copied SVG paths). Their respective licenses (MIT / Apache 2.0 sources) apply unchanged.
- If stock photography is introduced later, THIS file gains a table: source, license type, attribution requirement, where used — and product rows keep a `license` column in their `images` JSON before anything ships.

## File uploads

- **No upload endpoints exist.** Registry `cover_image`, product `images` and fulfilment `proof_of_delivery` are URL/text fields only. If uploads are ever introduced, this register must first be updated with: permitted formats, size caps, malware scan step, and storage origin allowlist (CSP `img-src`).

## Reviews

- All product reviews require a verified paid order on that product (server-side proof query + DB UNIQUE(product, order)). The platform writes no reviews, and sellers cannot edit ratings.

## Fees & pricing transparency

- Checkout totals are item-computed; no platform fee is added after the fact. Any future platform fee must appear in checkout math *before* payment and be documented here.
