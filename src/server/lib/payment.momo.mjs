import { fail, uid, now } from './db.mjs';

// Mobile-money provider adapters. Selected via PAYMENT_PROVIDER env:
//   stub | momo | airtel | ecocash
// Every adapter exposes the same interface:
//   enabled() -> bool
//   info()    -> { name, enabled, missing: [...] }   for GET /api/pay/providers
//   async createIntent({ order_id, amount_cents, currency, payer_phone }) ->
//     { payment_ref, provider, raw }
//   async checkIntent(payment_ref) -> { status: 'pending' | 'paid' | 'failed', raw }
//
// Nothing talks to a live network without credentials set; unconfigured adapters
// throw 503 exactly like firebase.mjs so smoke tests can prove the fallback.

const timeoutFetch = async (url, options = {}, ms = 25000) => {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { signal: ctl.signal, ...options });
  } finally {
    clearTimeout(timer);
  }
};

const requireEnv = (keys) => {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length) throw fail(503, `payment provider not configured (missing ${missing.join(', ')})`);
};
const msisdn = (phone) => {
  const digits = String(phone || '').replace(/[^\d]/g, '');
  if (digits.length < 9) throw fail(400, 'valid payer phone (MSISDN) required for mobile money');
  return digits;
};

// --- MTN MoMo Collections -----------------------------------------------------
const momoEnabled = () => !!(process.env.MOMO_SUBSCRIPTION_KEY && process.env.MOMO_API_USER && process.env.MOMO_API_KEY);
const momoMissing = () =>
  ['MOMO_SUBSCRIPTION_KEY', 'MOMO_API_USER', 'MOMO_API_KEY'].filter((k) => !process.env[k]);

async function momoToken() {
  requireEnv(momoMissing());
  const base = process.env.MOMO_BASE_URL || 'https://sandbox.momodeveloper.mtn.com';
  const auth = Buffer.from(`${process.env.MOMO_API_USER}:${process.env.MOMO_API_KEY}`).toString('base64');
  const res = await timeoutFetch(`${base}/collection/token/`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Ocp-Apim-Subscription-Key': process.env.MOMO_SUBSCRIPTION_KEY,
      'Cache-Control': 'no-cache',
    },
  });
  if (!res.ok) throw fail(502, `momo token request failed (${res.status})`);
  return (await res.json()).access_token;
}

const momoInfo = () => ({ name: 'momo', enabled: momoEnabled(), missing: momoEnabled() ? [] : momoMissing() });

async function momoCreate({ order_id, amount_cents, currency, payer_phone }) {
  requireEnv(momoMissing());
  const base = process.env.MOMO_BASE_URL || 'https://sandbox.momodeveloper.mtn.com';
  const token = await momoToken();
  const payment_ref = uid();
  const res = await timeoutFetch(`${base}/collection/v1_0/requesttopay`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Reference-Id': payment_ref,
      'X-Target-Environment': process.env.MOMO_TARGET_ENV || 'sandbox',
      'Ocp-Apim-Subscription-Key': process.env.MOMO_SUBSCRIPTION_KEY,
      'Content-Type': 'application/json',
      ...(process.env.MOMO_CALLBACK_URL ? { 'X-Callback-Url': process.env.MOMO_CALLBACK_URL } : {}),
    },
    body: JSON.stringify({
      amount: (amount_cents / 100).toFixed(2),
      currency: currency || process.env.MOMO_CURRENCY || 'ZMW',
      externalId: order_id,
      payer: { partyIdType: 'MSISDN', partyId: msisdn(payer_phone) },
      payerMessage: 'Tuyamika gift purchase',
      payeeNote: `order ${order_id}`,
    }),
  });
  if (res.status !== 202) {
    const text = await res.text();
    throw fail(502, `momo requesttopay rejected (${res.status})${text ? `: ${text.slice(0, 140)}` : ''}`);
  }
  return { payment_ref, provider: 'momo', raw: { ref: payment_ref } };
}

