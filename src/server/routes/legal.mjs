import { Router } from 'express';
import { esc } from '../views/index.mjs';

// Server-rendered legal pages, linked from the console footer, guest pages,
// transactional email footer and the signup consent checkbox. Copy describes
// what the platform actually does — no unsupported claims, no dark patterns.

export const legalRouter = Router();

const BIZ = () => ({
  name: process.env.BUSINESS_NAME || 'Tuyamika',
  email: process.env.BUSINESS_EMAIL || 'support@tuyamika.co.zm',
  phone: process.env.BUSINESS_PHONE || '',
  address: process.env.BUSINESS_ADDRESS || 'Lusaka, Zambia',
  url: process.env.APP_PUBLIC_URL || 'https://tuyamika.co.zm',
});

const FOOT = (b) =>
  `<p class="muted">${esc(b.name)} — The Beauty of Giving, The Joy of Sharing<br>
${esc(b.address)} · <a href="mailto:${esc(b.email)}">${esc(b.email)}</a>${b.phone ? ` · <a href="tel:${esc(b.phone)}">${esc(b.phone)}</a>` : ''}<br>
<a href="/legal/privacy">Privacy Policy</a> · <a href="/legal/terms">Terms of Service</a> · <a href="/legal/refund">Refund Policy</a> · <a href="/legal/cookies">Cookie Policy</a></p>`;

