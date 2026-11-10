#!/usr/bin/env node
// End-to-end smoke test. By default spawns its own disposable server on a scratch port so
// rate limiters and secrets stay deterministic; sets BASE_URL to reuse an existing server.
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import process from 'node:process';

const external = process.env.BASE_URL || '';
const B = external || `http://localhost:${process.env.SMOKE_PORT || 3199}`;

let server = null;
let runtimeDir = null;

async function startScratchServer() {
  runtimeDir = mkdtempSync(join(tmpdir(), 'tuyamika-smoke-'));
  const port = +B.split(':').pop();
  const seeded = spawnSync(process.execPath, [resolve(process.cwd(), 'scripts/seed-demo.mjs'), '--force'], {
    stdio: 'inherit',
    env: { ...process.env, DATA_DIR: runtimeDir },
  });
  if (seeded.status !== 0) {
    console.error('seed --force failed; cannot run smoke test');
    process.exit(1);
  }
  server = spawn(process.execPath, [resolve(process.cwd(), 'bin/server.mjs')], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: String(port),
      JWT_SECRET: 'smoke-only-secret',
      DATA_DIR: runtimeDir,
      RL_AUTH_MAX: '100000',
      RL_GUEST_MAX: '100000',
      RL_PAY_MAX: '100000',
      FIREBASE_PROJECT_ID: '',
      FIREBASE_CLIENT_EMAIL: '',
      FIREBASE_PRIVATE_KEY: '',
    },
  });
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 250));
    try {
      const probe = await fetch(`${B}/healthz`);
      if (probe.ok) return;
    } catch { /* retry */ }
  }
  server.kill('SIGTERM');
  throw new Error('scratch smoke server failed to become healthy');
}

if (!external) {
  await startScratchServer();
}

const results = [];
function log(name, probe, ok) {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} :: ${typeof probe === 'object' ? JSON.stringify(probe) : probe}`);
}
async function api(method, path, { token, headers = {}, body } = {}) {
  const res = await fetch(B + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch {
    json = null;
  }
  return { status: res.status, json, raw: text };
}

// 1 signup + verify stub
let r = await api('POST', '/api/auth/signup', { body: { email: 'own@t.test', password: 'password123', full_name: 'Test Owner' } });
if (r.status === 400) r = await api('POST', '/api/auth/signup', { body: { email: 'own@t.test', password: 'password123', full_name: 'Test Owner', consent: true } });
if (r.status === 409) r = await api('POST', '/api/auth/login', { body: { email: 'own@t.test', password: 'password123' } });
const ownerToken = r.json.token;
log('signup ok', r.status, !!ownerToken && r.status === 201);
const verifyUrl = r.json.stubs?.verification?.match(/GET (\/api\/auth\/verify\/[A-Za-z0-9_.\-/]+)/)?.[1];
if (verifyUrl) {
  const sessionAsVerify = await api('GET', '/api/registries', { token: r.json.token });
  const v = await api('GET', verifyUrl);
  if (v.status !== 200) console.error('verify failed status', v.status, 'body', v.raw, 'verifyUrl was', verifyUrl);
  log('verify stub flips verified', v.status, v.json.ok === true && sessionAsVerify.status === 200);
}

// 2 free tier: 3 ok, 4th blocked
for (let i = 0; i < 3; i++) {
  const c = await api('POST', '/api/registries', { token: ownerToken, body: { name: `Gift Drive ${i}`, occasion: 'birthday', surprise: false } });
  log(`create registry #${i + 1}`, c.status, c.status === 201);
}
const blocked = await api('POST', '/api/registries', { token: ownerToken, body: { name: 'Too many', occasion: 'birthday' } });
log('4th registry blocked (free tier)', blocked.status, blocked.status === 403);

