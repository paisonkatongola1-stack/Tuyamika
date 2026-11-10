import { storage, KEYS } from '../auth/storage.js';
import { api, isApiConfigured } from './client.js';
import { nid } from '../data.js';

// Tuyamika backend (src/server) bridge for the Expo app.
// Wraps the endpoints the app uses; every call that needs a session pulls the
// JWT the auth provider persisted. All failures throw; callers decide fallback.

export { isApiConfigured };

const PALETTE = [
  ['#B18A52', '#D8C3A5'], ['#C49A6C', '#F8F4EC'], ['#966B4B', '#E8DCD0'],
  ['#70503A', '#D8C3A5'], ['#B18A52', '#302821'], ['#E8DCD0', '#966B4B'],
];

const hashIdx = (str) => {
  const s = String(str || '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % PALETTE.length;
};

const cents = (v) => Math.round((v || 0) / 100);

const GUEST_KEY = KEYS.guestSession;

export async function guestSession() {
  let val = await storage.get(GUEST_KEY);
  if (!val || typeof val !== 'string' || val.length < 8) {
    val = nid('session_');
    await storage.set(GUEST_KEY, val);
  }
  return val;
}

async function token() {
  const session = await storage.get(KEYS.session);
  return session && typeof session.token === 'string' ? session.token : null;
}

async function authed(path, method = 'GET', body) {
  const t = await token();
  if (!t) throw new Error('not signed in');
  if (method === 'GET') return api.get(path, t);
  if (method === 'PATCH') return api.patch(path, body, t);
  return api.post(path, body, t);
}

// --- products / specials (mapped to the app's view shapes) -------------------
export async function fetchProducts() {
  const { products } = await api.get('/api/products');
  return products.map((p) => {
    const idx = hashIdx(p.category + p.id);
    return {
      id: p.id,
      name: p.title,
      price: cents(p.price_cents),
      was: null,
      cat: String(p.category || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 16) || 'hampers',
      retailer: p.business,
      rating: p.rating || 4.7,
      reviews: p.review_count || 0,
      desc: p.description || '',
      stock: p.stock,
      variants: ['Standard'],
      prep: '1-3 days',
      a: PALETTE[idx][0],
      b: PALETTE[idx][1],
      icon: 'gift-sharp',
    };
  });
}

export async function fetchSpecials() {
  const { specials } = await api.get('/api/specials');
  return specials.map((s) => {
    const idx = hashIdx(s.title + s.id);
    return {
      id: s.id,
      name: s.title,
      price: cents(s.price_cents),
      was: s.was_cents ? cents(s.was_cents) : null,
      tag: s.tag || 'Featured',
      a: PALETTE[idx][0],
      b: PALETTE[idx][1],
      icon: 'gift-sharp',
      productId: s.product_id,
      discount_pct: s.discount_pct,
    };
  });
}

// --- registries (owner) -----------------------------------------------------
export async function fetchMyRegistries() {
  const { registries } = await authed('/api/registries');
  // include item slots (free tier caps at 3; detail fetch per registry is cheap)
  const out = [];
  for (const row of registries) {
    const base = mapRegistryRow(row);
    try {
      const detail = await fetchRegistryDetail(row.id);
      base.items = detail.items;
    } catch {
      base.items = [];
    }
    out.push(base);
  }
  return out;
}

async function fetchMyRegistryItems(registry) {
  const detail = await authed(`/api/registries/${registry.id}`);
  return detail.items || [];
}

function slotsFor(item) {
  const slots = Array(Math.max(1, item.quantity)).fill(String(item.status || 'available'));
  return slots.some((s) => s === 'reserved' || s === 'available') ? slots : slots;
}

function mapRegistryRow(r) {
  return {
    id: r.id,
    title: r.name,
    owner: r.owner_name || 'You',
    occasion: r.occasion,
    date: r.event_date || null,
    message: r.message || '',
    coverA: PALETTE[hashIdx(r.id)][0],
    coverB: PALETTE[hashIdx(r.id)][1],
    visibility: r.visibility,
    shareToken: r.share_token,
    status: r.status,
    surprise: !!r.surprise,
    itemCount: r.item_count || undefined,
    items: [], // hydrated by fetchRegistryDetail
  };
}

export async function fetchRegistryDetail(regId) {
  const detail = await authed(`/api/registries/${regId}`);
  const reg = detail.registry || {};
  const base = mapRegistryRow({ ...reg, item_count: (detail.items || []).length });
  base.items = (detail.items || []).map((it) => ({
    id: it.id,
    productId: it.product_id,
    productTitle: it.title,
    variant: it.variant && (it.variant.color || it.variant.size || 'Standard'),
    note: it.notes || '',
    status: it.status,
    slots: slotsFor(it),
    price: cents(it.price_cents),
  }));
  return base;
}

export async function createRegistry(payload) {
  const body = await authed('/api/registries', 'POST', {
    name: payload.title,
    occasion: payload.occasion,
    event_date: payload.date || undefined,
    message: payload.message || undefined,
    visibility: payload.visibility === 'public' ? 'public' : 'unlisted',
    surprise: payload.surprise !== false,
  });
  const row = body.registry;
  if (payload.status === 'active') await authed(`/api/registries/${row.id}`, 'PATCH', { status: 'published' });
  row.status = payload.status === 'active' ? 'published' : row.status;
  return mapRegistryRow(row);
}

export async function addRegistryItems(regId, productIds) {
  for (const productId of productIds) {
    await authed(`/api/registries/${regId}/items`, 'POST', { product_id: productId, quantity: 1 });
  }
}

// --- guest flow (reserve / checkout / pay) ----------------------------------
export async function reserveGuestItem({ shareToken, registry_item_id }) {
  const session = await guestSession();
  return api.post(`/api/r/${shareToken}/reservations`, {
    session_token: session,
    registry_item_id,
    idempotency_key: nid('idem_'),
  });
}

export async function checkoutGuest({ shareToken, recipient_name, recipient_address, delivery, special_instructions }) {
  const session = await guestSession();
  return api.post(`/api/r/${shareToken}/checkout`, {
    session_token: session,
    idempotency_key: nid('idem_ck_'),
    recipient_name,
    recipient_contact: recipient_address,
    delivery,
    special_instructions,
  });
}

export async function payStatus(payment_ref) {
  return api.post(`/api/pay/status/${payment_ref}`);
}

export async function paySimulate(payment_ref) {
  return api.post('/api/pay/simulate', { payment_ref });
}

// --- events / notifications / orders ----------------------------------------
export async function fetchEvents() {
  const { events } = await authed('/api/events');
  return events.map((e) => {
    const guests = e.members.filter((m) => m.role === 'guest').length;
    const hasGuests = e.members.some((m) => m.role === 'guest');
    return {
      id: e.id,
      name: e.name,
      occasion: e.occasion || 'Event',
      date: e.event_date || '',
      time: '',
      venue: e.location || 'TBA',
      budget: cents(e.budget_cents || 0),
      a: PALETTE[hashIdx(e.id)][0],
      b: PALETTE[hashIdx(e.id)][1],
      status: 'upcoming',
      committee: [
        ...e.members.filter((m) => m.role !== 'guest').map((m) => ({ name: m.name, role: m.role })),
        ...(hasGuests ? [{ name: `${e.guest_count || 0} guests`, role: 'RSVP' }] : []),
      ],
      tasks: (e.tasks || []).map((t2) => ({ id: t2.id, title: t2.title, status: t2.status, priority: t2.priority })),
      guests,
    };
  });
}

export async function rsvpEvent(eventId, status, guests) {
  return authed(`/api/events/${eventId}/rsvp`, 'POST', { status, guests });
}

export async function fetchNotifications() {
  const { notifications, unread } = await authed('/api/notifications');
  const ICONS = {
    'order.paid': 'gift-outline',
    'order.dispatched': 'car-outline',
    'event.task': 'checkbox-outline',
    contribution: 'people-outline',
  };
  return {
    unreadCount: unread,
    notifications: notifications.slice(0, 12).map((n) => ({
      id: n.id,
      title: n.trigger.replace(/[._]/g, ' ').replace(/^./, (c) => c.toUpperCase()),
      body: n.message,
      time: new Date(n.created_at).toLocaleDateString('en-ZM'),
      icon: ICONS[n.trigger] || 'notifications-outline',
      unread: !n.read,
      discreet: false,
    })),
  };
}

export async function trackOrder(ref) {
  return api.get(`/api/orders/track/${ref}`);
}

export async function trackMyOrders() {
  const { orders } = await authed('/api/fulfilment/mine');
  return orders.map((o) => ({
    id: o.payment_ref || o.id,
    date: new Date(o.created_at).toISOString().slice(0, 10),
    items: o.items || [],
    shipping: 60,
    total: cents(o.total_cents),
    status: STATUSLike(o.status),
    step: STEP[o.status] ?? 0,
    method: 'Delivery',
    address: o.recipient_contact || o.destination || 'Delivery to be confirmed',
  }));
}

const STEP = { pending: 0, paid: 0, processing: 0, dispatched: 1, delivered: 2, collected: 2, cancelled: 0, refunded: 0, disputed: 0 };
const STATUSLike = (s) => ({ processing: 'Packing', dispatched: 'In Transit', delivered: 'Delivered', collected: 'Collected' }[s] || s);

// reviews
export async function fetchReviews(productId) {
  return api.get(`/api/products/${productId}/reviews`);
}

export async function postReview(productId, { rating, title, body }) {
  return authed(`/api/products/${productId}/reviews`, 'POST', { rating, title, body });
}

// guest registry view by share token (public endpoint)
export async function fetchGuestRegistry(shareToken) {
  const { registry } = await api.get(`/api/r/${shareToken}`);
  const map = (r) => ({
    id: r.id,
    title: r.name,
    owner: r.owner_name || r.owner || 'Registry',
    occasion: r.occasion,
    date: r.event_date,
    message: r.message || '',
    coverA: PALETTE[hashIdx(r.id)][0],
    coverB: PALETTE[hashIdx(r.id)][1],
    visibility: r.visibility,
    shareToken,
    status: r.status,
    surprise: !!r.surprise,
    items: (r.items || []).map((it) => ({
      id: it.id,
      productId: it.product_id,
      productTitle: it.title,
      variant: it.variant && (it.variant.color || it.variant.size || 'Standard'),
      note: it.notes || '',
      status: it.status,
      slots: Array(Math.max(1, it.quantity)).fill(String(it.status || 'available')),
      price: cents(it.price_cents),
    })),
  });
  return map(registry || {});
}