function page(req, title, body) {
  const b = BIZ();
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — ${esc(b.name)}</title><link rel="stylesheet" href="/styles.css"></head>
<body><main class="card"><h1>${esc(title)}</h1>
${body}
${FOOT(b)}
</main></body></html>`;
}

legalRouter.get('/privacy', (req, res) => {
  const b = BIZ();
  res.type('html').send(page(req, 'Privacy Policy', `
<p><strong>Last updated:</strong> November 2026</p>
<p>${esc(b.name)} ("we") runs a gifting and celebration platform: wish registries, guest contributions, retailer products, event planning and related order fulfilment. This policy explains what personal data we collect, why, how long we keep it, and how you can delete it. Contact: ${esc(b.email)}, ${esc(b.address)}.</p>

<h2>What we collect</h2>
<ul>
<li><strong>Account data</strong> — name, email, optional phone, country, password (hashed — we never see or store your plaintext password), and role on the platform.</li>
<li><strong>Registry and event content</strong> — registry names, gift lists, messages, dates, photos you upload, and event logistics you choose to share with guests or committee members.</li>
<li><strong>Order data</strong> — items purchased or reserved, amounts, delivery address or contact details you give us for delivery, and the payment provider's transaction reference. <strong>We never receive or store your card details, bank credentials or Mobile Money PIN; payments run on the providers' own pages and sessions.</strong></li>
<li><strong>Support and error data</strong> — messages you send us, and technical error reports our software sends automatically (page, error description, session — not passwords) so faults can be fixed.</li>
<li><strong>Server logs</strong> — short-lived request logs (IP-derived rate-limit keys, timestamps) used for security and abuse prevention.</li>
</ul>

<h2>Why (lawful basis)</h2>
<ul>
<li>To run the services you ask for — accounts, registries, guest lists, orders, fulfilment (contract).</li>
<li>To keep the platform secure, rate-limit abuse, and process payments correctly (legitimate interest / obligations).</li>
<li>To send you parties' gift updates, order confirmations and receipts tied to actions you took (contract / legitimate interest), and marketing emails only if you consent.</li>
</ul>

<h2>Who receives data</h2>
<ul>
<li><strong>Payment providers</strong> (for example MTN MoMo, Airtel Money, EcoCash, when configured) — only receiving accounts and payment references needed to validate payment.</li>
<li><strong>Delivery providers / retailers</strong> — name, contact and delivery address when an order must reach you or a recipient.</li>
<li><strong>Our infrastructure providers</strong> — hosting, database and email delivery under contract.</li>
<li>Authorities, only where law requires it.</li>
<li>We do not sell personal data, and we do not embed advertising trackers.</li>
</ul>

<h2>Third-party SDKs</h2>
<p>The app optionally uses <strong>Firebase Authentication</strong> (Google) for sign-in. Firebase's client configuration uses a public app identifier — no private or administrative keys ship inside the app or the browser. When you use Google sign-in, Google handles your Google credentials under Google's own privacy terms; we receive your verified email and name only.</p>

<h2>Retention</h2>
<ul>
<li>Account data: kept while your account exists; tombstoned when you delete your account (see below).</li>
<li>Order/payment records: kept as anonymized financial records for accounting and fraud compliance.</li>
<li>Error reports and server logs: rolling windows (error ledger up to 200 entries; logs days not months).</li>
<li>Email addresses marked unsubscribed are kept only so we can honour your opt-out.</li>
</ul>

<h2>Your rights — how to act on this site</h2>
<ul>
<li><strong>Access &amp; portability:</strong> your profile, registries, and order history are visible in your authenticated session; ${esc(b.email)} exports machine-readable JSON on request.</li>
<li><strong>Data deletion:</strong> sign in and open the <em>Account</em> tab → <em>Delete my account and personal data</em>. This erases name, phone, password and sign-in bindings, removes registries and events you own, and tombstones the account row while keeping anonymized order records for accounting. This is permanent.</li>
<li><strong>Opt-out of marketing:</strong> every marketing email carries an <em>Unsubscribe</em> link (valid 90 days per newsletter) or email ${esc(b.email)} — see <a href="/legal/cookies">Cookie Policy</a> too.</li>
<li><strong>Correction:</strong> edit your profile in your account settings, or ask us.</li>
<li><strong>Verification / complaints:</strong> contact ${esc(b.email)}; you may also complain to your local data-protection supervisor.</li>
</ul>

<h2>Children</h2>
<p>${esc(b.name)} is not directed at children under 13; registry membership by guardians never collects child-specific records.</p>

<h2>Changes</h2>
<p>We will announce material changes on this page; the date above always names the current version.</p>
`));
});

legalRouter.get('/terms', (req, res) => {
  const b = BIZ();
  res.type('html').send(page(req, 'Terms of Service', `
<p><strong>Last updated:</strong> November 2026</p>
<p>By creating an account, reserving or buying a gift, listing a product, or managing an event on ${esc(b.name)}, you agree to these terms. If you do not agree, do not use the platform. Contact: ${esc(b.email)}, ${esc(b.address)}.</p>

<h2>Accounts</h2>
<ul>
<li>One account per person or business; you are responsible for activity under your credentials.</li>
<li>You must provide accurate registration details (name, country, contact).</li>
<li>Roles (customer, retailer/business owner, service provider, committee member, administrator) map to different permissions reserved elsewhere in the product; misrepresenting identity breaches these terms.</li>
</ul>

<h2>Buying, gifting, and orders</h2>
<ul>
<li><strong>Gift reservation:</strong> reserving an item holds it for a session-based window (set by the provider for your registry — typical${' '}<code>RESERVATION_TTL_MINUTES</code>). After expiry, an unreserved hold without payment lapses.</li>
<li><strong>Checkout:</strong> payment runs on the chosen provider's own flow (Mobile Money, card-on-file where offered). ${esc(b.name)} marks an order paid when the provider confirms, not before.</li>
<li><strong>Fulfilment:</strong> orders move through statuses (pending → paid → processing → dispatched → delivered/collected); either the retailer-brand or delivery provider carries actual delivery in your terms with that business.</li>
<li>Prices are set by the selling business in ${esc(b.address)}; the platform shows final total (items, delivery where applicable) before you pay — no hidden charges appear later.</li>
</ul>

<h2>Sellers' responsibilities</h2>
<ul>
<li>Only list products you are entitled to sell, with accurate titles, prices, stock and honest descriptions and photos.</li>
<li>Honour existing orders, deliveries and the sellers' own advertised refund terms.</li>
<li>Do not use the platform for fraud, counterfeit, restricted goods, or harassment of other members.</li>
</ul>

<h2>Events and committees</h2>
<ul>
<li>Event chairs, treasurers and secretaries use the platform's planning tools in trust for their committee; misuse (diverting contributors' gifts or funds) is also a legal matter beyond these terms.</li>
<li>Guest lists and photographs on public pages are the uploader's responsibility; only upload media you have the right to use, and only with consent of persons depicted.</li>
</ul>

<h2>Acceptable use</h2>
<ul>
<li>No scraping, hammering the API, automated account creation, spamming guests, or bypassing rate limits.</li>
<li>No attempts to reach other users' data: registries are shared deliberately via their ${'“'}Share${'”'} link only.</li>
</ul>

