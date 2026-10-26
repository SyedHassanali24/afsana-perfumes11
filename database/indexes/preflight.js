require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../connection');
const models = require('../models');

const CHECKS = [
  ['users.email', models.User, { email: 1 }, { email: { $exists: true, $type: 'string', $ne: '' } }],
  ['users.phone', models.User, { phone: 1 }, { phone: { $exists: true, $type: 'string', $ne: '' } }],
  ['customers.phone/storeId', models.Customer, { phone: 1, storeId: 1 }, { phone: { $exists: true, $type: 'string', $ne: '' } }],
  ['products.slug', models.Product, { slug: 1 }, { slug: { $exists: true, $type: 'string', $ne: '' } }],
  ['products.sku', models.Product, { sku: 1 }, { sku: { $exists: true, $type: 'string', $ne: '' } }],
  ['variants.sku', models.ProductVariant, { sku: 1 }, { sku: { $exists: true, $type: 'string', $ne: '' } }],
  ['bundles.productId', models.Bundle, { productId: 1 }, { productId: { $exists: true } }],
  ['reviews.productId/customerId', models.Review, { productId: 1, customerId: 1 }, { productId: { $exists: true }, customerId: { $exists: true } }],
  ['wishlists.customerId', models.Wishlist, { customerId: 1 }, { customerId: { $exists: true } }],
  ['coupons.code/storeId', models.Coupon, { code: 1, storeId: 1 }, { code: { $exists: true, $type: 'string', $ne: '' } }],
  ['giftCards.code', models.GiftCard, { code: 1 }, { code: { $exists: true, $type: 'string', $ne: '' } }],
  ['settings.key/storeId', models.Setting, { key: 1, storeId: 1 }, { key: { $exists: true, $type: 'string', $ne: '' } }],
  ['orders.orderNumber', models.Order, { orderNumber: 1 }, { orderNumber: { $exists: true, $type: 'string', $ne: '' } }],
  ['orders.idempotencyKey', models.Order, { idempotencyKey: 1 }, { idempotencyKey: { $exists: true, $type: 'string', $ne: '' } }],
  ['returns.returnNumber', models.Return, { returnNumber: 1 }, { returnNumber: { $exists: true, $type: 'string', $ne: '' } }],
  ['inventory.variantId', models.Inventory, { variantId: 1 }, { variantId: { $exists: true } }],
  ['purchaseOrders.poNumber', models.PurchaseOrder, { poNumber: 1 }, { poNumber: { $exists: true, $type: 'string', $ne: '' } }],
];

async function duplicateKeys(model, key, match) {
  return model.aggregate([
    { $match: match },
    { $group: { _id: key, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 50 },
  ]);
}

async function referenceCheck(name, model, pipeline) {
  const rows = await model.aggregate([...pipeline, { $count: 'count' }]);
  const count = rows[0]?.count || 0;
  if (count) console.error(`Reference integrity conflict(s) in ${name}: ${count}`);
  return count;
}

async function main() {
  await connectDB();
  let failures = 0;
  for (const [name, model, key, match] of CHECKS) {
    if (!model) continue;
    const rows = await duplicateKeys(model, key, match);
    if (!rows.length) continue;
    failures += rows.length;
    console.error(`Duplicate unique-key conflict(s) in ${name}:`);
    for (const row of rows) console.error(JSON.stringify({ key: row._id, count: row.count }));
  }
  failures += await referenceCheck('orders.customerId', models.Order, [
    { $match: { customerId: { $exists: true, $ne: null } } },
    { $lookup: { from: models.Customer.collection.name, localField: 'customerId', foreignField: '_id', as: 'customer' } },
    { $match: { 'customer.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('orderItems.orderId', models.OrderItem, [
    { $lookup: { from: models.Order.collection.name, localField: 'orderId', foreignField: '_id', as: 'order' } },
    { $match: { 'order.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('orderItems.productId', models.OrderItem, [
    { $lookup: { from: models.Product.collection.name, localField: 'productId', foreignField: '_id', as: 'product' } },
    { $match: { 'product.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('orderItems.variantId', models.OrderItem, [
    { $lookup: { from: models.ProductVariant.collection.name, localField: 'variantId', foreignField: '_id', as: 'variant' } },
    { $match: { 'variant.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('payments.orderId', models.Payment, [
    { $lookup: { from: models.Order.collection.name, localField: 'orderId', foreignField: '_id', as: 'order' } },
    { $match: { 'order.0': { $exists: false } } },
  ]);
  if (failures) throw new Error(`Index/reference preflight failed: ${failures} conflict(s) detected. Resolve them before npm run db:indexes.`);
  console.log('Index preflight OK: no duplicate values for declared unique indexes.');
}

main()
  .catch((err) => { console.error(err.message || err); process.exitCode = 1; })
  .finally(async () => { await mongoose.disconnect().catch(() => {}); });
