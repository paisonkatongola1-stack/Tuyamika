import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import { initialState, PRODUCTS, SPECIALS, PROVIDERS, nid } from './data';
import { isApiConfigured, fetchMyRegistries, fetchRegistryDetail, fetchProducts, fetchSpecials, fetchEvents, fetchNotifications, trackMyOrders, createRegistry as apiCreateRegistry, reserveGuestItem, checkoutGuest, paySimulate, payStatus, trackOrder } from './api/tuyamika.js';

const Ctx = createContext(null);

const money = (n) => 'K' + n.toLocaleString('en-ZM');

const findProduct = (id) => PRODUCTS.find((p) => p.id === id);

const RESERVE_MINUTES = 10;

function slotUpdate(registries, itemId, from, to) {
  return registries.map((r) => ({
    ...r,
    items: r.items.map((it) => {
      if (it.id !== itemId) return it;
      const slots = [...it.slots];
      const i = to === 'reserved' ? slots.indexOf('available') : slots.indexOf(from);
      if (i < 0) return it;
      slots[i] = to;
      return { ...it, slots, reservedAt: to === 'reserved' ? Date.now() : it.reservedAt };
    }),
  }));
}

async function hydrate(patch) {
  if (!isApiConfigured()) return false;
  const patchOut = {};
  let touched = false;
  // catalogue, specials, events work unauthenticated where the API allows;
  // owner data needs a session and skips quietly otherwise.
  for (const key of ['products', 'specials']) {
    try {
      const data = key === 'products' ? await fetchProducts() : await fetchSpecials();
      if (data && data.length) {
        patchOut[key] = data;
        touched = true;
      }
    } catch { /* fall back to bundled demo data */ }
  }
  for (const [key, loader] of [
    ['registries', fetchMyRegistries],
    ['events', fetchEvents],
    ['orders', trackMyOrders],
    ['notifications', fetchNotifications],
  ]) {
    try {
      const data = await loader();
      if (data) {
        patchOut[key] = key === 'notifications' ? data.notifications : data;
        touched = true;
      }
    } catch { /* skip when not signed in or offline */ }
  }
  if (touched) patchOut.hydratedFromApi = true;
  if (touched) patch(patchOut);
  return touched;
}