async function momoCheck(payment_ref) {
  requireEnv(momoMissing());
  const base = process.env.MOMO_BASE_URL || 'https://sandbox.momodeveloper.mtn.com';
  const token = await momoToken();
  const res = await timeoutFetch(`${base}/collection/v1_0/requesttopay/${payment_ref}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Target-Environment': process.env.MOMO_TARGET_ENV || 'sandbox',
      'Ocp-Apim-Subscription-Key': process.env.MOMO_SUBSCRIPTION_KEY,
    },
  });
  if (res.status === 404) return { status: 'failed', raw: null };
  if (!res.ok) throw fail(502, `momo status check failed (${res.status})`);
  const body = await res.json();
  const map = { SUCCESSFUL: 'paid', FAILED: 'failed', PENDING: 'pending' };
  return { status: map[body.status] || 'pending', raw: body };
}

// --- Airtel Money (Merchant Payments) -----------------------------------------
const airtelEnabled = () => !!(process.env.AIRTEL_CLIENT_ID && process.env.AIRTEL_CLIENT_SECRET);
const airtelMissing = () => ['AIRTEL_CLIENT_ID', 'AIRTEL_CLIENT_SECRET'].filter((k) => !process.env[k]);

async function airtelToken() {
  requireEnv(airtelMissing());
  const base = process.env.AIRTEL_BASE_URL || 'https://openapiuat.airtel.africa';
  const res = await timeoutFetch(`${base}/auth/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: '*/*' },
    body: JSON.stringify({
      client_id: process.env.AIRTEL_CLIENT_ID,
      client_secret: process.env.AIRTEL_CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  });
  if (!res.ok) throw fail(502, `airtel token request failed (${res.status})`);
  return (await res.json()).access_token;
}

const airtelInfo = () => ({
  name: 'airtel',
  enabled: airtelEnabled(),
  missing: airtelEnabled() ? [] : airtelMissing(),
});

async function airtelCreate({ order_id, amount_cents, currency, payer_phone }) {
  requireEnv(airtelMissing());
  const base = process.env.AIRTEL_BASE_URL || 'https://openapiuat.airtel.africa';
  const token = await airtelToken();
  const country = process.env.AIRTEL_COUNTRY || 'ZM';
  const cur = currency || process.env.AIRTEL_CURRENCY || 'ZMW';
  const res = await timeoutFetch(`${base}/standard/v1/payments/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: '*/*',
      'X-Country': country,
      'X-Currency': cur,
    },
    body: JSON.stringify({
      reference: `Tuyamika ${order_id.slice(0, 12)}`,
      subscriber: { country, currency: cur, msisdn: msisdn(payer_phone) },
      transaction: { amount: amount_cents / 100, currency: cur, id: order_id },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw fail(502, `airtel payment push rejected (${res.status})${text ? `: ${text.slice(0, 140)}` : ''}`);
  }
  const body = await res.json();
  const payment_ref = body?.data?.transaction?.id || uid();
  return { payment_ref, provider: 'airtel', raw: body };
}

async function airtelCheck(payment_ref) {
  requireEnv(airtelMissing());
  const base = process.env.AIRTEL_BASE_URL || 'https://openapiuat.airtel.africa';
  const token = await airtelToken();
  const res = await timeoutFetch(`${base}/standard/v1/payments/${payment_ref}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: '*/*',
      'X-Country': process.env.AIRTEL_COUNTRY || 'ZM',
      'X-Currency': process.env.AIRTEL_CURRENCY || 'ZMW',
    },
  });
  if (res.status === 404) return { status: 'failed', raw: null };
  if (!res.ok) throw fail(502, `airtel status check failed (${res.status})`);
  const body = await res.json();
  const state = body?.data?.transaction?.state || '';
  const map = { TS: 'paid', SUCCESS: 'paid', TF: 'failed', TA: 'failed' };
  return { status: map[state] || 'pending', raw: body };
}

