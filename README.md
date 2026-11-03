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