// 3 seeded share page
const shareToken = 'demo-share-2026';
const shareReg = await api('GET', `/api/r/${shareToken}`);
if (shareReg.status !== 200) {
  console.error('guest share fetch failed with status', shareReg.status, 'body:', JSON.stringify(shareReg).slice(0, 300));
  process.exit(1);
}
const seedItems = shareReg.json.registry.items;
log('guest sees seeded share page', shareReg.status, shareReg.status === 200 && seedItems.length === 3 && seedItems.every((i) => i.status === 'available'));
const item = seedItems[0];

// 4 reserve
const fbCfg = await api('GET', '/api/auth/firebase-config');
log('firebase config disabled by default', fbCfg.status, fbCfg.status === 200 && fbCfg.json.enabled === false);
const fb = await api('POST', '/api/auth/firebase', { body: { id_token: 'smoke-fake-id-token' } });
log('firebase exchange unconfigured -> 503', fb.status, fb.status === 503);
const sess = 'sess-guest-demo-0001';
const t = Date.now();
const idemReserve = `idem-reserve-${t}`;
const resv = await api('POST', `/api/r/${shareToken}/reservations`, { body: { session_token: sess, registry_item_id: item.id, idempotency_key: idemReserve } });
log('reserve ok', resv.status, resv.status === 201 && resv.json.reservation.status === 'pending');
const again = await api('POST', `/api/r/${shareToken}/reservations`, { body: { session_token: sess, registry_item_id: item.id, idempotency_key: idemReserve } });
log('duplicate reservation idempotent replay', again.status, again.status === 200 && again.json.deduped);
const otherGuest = await api('POST', `/api/r/${shareToken}/reservations`, { body: { session_token: 'sess-other-00000002', registry_item_id: item.id, idempotency_key: `idem-other-${t}` } });
log('second reservation blocked (item locked)', otherGuest.status, otherGuest.status === 409);

// 5 checkout
const idemCk = `idem-ck-${t}`;
const ck = await api('POST', `/api/r/${shareToken}/checkout`, { body: { session_token: sess, idempotency_key: idemCk } });
log('checkout pending order', ck.status, ck.status === 201 && ck.json.order.status === 'pending');
const ck2 = await api('POST', `/api/r/${shareToken}/checkout`, { body: { session_token: sess, idempotency_key: idemCk } });
log('checkout idempotent replay', ck2.status, ck2.status === 200 && ck2.json.deduped === true);

// 6 payment stub settle
const pay = await api('POST', '/api/pay/simulate', { body: { payment_ref: ck.json.payment.payment_ref } });
log('payment settled -> paid', pay.status, pay.json.order?.status === 'paid');
const pay2 = await api('POST', '/api/pay/simulate', { body: { payment_ref: ck.json.payment.payment_ref } });
log('payment replay dedupes', pay2.status, pay2.json.deduped === true && pay2.json.order.status === 'paid');

// 7 webhook secret + dedupe
const whNo = await api('POST', '/api/webhook/payment', { body: { order_id: ck.json.order.id, event_id: 'evt-dup-test', type: 'payment.succeeded' } });
log('webhook rejected without secret', whNo.status, whNo.status === 401);
const whOk = await api('POST', '/api/webhook/payment', { headers: { 'x-webhook-secret': 'dev-webhook-secret' }, body: { order_id: ck.json.order.id, event_id: 'evt-dup-test', type: 'payment.succeeded' } });
log('webhook first delivery ok', whOk.status, whOk.json.ok === true);
const whOk2 = await api('POST', '/api/webhook/payment', { headers: { 'x-webhook-secret': 'dev-webhook-secret' }, body: { order_id: ck.json.order.id, event_id: 'evt-dup-test', type: 'payment.succeeded' } });
log('webhook replay seen event dedupes', whOk2.status, whOk2.json.deduped === true);

// 8 guest page reflects purchased
const after = await api('GET', `/api/r/${shareToken}`);
const afterItem = after.json.registry.items.find((i) => i.id === item.id);
log('item purchased after payment', afterItem.status, afterItem.status === 'purchased');

