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
    variant: item.variant ? JSON.parse(item.variant) : null,
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

export function guestRegistryPage(reg, items) {
  const list = items
    .map(
      (it) => `<li><strong>${esc(it.title)}</strong> (${esc(it.variantLabel || '')}) — $${(it.unit_price / 100).toFixed(2)} × ${it.quantity} — <em>${esc(it.status)}</em></li>`
    )
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(reg.name)}</title></head>
<body style="font-family:system-ui,sans-serif;max-width:640px;margin:2rem auto;padding:0 1rem">
<h1>${esc(reg.name)}</h1>
${reg.message ? `<p>${esc(reg.message)}</p>` : ''}
${reg.event_date ? `<p>Event date: ${esc(reg.event_date)}</p>` : ''}
<ul>${list || '<li>No gifts listed yet.</li>'}</ul>
<p><small>Registry ID: ${esc(reg.id)}</small></p>
</body></html>`;
}

export function publicRegistryView(reg, items) {
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
    items: items.map(registryItemView),
  };
}