<h2>Fees</h2>
<p>${esc(b.name)} charges no blanket platform fee today. Where fees ever apply (special listings, promotions, delivery crews facilitated on-platform), they will be shown at checkout or in your seller dashboard before you commit — never applied silently. Payment processing fees are those of your Mobile Money or card provider; the provider is the only fee-taker.</p>

<h2>Reviews</h2>
<p>Hosted product reviews come from verified purchasers only; we do not write, buy or edit star ratings on behalf of sellers, and we remove incentivized or fake reviews we detect.</p>

<h2>Suspension and termination</h2>
<p>We may suspend accounts for fraud, abuse, illegal listings or security attacks; serious matters end in account deletion and we will meet our legal reporting duties (including law enforcement requests where valid). You may delete your own account at any time (see Privacy Policy).</p>

<h2>Disclaimers (realistic)</h2>
<ul>
<li>The platform is provided ${'“'}as is${'”'}. We try hard to correct errors reported to us but cannot promise the software will be bug-free, or that any specific payment provider or SMS gateway is currently connected — service availability is honest, silently degraded when credentials are not configured.</li>
<li>Sellers carry liability for their own products, descriptions and delivery performance.</li>
</ul>

<h2>Liability</h2>
<p>To the extent local law allows, ${esc(b.name)} is not liable for indirect or consequential loss (lost gifts, data sent to third parties by your own mistake, provider downtime). Nothing here limits liability we cannot lawfully limit.</p>

<h2>Law</h2>
<p>Disputes under these terms are governed by the laws of Zambia and resolved in the courts of ${esc(b.address)}, unless your local consumer law grants stronger protections.</p>
`));
});

legalRouter.get('/refund', (req, res) => {
  const b = BIZ();
  res.type('html').send(page(req, 'Refund Policy', `
<p><strong>Last updated:</strong> November 2026</p>
<p>This policy explains refunds on ${esc(b.name)} for two payer types: <strong>guests buying gifts</strong> from a registry, and <strong>retailers/service providers</strong> who receive or owe refunds on platform-facilitated orders. References below to "refund window" or "processing fee" are honoured exactly as written here — there are no other charges, and nothing on your dashboard can add them.</p>

<h2>Guest purchases (registry gifts)</h2>
<table class="table">
<tr><th>Order state</th><th>Refund?</th><th>How</th><th>Timing</th></tr>
<tr><td>Reserved, not yet paid</td><td>Nothing to refund</td><td>Reservation simply expires</td><td>At the reservation deadline (default 30 min; registry-specific overrides may apply)</td></tr>
<tr><td>Paid, not yet processing</td><td>Full refund on request</td><td>Email ${esc(b.email)} with the order reference shown on your checkout confirmation, or reply to the order-confirmation email</td><td>Provider rails (Mobile Money / card original rail), typically 3–7 business days after approval</td></tr>
<tr><td>Processing / dispatched</td><td>Disputed — coordinator review</td><td>Retailer logs for proof-of-packaging and dispatch event; refund granted if the true dispatch never occurred</td><td>Review within 5 business days, refund same rails 3–7 days if approved</td></tr>
<tr><td>Delivered</td><td>Per the seller's advertised returns terms on the product page</td><td>Direct with seller, with platform-ordered evidence (photos, delivery receipt)</td><td>Per seller's stated window; platform caps inactivity at 30 days from 'delivered'</td></tr>
<tr><td>Delivered but wrong, damaged, or 'surprise' rules broken by the seller</td><td>Full refund back</td><td>Raise through ${esc(b.email)}; platform-side refund decision within 5 business days</td><td>3–7 business days on original rails</td></tr>
</table>
<p>The registry owner's event may also carry its own guideline (for example, ${'“'}no gift returns before the event${'”'}); that contingency is shown on the registry page before you pay, so any consent happened before checkout.</p>

<h2>Seller refunds (retailer/service provider funds)</h2>
<ul>
<li>If a paid order is cancelled before fulfilment by the seller, the seller must issue the guest's full refund; ${esc(b.name)} does not retain a fee on cancelled orders.</li>
<li>Platform subscription/promotion fees (when introduced) refund pro-rata for cancelled service periods where the seller did not breach these terms.</li>
</ul>