// 9 owner learns via notification (seed registry surprise=0)
const login = await api('POST', '/api/auth/login', { body: { email: 'tino@example.com', password: 'owner-demo-2026' } });
const notifs = await api('GET', '/api/notifications', { token: login.json.token });
log('owner notified about purchase', notifs.status, notifs.json.notifications.some((n) => n.trigger === 'order.paid'));

// 10 surprise registry end to end
const reg2 = await api('POST', '/api/registries', { token: login.json.token, body: { name: 'Rose 60th', occasion: 'birthday', surprise: true } });
const reg2id = reg2.json.registry?.id;
log('surprise registry created', reg2.status, reg2.status === 201 && !!reg2id);

const addItem = await api('POST', `/api/registries/${reg2id}/items`, { token: login.json.token, body: { product_id: seedItems[1].product_id, quantity: 1 } });
log('item added to surprise registry', addItem.status, addItem.status === 201);

const publish = await api('PATCH', `/api/registries/${reg2id}`, { token: login.json.token, body: { status: 'published' } });
const share2 = publish.json.registry.share_token;
log('surprise registry published', publish.status, publish.status === 200 && publish.json.registry.status === 'published');

const sess2 = 'sess-guest-surprise-01';
const resv2 = await api('POST', `/api/r/${share2}/reservations`, { body: { session_token: sess2, registry_item_id: addItem.json.item.id, idempotency_key: `idem-sur-${t}` } });
log('surprise reserve ok', resv2.status, resv2.status === 201);
const ckS = await api('POST', `/api/r/${share2}/checkout`, { body: { session_token: sess2, idempotency_key: `idem-sck-${t}` } });
const payS = await api('POST', '/api/pay/simulate', { body: { payment_ref: ckS.json.payment.payment_ref } });
log('surprise payment ok', payS.status, payS.json.order?.status === 'paid');

const notifs2 = await api('GET', '/api/notifications', { token: login.json.token });
const surpriseLeak = notifs2.json.notifications.filter((n) => n.trigger === 'order.paid').filter((n) => n.message.includes('Zamani')).length;
log('no notification leaks surprise purchase', surpriseLeak, surpriseLeak === 0);

const mine = await api('GET', `/api/registries/${reg2id}`, { token: login.json.token });
const mineItem = mine.json.items[0];
log('owner view hides giver on surprise', mineItem, mineItem.purchased_by === null && mineItem.purchased_at === null && mineItem.status === 'purchased');

// 11 free tier still enforced (fresh user so the limit count is deterministic)
const limUser = await api('POST', '/api/auth/signup', { body: { email: `limit-${t}@t.test`, password: 'password123', full_name: 'Limit Demo', consent: true } });
const limTok = limUser.json?.token;
log('limit user signup', limUser.status, !!limTok);
const c1 = await api('POST', '/api/registries', { token: limTok, body: { name: 'Limit one', occasion: 'birthday' } });
const c2 = await api('POST', '/api/registries', { token: limTok, body: { name: 'Limit two', occasion: 'birthday' } });
const c3 = await api('POST', '/api/registries', { token: limTok, body: { name: 'Limit three', occasion: 'birthday' } });
const c4 = await api('POST', '/api/registries', { token: limTok, body: { name: 'Limit four', occasion: 'birthday' } });
log('third registry ok, fourth blocked', `${c3.status}/${c4.status}`, c1.status === 201 && c2.status === 201 && c3.status === 201 && c4.status === 403);

