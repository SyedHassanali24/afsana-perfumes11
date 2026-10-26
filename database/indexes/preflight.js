require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../connection');
const models = require('../models');

async function duplicateKeys(Model, fields, label) {
  const match = {};
  for (const field of fields) match[field] = { $exists: true, $ne: null };
  const rows = await Model.aggregate([
    { $match: match },
    { $group: { _id: Object.fromEntries(fields.map((field) => [field, '$' + field])), count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 },
  ]);
  if (rows.length) {
    console.error(`${label}: ${rows.length} duplicate key group(s) found.`);
    for (const row of rows) console.error(JSON.stringify({ key: row._id, count: row.count }));
  }
  return rows.length;
}

async function main() {
  await connectDB();

  const checks = [
    [models.User, ['email'], 'User email'],
    [models.User, ['phone'], 'User phone'],
    [models.Permission, ['key'], 'Permission key'],
    [models.Role, ['key'], 'Role key'],
    [models.Staff, ['userId'], 'Staff userId'],
    [models.Customer, ['phone', 'storeId'], 'Customer phone/store'],
    [models.Product, ['slug'], 'Product slug'],
    [models.Product, ['sku'], 'Product SKU'],
    [models.ProductVariant, ['sku'], 'Variant SKU'],
    [models.Bundle, ['productId'], 'Bundle productId'],
    [models.Review, ['productId', 'customerId'], 'Review product/customer'],
    [models.Wishlist, ['customerId'], 'Wishlist customerId'],
    [models.Coupon, ['code', 'storeId'], 'Coupon code/store'],
    [models.GiftCard, ['code'], 'Gift-card code'],
    [models.Menu, ['key'], 'CMS menu key'],
    [models.Page, ['slug'], 'CMS page slug'],
    [models.EmailTemplate, ['event'], 'Email-template event'],
    [models.Order, ['orderNumber'], 'Order number'],
    [models.Order, ['idempotencyKey'], 'Order idempotency key'],
    [models.Return, ['returnNumber'], 'Return number'],
    [models.AbandonedCart, ['cartId'], 'Abandoned-cart cartId'],
  ];

  let failures = 0;
  for (const [Model, fields, label] of checks) {
    failures += await duplicateKeys(Model, fields, label);
  }

  if (failures) throw new Error(`Index preflight failed: ${failures} duplicate-key group(s) must be resolved before npm run db:indexes.`);
  console.log('Index preflight OK: no duplicate values for production unique indexes.');
}

main()
  .catch((err) => { console.error(err.message || err); process.exitCode = 1; })
  .finally(async () => { await mongoose.disconnect().catch(() => {}); });