export function StoreProvider({ children }) {
  const [state, setState] = useState(initialState);

  const set = useCallback((patch) => setState((s) => ({ ...s, ...patch })), []);
  const apiMode = isApiConfigured();

  useEffect(() => {
    let dead = false;
    hydrate((p) => { if (!dead) set(p); }).catch(() => {});
    return () => { dead = true; };
  }, [set]);

  const refresh = useCallback(() => {
    hydrate((p) => set(p)).catch(() => {});
  }, [set]);

  // products may come from the API (mapped) or the bundled demo set
  const catalogue = state.products && state.products.length ? state.products : PRODUCTS;
  const specialsCatalogue = state.specials && state.specials.length ? state.specials : SPECIALS;

  const actions = useMemo(() => ({
    set,
    refresh,
    apiMode,
    login: (user) => set({ user }),

    addToCart: (item) => set({ cart: [...state.cart, item] }),
    removeFromCart: (id) => set({ cart: state.cart.filter((c) => c.id !== id) }),
    clearCart: () => set({ cart: [] }),

    reserveRegistryItem: async (itemId, opts = {}) => {
      if (!apiMode || !opts.shareToken) {
        setState((s) => ({ ...s, registries: slotUpdate(s.registries, itemId, 'available', 'reserved') }));
        return { ok: true, mode: 'local' };
      }
      try {
        await reserveGuestItem({ shareToken: opts.shareToken, registry_item_id: itemId });
        setState((s) => ({ ...s, registries: slotUpdate(s.registries, itemId, 'available', 'reserved') }));
        return { ok: true, mode: 'api' };
      } catch (err) {
        return { ok: false, error: err && err.message ? err.message : 'Reservation failed' };
      }
    },

    purchaseRegistryItem: (itemId) =>
      setState((s) => ({ ...s, registries: s.registries.map((r) => ({ ...r, items: r.items.map((it) => (it.id === itemId ? { ...it, slots: it.slots.map((sl) => (sl === 'reserved' ? 'purchased' : sl)) } : it)) })) })),

    expireReservation: (itemId) =>
      setState((s) => ({ ...s, registries: slotUpdate(s.registries, itemId, 'reserved', 'available') })),

    guestCheckoutAndPay: async ({ shareToken, registryItemId, recipient_name, recipient_address, delivery, special_instructions }) => {
      const ck = await checkoutGuest({ shareToken, recipient_name, recipient_address, delivery, special_instructions });
      const payment = ck && ck.payment;
      let final = null;
      try {
        final = await payStatus(payment.payment_ref);
      } catch { /* status endpoint just echoes state */ }
      if ((process.env.PAYMENT_CLIENT_SIM || '1') === '1' && final && final.order && final.order.status === 'pending') {
        try {
          final = await paySimulate(payment.payment_ref);
        } catch { /* leave pending when provider disables simulate */ }
      }
      const status = final && final.order ? final.order.status : 'pending';
      if (status === 'paid') {
        setState((s) => ({
          ...s,
          registries: s.registries.map((r) => ({
            ...r,
            items: r.items.map((it) => (it.id === registryItemId ? { ...it, slots: it.slots.map((sl) => (sl === 'reserved' ? 'purchased' : sl)) } : it)),
          })),
          orders: [
            {
              id: payment.payment_ref,
              date: new Date().toISOString().slice(0, 10),
              items: [{ name: shareToken, qty: 1 }],
              shipping: 0,
              total: final.order.total_cents / 100,
              status: 'Paid',
              step: 0,
              method: 'MoMo',
              address: recipient_address || 'Delivery to be confirmed',
            },
            ...s.orders,
          ],
        }));
      }
      return { ok: status === 'paid', status, order: final && final.order };
    },

    trackOrder: async (ref) => {
      try {
        return await trackOrder(ref);
      } catch (err) {
        return { error: err && err.message ? err.message : 'Order not found' };
      }
    },

    contribute: async (campaignId, goalId, name, amount) => {
      // contribution pooling is legal-review pending (docs/roadmap.md) — demo only
      setState((s) => ({
        campaigns: s.campaigns.map((c) => {
          if (c.id !== campaignId) return c;
          const goals = c.goals.map((g) => (g.id === goalId ? { ...g, raised: g.raised + amount } : g));
          return { ...c, raised: c.raised + amount, goals, contributions: [...c.contributions, { id: nid('ct'), name, amount, date: new Date().toISOString().slice(0, 10), status: 'Paid', ref: nid('TX') }] };
        }),
      }));
      return { ok: true, mode: 'local' };
    },

    placeOrder: async (order) => set({ orders: [order, ...state.orders] }),

    createRegistry: async (reg) => {
      if (!apiMode) {
        set({ registries: [...state.registries, { shareToken: nid('TUYA-'), status: 'active', items: [], ...reg }] });
        return { ok: true, mode: 'local' };
      }
      try {
        const row = await apiCreateRegistry(reg);
        const detail = await fetchRegistryDetail(row.id);
        set({ registries: [detail, ...state.registries] });
        return { ok: true, mode: 'api', registry: detail };
      } catch (err) {
        return { ok: false, error: err && err.message ? err.message : 'Could not create the registry' };
      }
    },

    markNotifsRead: () => set({ notifications: state.notifications.map((n) => ({ ...n, unread: false })) }),
  }), [state, set, refresh, apiMode]);

  const value = useMemo(
    () => ({
      ...state,
      products: catalogue,
      specials: specialsCatalogue,
      providers: PROVIDERS,
      ...actions,
      money,
      findProduct,
      RESERVE_MINUTES,
    }),
    [state, actions, catalogue, specialsCatalogue]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);
export const useActions = () => useContext(Ctx);
