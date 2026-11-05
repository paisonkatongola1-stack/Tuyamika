import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { initialState, PRODUCTS, nid } from './data';

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

export function StoreProvider({ children }) {
  const [state, setState] = useState(initialState);

  const set = useCallback((patch) => setState((s) => ({ ...s, ...patch })), []);

  const actions = useMemo(() => ({
    set,
    login: (user) => set({ user }),

    addToCart: (item) => set({ cart: [...state.cart, item] }),
    removeFromCart: (id) => set({ cart: state.cart.filter((c) => c.id !== id) }),
    clearCart: () => set({ cart: [] }),

    reserveRegistryItem: (itemId) => setState((s) => ({ ...s, registries: slotUpdate(s.registries, itemId, 'available', 'reserved') })),

    purchaseRegistryItem: (itemId) =>
      setState((s) => ({ ...s, registries: s.registries.map((r) => ({ ...r, items: r.items.map((it) => (it.id === itemId ? { ...it, slots: it.slots.map((sl) => (sl === 'reserved' ? 'purchased' : sl)) } : it)) })) })),

    expireReservation: (itemId) =>
      setState((s) => ({ ...s, registries: slotUpdate(s.registries, itemId, 'reserved', 'available') })),

    contribute: (campaignId, goalId, name, amount) =>
      setState((s) => ({
        campaigns: s.campaigns.map((c) => {
          if (c.id !== campaignId) return c;
          const goals = c.goals.map((g) => (g.id === goalId ? { ...g, raised: g.raised + amount } : g));
          return { ...c, raised: c.raised + amount, goals, contributions: [...c.contributions, { id: nid('ct'), name, amount, date: new Date().toISOString().slice(0, 10), status: 'Paid', ref: nid('TX') }] };
        }),
      })),

    placeOrder: (order) => set({ orders: [order, ...state.orders] }),

    createRegistry: (reg) => set({ registries: [...state.registries, { shareToken: nid('TUYA-'), status: 'active', items: [], ...reg }] }),

    markNotifsRead: () => set({ notifications: state.notifications.map((n) => ({ ...n, unread: false })) }),
  }), [state, set]);

  const value = useMemo(() => ({ ...state, ...actions, money, findProduct, RESERVE_MINUTES }), [state, actions]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);
export const useActions = () => useContext(Ctx);
