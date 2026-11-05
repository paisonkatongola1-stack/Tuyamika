import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { esc, registryItemView, reservationView, orderView, guestRegistryPage, publicRegistryView, userView } from './index.mjs';

describe('esc', () => {
  it('escapes markup-significant chars', () => {
    assert.equal(esc('<img onerror="alert(1)">'), '&lt;img onerror=&quot;alert(1)&quot;&gt;');
    assert.equal(esc('single \'quote\' & amp'), 'single &#39;quote&#39; &amp; amp');
  });
  it('defaults empty string to empty string', () => {
    assert.equal(esc(), '');
    assert.equal(esc(''), '');
  });
  it('coerces numbers', () => {
    assert.equal(esc(42), '42');
  });
});

describe('registryItemView', () => {
  it('maps price_cents from unit_price and strips fields', () => {
    const out = registryItemView({
      id: 'ri1', registry_id: 'rr', product_id: 'p1', quantity: 2,
      unit_price: 3200, variant: '{"size":"M"}', purchased_by: 'u1',
    });
    assert.equal(out.price_cents, 3200);
    assert.deepEqual(out.variant, { size: 'M' });
    assert.equal(out.purchased_by, 'u1');
    assert.equal(out.notes, null);
  });
  it('handles null variant', () => {
    assert.equal(registryItemView({ id: 'x', variant: null }).variant, null);
  });
});

describe('surprise masking', () => {
  it('publicRegistryView hides giver on surprise registries', () => {
    const Row = (over = {}) => ({ unit_price: 2500, purchased_by: 'guest-1', ...over });
    const out = publicRegistryView(
      { id: 'r1', name: 'N', occasion: 'birthday', share_token: 'tok', status: 'published', surprise: true },
      [Row()]
    );
    assert.equal(out.items[0].purchased_by, null);
  });
  it('publicRegistryView keeps giver on normal registries', () => {
    const out = publicRegistryView(
      { id: 'r1', name: 'N', occasion: 'birthday', share_token: 'tok', status: 'published', surprise: false },
      [{ unit_price: 2500, purchased_by: 'guest-1' }]
    );
    assert.equal(out.items[0].purchased_by, 'guest-1');
  });
});

describe('reservationView + orderView shapes', () => {
  it('orders expose idempotent-safe fields only', () => {
    const o = orderView({ id: 'o1', status: 'pending', total_cents: 5000, currency: 'USD', idempotency_key: 'k1' });
    assert.equal(o.status, 'pending');
    assert.ok(!('idempotency_key' in o));
  });
  it('reservation view keys stable', () => {
    const r = reservationView({ reservation_id: 'rr1', registry_item_id: 'ri1', quantity: 1, status: 'pending', expires_at: 123 });
    assert.deepEqual(Object.keys(r).sort(), ['expires_at', 'quantity', 'registry_item_id', 'reservation_id', 'status']);
  });
});

describe('guestRegistryPage', () => {
  const rawRow = { unit_price: 3200, title: '<b>gift</b>', variant: null, quantity: 1, status: 'available' };
  const viewRow = registryItemView({ ...rawRow, variant: '{"color":"gold"}' });

  it('renders escaped titles', () => {
    const html = guestRegistryPage({ name: 'r<> name' }, [rawRow]);
    assert.ok(html.includes('&lt;b&gt;gift&lt;/b&gt;'));
    assert.ok(!html.includes('<b>gift</b>'));
  });
  it('renders money from raw or view field names', () => {
    const raw = guestRegistryPage({ name: 'n' }, [rawRow]);
    assert.ok(raw.includes('$32.00'));
    const view = guestRegistryPage({ name: 'n' }, [viewRow]);
    assert.ok(view.includes('$32.00'));
  });
  it('renders variant label when present', () => {
    const html = guestRegistryPage({ name: 'n' }, [viewRow]);
    assert.ok(html.includes('(gold)'));
  });
  it('renders empty state without items', () => {
    const html = guestRegistryPage({ name: 'n' }, []);
    assert.ok(html.includes('No gifts listed yet.'));
  });
});

describe('userView', () => {
  it('never emits password_hash', () => {
    const out = userView({ id: 'u1', email: 'e', full_name: 'f', role: 'customer', password_hash: 'secret', verified: 1 });
    assert.ok(!('password_hash' in out));
    assert.equal(out.verified, true);
  });
});