// 12 profile update via PATCH /api/auth/me
const mePatch = await api('PATCH', '/api/auth/me', { token: login.json.token, body: { full_name: 'Tino Owner Demo', phone: '260970000111', country: 'ZM' } });
log('PATCH /me updates profile', `${mePatch.status}`, mePatch.status === 200 && mePatch.json.user.full_name === 'Tino Owner Demo' && mePatch.json.user.phone === '260970000111');
const meBad = await api('PATCH', '/api/auth/me', { token: login.json.token, body: { country: 'ZZ' } });
log('PATCH /me rejects bad country', meBad.status, meBad.status === 400);
const meAnon = await api('PATCH', '/api/auth/me', { body: { full_name: 'x' } });
log('PATCH /me requires auth', meAnon.status, meAnon.status === 401);

// 13 seeded logins for privileged checks
const adminLogin = await api('POST', '/api/auth/login', { body: { email: 'admin@tuyamika.app', password: 'admin-demo-2026' } });
const retailerLogin = await api('POST', '/api/auth/login', { body: { email: 'zulwazi@crafts.africa', password: 'retail-demo-2026' } });
log('admin + retailer logins', `${adminLogin.status}/${retailerLogin.status}`, adminLogin.status === 200 && retailerLogin.status === 200);

// 14 specials (vendor promos)
const spec = await api('GET', '/api/specials');
log('specials public list', spec.status, spec.status === 200 && spec.json.specials.length >= 2);

const productsOut = await api('GET', '/api/products');
log('public products list', productsOut.status, productsOut.status === 200 && productsOut.json.products.length >= 2);
const plainProduct = productsOut.json.products.find((x) => x.title === 'Shweshwe print fabric bundle');
const specCr = await api('POST', '/api/specials', { token: retailerLogin.json.token, body: { product_id: plainProduct?.id, discount_pct: 10, tag: 'Loved' } });
log('retailer creates promo', specCr.status, specCr.status === 201);


// 14 events + RSVP + tasks
const ev = await api('POST', '/api/events', { token: login.json.token, body: { name: 'Bridal Shower', event_date: '2027-03-01', location: 'Lusaka', budget_cents: 8000 } });
const evId = ev.json.event?.id;
log('event created', ev.status, ev.status === 201 && !!evId);
const rsvp = await api('POST', `/api/events/${evId}/rsvp`, { token: login.json.token, body: { status: 'going', guests: 2 } });
log('rsvp recorded', rsvp.status, rsvp.status === 200 && rsvp.json.event.guest_count === 3);
const task = await api('POST', `/api/events/${evId}/tasks`, { token: login.json.token, body: { title: 'Confirm catering', priority: 'high' } });
const taskId = task.json.task?.id;
log('event task created', task.status, task.status === 201 && !!taskId);
const taskDone = await api('PATCH', `/api/events/${evId}/tasks/${taskId}`, { token: login.json.token, body: { status: 'done' } });
log('task marked done', taskDone.status, taskDone.status === 200 && taskDone.json.task.status === 'done');

// 15 product reviews (verified buyer only)
const revDeny = await api('POST', `/api/products/${seedItems[0].product_id}/reviews`, { token: login.json.token, body: { rating: 5 } });
log('review needs purchase', revDeny.status, revDeny.status === 403);

const pillow = productsOut.json.products.find((x) => x.title === 'Ndebele pattern throw pillow');
const revOk = await api('POST', `/api/products/${pillow?.id}/reviews`, { token: login.json.token, body: { rating: 5, title: 'Lovely', body: 'Arrived quickly.' } });
log('review posted (verified buyer)', revOk.status, revOk.status === 201);
const revDup = await api('POST', `/api/products/${pillow?.id}/reviews`, { token: login.json.token, body: { rating: 4 } });
log('duplicate review blocked', revDup.status, revDup.status === 409);
const revList = await api('GET', `/api/products/${pillow?.id}/reviews`);
log('reviews public list', revList.status, revList.status === 200 && revList.json.reviews.length === 1);

// 16 tracker + fulfilment pipeline (paid -> processing -> dispatched -> delivered)
const track = await api('GET', '/api/orders/track/demo-paid-ref-2026');
log('track seeded paid order', track.status, track.status === 200 && track.json.order?.status === 'paid' && !!track.json.fulfilment);