// --- EcoCash (REST gateway, env-driven; verify endpoint shape with merchant docs) --------
const ecoEnabled = () => !!(process.env.ECOCASH_API_BASE && process.env.ECOCASH_TOKEN);
const ecoMissing = () => ['ECOCASH_API_BASE', 'ECOCASH_TOKEN'].filter((k) => !process.env[k]);

const ecoInfo = () => ({ name: 'ecocash', enabled: ecoEnabled(), missing: ecoEnabled() ? [] : ecoMissing() });

async function ecoCreate({ order_id, amount_cents, currency, payer_phone }) {
  requireEnv(ecoMissing());
  const base = process.env.ECOCASH_API_BASE.replace(/\/+$/, '');
  const payment_ref = uid();
  const res = await timeoutFetch(`${base}/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.ECOCASH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      external_reference: payment_ref,
      order_reference: order_id,
      amount_cents,
      currency: currency || process.env.ECOCASH_CURRENCY || 'ZWG',
      msisdn: msisdn(payer_phone),
    }),
  });
  if (!res.ok) throw fail(502, `ecocash payment push rejected (${res.status})`);
  return { payment_ref, provider: 'ecocash', raw: await res.json().catch(() => ({})) };
}

async function ecoCheck(payment_ref) {
  requireEnv(ecoMissing());
  const base = process.env.ECOCASH_API_BASE.replace(/\/+$/, '');
  const res = await timeoutFetch(`${base}/payments/${payment_ref}`, {
    headers: { Authorization: `Bearer ${process.env.ECOCASH_TOKEN}` },
  });
  if (res.status === 404) return { status: 'pending', raw: null };
  if (!res.ok) throw fail(502, `ecocash status check failed (${res.status})`);
  const body = await res.json();
  const map = { paid: 'paid', success: 'paid', failed: 'failed' };
  return { status: map[(body.status || '').toLowerCase()] || 'pending', raw: body };
}

// --- selection ----------------------------------------------------------------
export function providerInfo() {
  const selected = process.env.PAYMENT_PROVIDER || 'stub';
  const adapters = { momo: momoInfo, airtel: airtelInfo, ecocash: ecoInfo };
  const selectedInfo = adapters[selected]
    ? adapters[selected]()
    : { name: selected, enabled: false, missing: [] };
  return {
    selected,
    stub: { name: 'stub', enabled: true, missing: [] },
    providers: [momoInfo(), airtelInfo(), ecoInfo()],
    ...selectedInfo,
  };
}

function adapter() {
  const name = process.env.PAYMENT_PROVIDER || 'stub';
  if (name === 'momo') return { info: momoInfo, create: momoCreate, check: momoCheck };
  if (name === 'airtel') return { info: airtelInfo, create: airtelCreate, check: airtelCheck };
  if (name === 'ecocash') return { info: ecoInfo, create: ecoCreate, check: ecoCheck };
  return null;
}

export function providerEnabled() {
  const a = adapter();
  if (!a) return true; // stub always enabled
  return a.info().enabled;
}

export async function createProviderIntent(intent) {
  const a = adapter();
  if (!a) {
    // stub path keeps payment.stub.mjs behaviour
    return null;
  }
  if (!a.info().enabled) throw fail(503, `payment provider ${process.env.PAYMENT_PROVIDER} not configured`);
  return a.create(intent);
}

export async function checkProviderIntent(payment_ref) {
  const a = adapter();
  if (!a) return null;
  if (!a.info().enabled) throw fail(503, `payment provider ${process.env.PAYMENT_PROVIDER} not configured`);
  return a.check(payment_ref);
}

// Event id helper shared by poll/webhook confirmations (idempotence at webhook_events).
export const providerEventId = (payment_ref, status) => `mp_${payment_ref}_${status}_${now()}`;