<h2>Ways we return money</h2>
<ul>
<li><strong>Original payment rails only:</strong> the same Mobile Money number or card the charge came from. We cannot redirect refunds to a new account — this is the fraud-prevention standard the payment providers require.</li>
<li>When a provider hasn't connected its refund endpoint yet, refunds are logged and sent manually from our side; if a channel genuinely cannot refund, we pay out by pre-agreed alternative supported by the recipient account in writing.</li>
</ul>

<h2>Exceptions / non-refundable</h2>
<ul>
<li>Per-recipient customized items (a cake with a specific name, photo frames where material production began) refund only in part, and only the platform fee — never a full amount once the seller shows production started.</li>
<li>Non-payment failure due to provider session abandonment: reservation expires, no charge occurred, nothing to refund.</li>
<li>Accounts acting in fraud (misrepresented identities, collusive cancellation chains) have refunds withheld pending investigation under our terms and anti-fraud duties.</li>
</ul>

<h2>How to raise it</h2>
<ol>
<li>Email ${esc(b.email)} with the order reference (on the checkout confirmation page, styled <code>tuy...</code>).</li>
<li>Describe what went wrong, attach photos if relevant, state whether you want a refund, replacement or store credit.</li>
<li>We acknowledge within 2 business days and commit a decision within 5.</li>
</ol>
<p>Refund questions ever unresolved? Follow your payment provider's dispute channel (Mobile Money statement, card issuer) — banks and MNOs can force reversals through chargeback and reversal rules we honour.</p>
`));
});

legalRouter.get('/cookies', (req, res) => {
  const b = BIZ();
  res.type('html').send(page(req, 'Cookie Policy', `
<p><strong>Last updated:</strong> November 2026</p>
<p>${esc(b.name)} uses <em>minimal</em> browser storage — no third-party trackers, no ad pixels, no fingerprinting scripts. This page lists every stored key in the browser and why.</p>

<h2>Storage in the browser (first-party only)</h2>
<table class="table">
<tr><th>Key</th><th>Type</th><th>Purpose</th><th>Lifetime</th><th>Removal</th></tr>
<tr><td><code>tuyamika.token</code> (session storage)</td><td>auth token (JWT)</td><td>Keeps you signed in for this tab's session. Not a cookie — sent as an <code>Authorization: Bearer</code> fragment to our own API only.</td><td>Closed with the tab</td><td>Sign out</td></tr>
<tr><td><code>tuyamika.token</code> (local storage)</td><td>auth token (JWT)</td><td>Only written when you ticked <em>Keep me signed in</em>. Never persisted by default.</td><td>Until you sign out</td><td>Sign out, or the account menu</td></tr>
<tr><td><code>tuyamika.remember</code></td><td>flag "0"/"1"</td><td>Remembers which storage to load your token from on next visit.</td><td>Until changed</td><td>Sign out</td></tr>
<tr><td><code>tuyamika.cookieconsent</code></td><td>"accepted"/"declined"</td><td>Records your banner choice so the banner does not re-appear on every visit.</td><td>Until you clear it or 12 months</td><td><em>Cookie settings</em> in the console footer</td></tr>
</table>

<h2>Cookies actually set by HTTP (headers)</h2>
<p>None today. Sessions are token-based, not cookie-based, which avoids cross-site CSRF by design. If a future feature requires a cookie (for example an anti-bot challenge), it will be added here and you will be asked again in the banner.</p>

<h2>Third-party / subresource count</h2>
<p>The console loads <strong>no</strong> external JavaScript, CSS or image CDNs: all assets are served from our own origin, which the Content-Security-Policy header enforces. If you sign in with Google (Firebase Authentication), Google's own dialog sets its cookies under Google's policies on that popup only.</p>

<h2>Consent</h2>
<p>On first console visit you will see a banner: <em>Accept</em> (keeps the conveniences above — remembering "Keep me signed in", your remembered registry share sheet) or <em>Reject</em> (uses only strictly necessary session storage, and "Keep me signed in" is disabled). You can change your choice any time from the footer link <em>Cookie settings</em>, or by clearing site data in your browser.</p>

<h2>Do-not-track / GPC</h2>
<p>We honour browser <code>Do Not Track</code> and <code>Sec-GPC</code> signals by treating them as <em>Decline</em> on your first visit — no hidden nags, no face re-asks since banners remember, unless storage was cleared.</p>
`));
});

legalRouter.use((req, res) => {
  res.status(404).send(page(req, 'Not found', `<p>No such policy page.</p>`));
});