const ffList = await api('GET', '/api/fulfilment', { token: adminLogin.json.token });
const ffRec = ffList.json.orders.find((o) => o.id === track.json.order?.id)?.fulfilment;
log('fulfilment record visible to admin', ffRec?.status, !!ffRec);

const ffBad = await api('PATCH', `/api/fulfilment/${ffRec.id}`, { token: adminLogin.json.token, body: { order_status: 'delivered' } });
log('skip transition rejected', ffBad.status, ffBad.status === 409);
const ffProc = await api('PATCH', `/api/fulfilment/${ffRec.id}`, { token: adminLogin.json.token, body: { order_status: 'processing', wrapping: true } });
log('processing transition ok', ffProc.status, ffProc.status === 200 && ffProc.json.status === 'processing' && ffProc.json.fulfilment.wrapping === true);
const ffDisp = await api('PATCH', `/api/fulfilment/${ffRec.id}`, { token: adminLogin.json.token, body: { order_status: 'dispatched' } });
log('dispatched ok', ffDisp.status, ffDisp.status === 200 && ffDisp.json.status === 'dispatched');
const trackAfter = await api('GET', '/api/orders/track/demo-paid-ref-2026');
log('track shows fulfilment status', trackAfter.status, trackAfter.status === 200 && trackAfter.json.order?.status === 'dispatched');

const ffRetail = await api('GET', '/api/fulfilment', { token: retailerLogin.json.token });
log('retailer sees own fulfilment rows', ffRetail.status, ffRetail.status === 200 && ffRetail.json.orders.length >= 2);

// 17 payment provider surface (stub default)
const provs = await api('GET', '/api/pay/providers');
log('provider info stub default', provs.status, provs.status === 200 && provs.json.selected === 'stub');
const payGate = await api('POST', '/api/pay/status/demo-paid-ref-2026');
log('pay status gate 503 on stub', payGate.status, payGate.status === 503);

// 18 error ledger (client reports + admin surface)
const badReport = await api('POST', '/api/client-errors', { body: {} });
log('client error report validation', badReport.status, badReport.status === 400);
const rep1 = await api('POST', '/api/client-errors', { body: { message: 'Console smoke fault', page: '/#/orders' } });
log('client error report accepted', rep1.status, rep1.status === 202);
const errList = await api('GET', '/api/admin/errors', { token: adminLogin.json.token });
log('admin sees error ledger', errList.status, errList.status === 200 && errList.json.errors.some((e) => e.source === 'client' && e.message === 'Console smoke fault'));
const errNoAuth = await api('GET', '/api/admin/errors');
log('error ledger admin only', errNoAuth.status, errNoAuth.status === 401);
const clr1 = await api('DELETE', '/api/admin/errors', { token: adminLogin.json.token });
const clr2 = await api('DELETE', '/api/admin/errors', { token: adminLogin.json.token });
log('error ledger clear', `${clr1.status}/${clr2.status}`, clr1.status === 200 && clr2.status === 200);

// 19 privacy/legal/compliance surface
const legalPage = await api('GET', '/legal/privacy');
log('privacy policy page', legalPage.status, legalPage.status === 200 && /Privacy Policy/.test(legalPage.raw) && /data deletion/i.test(legalPage.raw));
const legalTerms = await api('GET', '/legal/terms');
log('terms of service page', legalTerms.status, legalTerms.status === 200 && /Terms of Service/.test(legalTerms.raw) && /no hidden charges/i.test(legalTerms.raw));
const legalRefund = await api('GET', '/legal/refund');
log('refund policy page', legalRefund.status, legalRefund.status === 200 && /Refund Policy/.test(legalRefund.raw));
const legalCookies = await api('GET', '/legal/cookies');
log('cookie policy page', legalCookies.status, legalCookies.status === 200 && /tuyamika.cookieconsent/.test(legalCookies.raw));
const legal404 = await api('GET', '/legal/nope');
log('legal 404 styled', legal404.status, legal404.status === 404);

