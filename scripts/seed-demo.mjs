#!/usr/bin/env node
import '../src/server/lib/db.mjs';
import { db, now } from '../src/server/lib/db.mjs';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const uid = () => crypto.randomUUID();
const t = now();
const force = process.argv.includes('--force');

const flagged = db.prepare(`SELECT value FROM seed_meta WHERE key = 'seeded_demo'`).get();
if (flagged && !force) {
  console.log('demo data already seeded; pass --force to reseed');
  process.exit(0);
}

const clear = db.transaction(() => {
  for (const table of ['reservations', 'registry_items', 'registries', 'orders', 'order_items', 'webhook_events', 'products', 'businesses', 'contribution_goals', 'contribution_campaigns', 'notifications', 'subscriptions', 'admin_logs', 'users']) {
    db.prepare(`DELETE FROM ${table}`).run();
  }
});

function insertUser({ name, email, password, role }) {
  const id = uid();
  db.prepare(
    `INSERT INTO users (id, email, phone, password_hash, full_name, country, role, created_at, verified)
     VALUES (?, ?, NULL, ?, ?, 'ZW', ?, ?, 1)`
  ).run(id, email, bcrypt.hashSync(password, 10), name, role, t);
  return id;
}

clear();

const admin = insertUser({ name: 'Mai Admin', email: 'admin@tuyamika.app', password: 'admin-demo-2026', role: 'admin' });
const retailer = insertUser({ name: 'Zulwazi Crafts', email: 'zulwazi@crafts.africa', password: 'retail-demo-2026', role: 'business_owner' });
const owner = insertUser({ name: 'Tino M', email: 'tino@example.com', password: 'owner-demo-2026', role: 'customer' });

const bizId = uid();
db.prepare(
  `INSERT INTO businesses (id, user_id, type, name, description, status, created_at) VALUES (?, ?, 'retailer', 'Zulwazi Crafts', 'Hand-made heritage gifts', 'approved', ?)`
).run(bizId, retailer, t);

const products = [
  ['Shweshwe print fabric bundle', 'Homeware', 4500],
  ['Hand-carved wooden bowl', 'Kitchen', 2500],
  ['Zamani beaded necklace', 'Jewellery', 7000],
  ['Marula oil gift set', 'Beauty', 3200],
  ['Ndebele pattern throw pillow', 'Homeware', 1800],
  ['Kente baby gift set', 'Baby', 6100],
];
const productIds = [];
for (const [title, category, cents] of products) {
  const id = uid();
  db.prepare(
    `INSERT INTO products (id, business_id, title, description, price_cents, category, stock, variants, images) VALUES (?, ?, ?, NULL, ?, ?, 25, '[]', '[]')`
  ).run(id, bizId, title, cents, category);
  productIds.push(id);
}

const registryId = uid();
db.prepare(
  `INSERT INTO registries (id, owner_id, name, occasion, event_date, message, visibility, surprise, share_token, status, created_at, updated_at)
   VALUES (?, ?, 'Zanele turns 30', 'birthday', '2026-12-18', 'Come celebrate with us!', 'public', 0, 'demo-share-2026', 'published', ?, ?)`
).run(registryId, owner, t, t);

const demoItems = [
  [productIds[1], 1],
  [productIds[2], 1],
  [productIds[3], 2],
];
for (const [pid, qty] of demoItems) {
  const price = db.prepare('SELECT price_cents FROM products WHERE id = ?').get(pid).price_cents;
  db.prepare(
    `INSERT INTO registry_items (id, registry_id, product_id, quantity, unit_price, status) VALUES (?, ?, ?, ?, ?, 'available')`
  ).run(uid(), registryId, pid, qty, price);
}

const campaignId = uid();
db.prepare(
  `INSERT INTO contribution_campaigns (id, owner_id, title, purpose, target_cents, share_token) VALUES (?, ?, 'Auntie Rose farewell lunch', 'Community farewell event', 50000, 'demo-giftfund-2026')`
).run(campaignId, admin);
db.prepare(
  `INSERT INTO contribution_goals (id, campaign_id, title, target_cents, raised_cents) VALUES (?, ?, 'Catering deposit', 20000, 0)`
).run(uid(), campaignId);

db.prepare(`INSERT OR REPLACE INTO seed_meta (key, value) VALUES ('seeded_demo', ?)`).run(String(t));

console.log(`demo DB seeded at ${t}`);
console.log(`logins:  admin@tuyamika.app / admin-demo-2026 | zulwazi@crafts.africa / retail-demo-2026 | tino@example.com / owner-demo-2026`);
console.log(`share link: /r/demo-share-2026`);
