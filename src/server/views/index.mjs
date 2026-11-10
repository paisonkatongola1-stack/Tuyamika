const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

export const userView = (u) => ({
  id: u.id,
  email: u.email,
  phone: u.phone ?? null,
  full_name: u.full_name,
  country: u.country,
  role: u.role,
  verified: !!u.verified,
  created_at: u.created_at,
});

export function maskPurchase(item) {
  return { ...item, purchased_by: null, purchased_at: null };
}

export function registryItemView(item) {
  return {
    id: item.id,
    registry_id: item.registry_id,
    product_id: item.product_id,
    title: item.title,
    category: item.category,
    price_cents: item.unit_price,
    quantity: item.quantity,
    variant: item.variant == null ? null : typeof item.variant === 'string' ? JSON.parse(item.variant) : item.variant,
    notes: item.notes ?? null,
    status: item.status,
    purchased_by: item.purchased_by ?? null,
    purchased_at: item.purchased_at ?? null,
  };
}

export const reservationView = (r) => ({
  reservation_id: r.reservation_id,
  registry_item_id: r.registry_item_id,
  quantity: r.quantity,
  status: r.status,
  expires_at: r.expires_at,
});

export const orderView = (o) => ({
  id: o.id,
  status: o.status,
  total_cents: o.total_cents,
  currency: o.currency,
  created_at: o.created_at,
  updated_at: o.updated_at,
});

function itemLabel(it) {
  const v = it.variantLabel
    ? it.variantLabel
    : it.variant == null || it.variant === 'null'
      ? null
      : (typeof it.variant === 'string' && it.variant.startsWith('{') ? JSON.parse(it.variant) : it.variant);
  const parts = v && typeof v === 'object' ? [v.size, v.color].filter(Boolean) : v ? [String(v)] : [];
  return parts.join(' / ');
}

export function guestRegistryPage(reg, items, opts = {}) {
  const list = items
    .map(
      (it) => {
        const label = itemLabel(it);
        const money = `$${((it.price_cents ?? it.unit_price) / 100).toFixed(2)}`;
        return `<li><strong>${esc(it.title)}</strong>${label ? ` <span class="muted">(${esc(label)})</span>` : ''} — <span class="money">${money}</span> × ${it.quantity} — <em>${esc(it.status)}</em></li>`;
      }
    )
    .join('');
  const qr = opts.qr_svg
    ? `<div class="share-qr"><span role="img" aria-label="QR code deeplinking to this registry page">${opts.qr_svg}</span><small>Scan to open this registry</small></div>`
    : '';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tuyamika — ${esc(reg.name)}</title><link rel="stylesheet" href="/styles.css"></head>
<body><main class="card">
<h1>${esc(reg.name)}</h1>
${reg.message ? `<p>${esc(reg.message)}</p>` : ''}
${reg.event_date ? `<p class="muted">Event date: ${esc(reg.event_date)}</p>` : ''}
<ul>${list || '<li>No gifts listed yet.</li>'}</ul>
${qr}
<p><small>Tuyamika — The Beauty of Giving, The Joy of Sharing</small></p>
</main></body></html>`;
}

export function publicRegistryView(reg, items) {
  const masked = items.map(registryItemView).map((it) => (reg.surprise ? maskPurchase(it) : it));
  return {
    id: reg.id,
    name: reg.name,
    occasion: reg.occasion,
    event_date: reg.event_date,
    message: reg.message ?? null,
    cover_image: reg.cover_image ?? null,
    visibility: reg.visibility,
    surprise: !!reg.surprise,
    expires_at: reg.expires_at ?? null,
    status: reg.status,
    share_token: reg.share_token,
    items: masked,
  };
}
