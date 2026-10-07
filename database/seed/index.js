// DEV ONLY. Refuses to run against anything that looks like production.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { connectDB } = require('../connection');
const C = require('../constants');
const M = require('../models');

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function seedAccess() {
  // 1) permission catalog
  const perms = [];
  for (const module of C.MODULES) for (const action of C.ACTIONS) {
    const key = `${module}.${action}`;
    perms.push({ updateOne: { filter: { key }, update: { $set: { key, module, action, isHighRisk: C.HIGH_RISK.includes(key) } }, upsert: true } });
  }
  await M.Permission.bulkWrite(perms);

  // 2) system roles (grants are editable later from Roles UI, except Owner)
  const all = (actions = C.ACTIONS, mods = C.MODULES) => mods.map((module) => ({ module, actions, scope: { kind: 'all' } }));
  const sensitive = ['roles', 'permissions', 'security', 'backup', 'accessScope', 'temporaryAccess', 'settings', 'payments'];
  const ops = ['dashboard','products','inventory','orders','shipping','returns','customers','reviews','coupons','notifications'];
  const roles = [
    { key: 'owner', name: 'Owner', level: C.ROLE_LEVEL.owner, isUnrestricted: true, grants: [] },
    { key: 'super_admin', name: 'Super Admin', level: C.ROLE_LEVEL.superAdmin, grants: all() },
    { key: 'admin', name: 'Admin', level: C.ROLE_LEVEL.admin, grants: all(C.ACTIONS, C.MODULES.filter((x) => !sensitive.includes(x))) },
    { key: 'manager', name: 'Manager', level: C.ROLE_LEVEL.manager, deniedFields: ['product.costPrice', 'order.profit'],
      grants: all(['view', 'create', 'edit', 'changeStatus'], ops) },
    { key: 'staff', name: 'Staff', level: C.ROLE_LEVEL.staff, deniedFields: ['product.costPrice', 'order.profit', 'customer.address'],
      grants: all(['view'], ['dashboard', 'orders', 'products']) },
  ];
  for (const r of roles) await M.Role.updateOne({ key: r.key }, { $set: { ...r, isSystem: true } }, { upsert: true });

  // 3) owner account
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase();
  const pw = process.env.ADMIN_PASSWORD;
  if (!email || !pw || pw.length < 10) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (10+ chars) in .env for the dev owner');
  let user = await M.User.findOne({ email });
  if (!user) user = await M.User.create({ kind: 'staff', email, passwordHash: await bcrypt.hash(pw, 12) });
  const ownerRole = await M.Role.findOne({ key: 'owner' });
  await M.Staff.updateOne({ userId: user._id }, { $setOnInsert: { userId: user._id, name: 'Owner', roleId: ownerRole._id } }, { upsert: true });
}

async function seedCatalog() {
  if (await M.Product.countDocuments()) return console.log('catalog already seeded, skipping');
  const brand = await M.Brand.create({ name: 'Afsana', slug: 'afsana' });
  const [men, women, unisex] = await Promise.all(['Men', 'Women', 'Unisex'].map((n) => M.Category.create({ name: n, slug: slug(n) })));
  const fam = await M.FragranceFamily.create({ name: 'Oriental', slug: 'oriental' });
  const items = [
    { name: 'Royal Oud', cat: men, g: 'Men', notes: { top: ['Saffron'], heart: ['Oud'], base: ['Amber', 'Musk'] }, sizes: [[50, 3500], [100, 5800]] },
    { name: 'Velvet Rose', cat: women, g: 'Women', notes: { top: ['Bergamot'], heart: ['Rose'], base: ['Vanilla'] }, sizes: [[30, 1800], [50, 2900]] },
    { name: 'Silk Amber', cat: unisex, g: 'Unisex', notes: { top: ['Cardamom'], heart: ['Amber'], base: ['Sandalwood'] }, sizes: [[50, 3200]] },
  ];
  for (const it of items) {
    const p = await M.Product.create({
      name: it.name, slug: slug(it.name), sku: `AFS-${slug(it.name).toUpperCase()}`, brandId: brand._id, categoryId: it.cat._id,
      status: 'Active', fragrance: { familyId: fam._id, gender: it.g, concentration: 'EDP' }, notes: it.notes,
      priceFrom: Math.min(...it.sizes.map((s) => s[1])), tags: it.sizes[0][1] < 2000 ? ['Under 2000'] : ['Premium'],
    });
    for (const [ml, price] of it.sizes) {
      const v = await M.ProductVariant.create({ productId: p._id, sku: `${p.sku}-${ml}`, label: `${ml}ml`, sizeMl: ml, price, costPrice: Math.round(price * 0.55) });
      await M.Inventory.create({ variantId: v._id, productId: p._id, current: 25, lowStockThreshold: 5 });
      await M.InventoryTransaction.create({ variantId: v._id, productId: p._id, type: 'opening', delta: 25, before: 0, after: 25 });
    }
  }
}

(async () => {
  const name = process.env.MONGODB_DB_NAME || '';
  if (process.env.NODE_ENV === 'production' || /prod/i.test(name)) throw new Error(`Refusing to seed "${name}" – looks like production`);
  await connectDB();
  await Promise.all(Object.values(M).filter((x) => x && x.createIndexes).map((x) => x.createIndexes()));
  await seedAccess();
  await seedCatalog();
  console.log('seed complete');
  await mongoose.disconnect();
})().catch((e) => { console.error('seed failed:', e.message); process.exit(1); });