const csp = await fetch(`${B}/`).then((x) => x.headers);
log('security headers on page', csp.get('content-security-policy') ? 'present' : 'missing', !!csp.get('content-security-policy'));
const hsts = csp.get('strict-transport-security');
log('hsts header', hsts || 'missing', !!hsts);

const noConsent = await api('POST', '/api/auth/signup', { body: { email: `noconsent-${t}@t.test`, password: 'password123', full_name: 'No Consent', consent: false } });
log('signup requires consent', noConsent.status, noConsent.status === 400);
const honey = await api('POST', '/api/auth/signup', { body: { email: `bot-${t}@t.test`, password: 'password123', full_name: 'Bot', consent: true, hp: 'bot-filled-me' } });
log('honeypot blocks bot signup', honey.status, honey.status === 400);

// private event is invite-only now (RSVP IDOR regression test)
const privEv = await api('POST', '/api/events', { token: ownerToken, body: { name: 'Private surprise dinner', visibility: 'private' } });
const privId = privEv.json.event?.id;
const outsider = await api('POST', '/api/auth/signup', { body: { email: `out-${t}@t.test`, password: 'password123', full_name: 'Outsider', consent: true } });
const outsiderTok = outsider.json.token;
const privRsvp = await api('POST', `/api/events/${privId}/rsvp`, { token: outsiderTok, body: { status: 'going' } });
log('private event rsvp rejected (invite-only)', privRsvp.status, privRsvp.status === 403);
const pubEv = await api('POST', '/api/events', { token: ownerToken, body: { name: 'Public fundraiser', visibility: 'unlisted' } });
const pubId = pubEv.json.event?.id;
const pubRsvp = await api('POST', `/api/events/${pubId}/rsvp`, { token: outsiderTok, body: { status: 'maybe', guests: 1 } });
log('unlisted event rsvp open', pubRsvp.status, pubRsvp.status === 200);

// unsubscribe route: garbage token rejected (valid-token path exercised by notifier end-to-end when SMTP configured)
const unsubBad = await api('GET', '/api/auth/unsubscribe/garbage.token');
log('unsubscribe rejects bad token', unsubBad.status, unsubBad.status === 400);

// data deletion: create + own registry, then delete account
const delUser = await api('POST', '/api/auth/signup', { body: { email: `del-${t}@t.test`, password: 'password123', full_name: 'Doomed Account', consent: true } });
const delTok = delUser.json.token;
await api('POST', '/api/registries', { token: delTok, body: { name: 'Doomed Registry', occasion: 'wedding' } });
const del = await api('DELETE', '/api/auth/account', { token: delTok });
log('account deletion accepted', del.status, del.status === 200 && /nonymized/.test(del.json.kept || ''));
const delAfter = await api('GET', '/api/auth/me', { token: delTok });
log('deleted account tombstoned (name/email gone)',
  `${delAfter.status} ${delAfter.json.user?.email || ''}`,
  delAfter.status === 200 && /deleted-.*@tombstone\.invalid/.test(delAfter.json.user?.email || '') && delAfter.json.user?.full_name === 'Deleted user');
const delReg = await api('GET', '/api/registries', { token: delTok });
log('owned registries erased at deletion', `${delReg.json.registries?.length}`, delReg.json.registries?.length === 0);

