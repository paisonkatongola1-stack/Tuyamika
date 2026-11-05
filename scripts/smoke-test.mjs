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

// 11 free tier still enforced (tino at 2 of 3)
const c = await api('POST', '/api/registries', { token: login.json.token, body: { name: 'Third registry', occasion: 'birthday', surprise: false } });
const c2 = await api('POST', '/api/registries', { token: login.json.token, body: { name: 'Fourth blocked', occasion: 'birthday', surprise: false } });
log('tino 3rd ok 4th blocked', `${c.status}/${c2.status}`, c.status === 201 && c2.status === 403);

const failed = results.filter((x) => !x.ok);
console.log('----');
console.log(`${results.length - failed.length}/${results.length} passed${failed.length ? `, failed: ${failed.map((f) => f.name).join(', ')}` : ''}`);
if (server) server.kill('SIGTERM');
if (runtimeDir) rmSync(runtimeDir, { recursive: true, force: true });
process.exit(failed.length ? 1 : 0);
