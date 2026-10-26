// Safe first-time setup for the LIVE database. Run once from your own PC after the site is deployed:
//   npm run db:setup
// Creates: permission list, the 5 system roles, and the Owner login (ADMIN_EMAIL / ADMIN_PASSWORD).
// Does NOT create demo products, and never overwrites an existing owner's password. Safe to run twice.
require('dotenv').config({ quiet: true });
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { connectDB } = require('../connection');
const C = require('../constants');
const M = require('../models');

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const pw = process.env.ADMIN_PASSWORD || '';
  if (!email || pw.length < 12) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) first.');
  await connectDB();

  const perms = [];
  for (const module of C.MODULES) for (const action of C.ACTIONS) {
    const key = `${module}.${action}`;
    perms.push({ updateOne: { filter: { key }, update: { $set: { key, module, action, isHighRisk: C.HIGH_RISK.includes(key) } }, upsert: true } });
  }
  await M.Permission.bulkWrite(perms);

  const all = (actions = C.ACTIONS, mods = C.MODULES) => mods.map((module) => ({ module, actions, scope: { kind: 'all' } }));
  const sensitive = ['roles', 'permissions', 'security', 'backup', 'accessScope', 'temporaryAccess', 'settings', 'payments'];
  const ops = ['dashboard', 'products', 'inventory', 'orders', 'shipping', 'returns', 'customers', 'reviews', 'coupons', 'notifications'];
  const roles = [
    { key: 'owner', name: 'Owner', level: C.ROLE_LEVEL.owner, isUnrestricted: true, grants: [] },
    { key: 'super_admin', name: 'Super Admin', level: C.ROLE_LEVEL.superAdmin, grants: all() },
    { key: 'admin', name: 'Admin', level: C.ROLE_LEVEL.admin, grants: all(C.ACTIONS, C.MODULES.filter((x) => !sensitive.includes(x))) },
    { key: 'manager', name: 'Manager', level: C.ROLE_LEVEL.manager, deniedFields: ['product.costPrice', 'order.profit'], grants: all(['view', 'create', 'edit', 'changeStatus'], ops) },
    { key: 'staff', name: 'Staff', level: C.ROLE_LEVEL.staff, deniedFields: ['product.costPrice', 'order.profit', 'customer.address'], grants: all(['view'], ['dashboard', 'orders', 'products']) },
  ];
  // $setOnInsert: roles you already edited in the Roles screen are NOT overwritten on a second run.
  for (const r of roles) await M.Role.updateOne({ key: r.key }, { $setOnInsert: { ...r, isSystem: true } }, { upsert: true });

  let user = await M.User.findOne({ email });
  const created = !user;
  if (!user) user = await M.User.create({ kind: 'staff', email, passwordHash: await bcrypt.hash(pw, 12) });
  const ownerRole = await M.Role.findOne({ key: 'owner' });
  await M.Staff.updateOne({ userId: user._id }, { $setOnInsert: { userId: user._id, name: 'Owner', roleId: ownerRole._id } }, { upsert: true });

  console.log(created ? `Owner created: ${email}` : `Owner ${email} already exists (password NOT changed).`);
  console.log('Next: npm run db:indexes');
}
main().then(() => mongoose.disconnect()).catch((e) => { console.error('setup failed:', e.message); process.exit(1); });