// 20 quoted service booking (milestone 4)
// provider login from seed
const provLogin = await api('POST', '/api/auth/login', { body: { email: 'busi@events.africa', password: 'events-demo-2026' } });
const provTok = provLogin.json.token;
const bizList = await api('GET', '/api/retailer/businesses', { token: provTok });
const svcBiz = bizList.json.businesses?.find((b) => b.type === 'service_provider');
const qBad = await api('POST', '/api/quotes', { token: ownerToken, body: { provider_id: svcBiz?.id, event_type: 'wedding catering', requirements: '100 guests, outdoor' } });
log('quote created (customer)', qBad.status, qBad.status === 201 && qBad.json.quote?.status === 'pending');
const qDup = await api('POST', '/api/quotes', { token: ownerToken, body: { provider_id: svcBiz?.id, event_type: 'wedding catering', requirements: 'dup' } });
log('duplicate open quote blocked', qDup.status, qDup.status === 409);
const qNoAuth = await api('POST', '/api/quotes', { body: { provider_id: svcBiz?.id, event_type: 'x', requirements: 'x' } });
log('quote requires auth', qNoAuth.status, qNoAuth.status === 401);
const qListProv = await api('GET', '/api/quotes', { token: provTok });
log('provider sees request (pending)', qListProv.status, (qListProv.json.quotes || []).some((x) => x.id === qBad.json.quote?.id));
const qDetail = await api('GET', `/api/quotes/${qBad.json.quote?.id}`, { token: provTok });
log('provider view flips pending->viewed', qDetail.status, qDetail.json.quote?.status === 'viewed');
const qResp = await api('POST', `/api/quotes/${qBad.json.quote?.id}/response`, { token: provTok, body: { price_cents: 250000, message: 'Full catering + decor package' } });
log('provider responds', qResp.status, qResp.status === 200 && qResp.json.quote?.status === 'responded');
const qRespMoney = JSON.parse(qResp.json.quote?.response || '{}');
log('response carries quoted price', qRespMoney.price_cents, qRespMoney.price_cents === 250000);
const qNotif = await api('GET', '/api/notifications', { token: ownerToken });
log('customer notified of response', qNotif.status, (qNotif.json.notifications || []).some((n) => n.trigger === 'quote.responded'));
const qAcceptByProv = await api('POST', `/api/quotes/${qBad.json.quote?.id}/accept`, { token: provTok });
log('provider cannot accept own quote', qAcceptByProv.status, qAcceptByProv.status === 403);
const qAccept = await api('POST', `/api/quotes/${qBad.json.quote?.id}/accept`, { token: ownerToken });
log('customer accepts quote', qAccept.status, qAccept.status === 200 && qAccept.json.quote?.status === 'accepted');
const qAgain = await api('POST', `/api/quotes/${qBad.json.quote?.id}/response`, { token: provTok, body: { price_cents: 1 } });
log('closed quote immutable', qAgain.status, qAgain.status === 409);
const qDecline = await api('POST', '/api/quotes', { token: ownerToken, body: { provider_id: svcBiz?.id, event_type: 'photography', requirements: '2 shooters' } });
await api('POST', `/api/quotes/${qDecline.json.quote?.id}/response`, { token: provTok, body: { price_cents: 90000 } });
const qDecl = await api('POST', `/api/quotes/${qDecline.json.quote?.id}/accept?decision=declined`, { token: ownerToken });
log('decline path works', qDecl.status, qDecl.status === 200 && qDecl.json.quote?.status === 'declined');
const qOtherUser = await api('POST', '/api/auth/signup', { body: { email: `othq-${t}@t.test`, password: 'password123', full_name: 'Quote Snooper', consent: true } });
const qSnoop = await api('GET', `/api/quotes/${qBad.json.quote?.id}`, { token: qOtherUser.json.token });
log('foreign quote invisible', qSnoop.status, qSnoop.status === 404);

const failed = results.filter((x) => !x.ok);


console.log('----');
console.log(`${results.length - failed.length}/${results.length} passed${failed.length ? `, failed: ${failed.map((f) => f.name).join(', ')}` : ''}`);
if (server) server.kill('SIGTERM');
if (runtimeDir) rmSync(runtimeDir, { recursive: true, force: true });
process.exit(failed.length ? 1 : 0);
