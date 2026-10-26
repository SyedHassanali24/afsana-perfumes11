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
  failures += await referenceCheck('sessions.userId', models.Session, [
    { $lookup: { from: models.User.collection.name, localField: 'userId', foreignField: '_id', as: 'user' } },
    { $match: { 'user.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('staff.userId', models.Staff, [
    { $lookup: { from: models.User.collection.name, localField: 'userId', foreignField: '_id', as: 'user' } },
    { $match: { 'user.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('staff.roleId', models.Staff, [
    { $lookup: { from: models.Role.collection.name, localField: 'roleId', foreignField: '_id', as: 'role' } },
    { $match: { 'role.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('staff.createdBy', models.Staff, [
    { $match: { createdBy: { $exists: true, $ne: null } } },
    { $lookup: { from: models.User.collection.name, localField: 'createdBy', foreignField: '_id', as: 'user' } },
    { $match: { 'user.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('customers.userId', models.Customer, [
    { $match: { userId: { $exists: true, $ne: null } } },
    { $lookup: { from: models.User.collection.name, localField: 'userId', foreignField: '_id', as: 'user' } },
    { $match: { 'user.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('permissionHistory.staffId', models.PermissionHistory, [
    { $match: { staffId: { $exists: true, $ne: null } } },
    { $lookup: { from: models.Staff.collection.name, localField: 'staffId', foreignField: '_id', as: 'staff' } },
    { $match: { 'staff.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('permissionHistory.roleId', models.PermissionHistory, [
    { $match: { roleId: { $exists: true, $ne: null } } },
    { $lookup: { from: models.Role.collection.name, localField: 'roleId', foreignField: '_id', as: 'role' } },
    { $match: { 'role.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('permissionHistory.changedBy', models.PermissionHistory, [
    { $lookup: { from: models.User.collection.name, localField: 'changedBy', foreignField: '_id', as: 'user' } },
    { $match: { 'user.0': { $exists: false } } },
  ]);
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
  failures += await referenceCheck('products.brandId', models.Product, [
    { $match: { brandId: { $exists: true, $ne: null } } },
    { $lookup: { from: models.Brand.collection.name, localField: 'brandId', foreignField: '_id', as: 'brand' } },
    { $match: { 'brand.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('products.categoryId', models.Product, [
    { $lookup: { from: models.Category.collection.name, localField: 'categoryId', foreignField: '_id', as: 'category' } },
    { $match: { 'category.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('products.collectionIds', models.Product, [
    { $unwind: '$collectionIds' },
    { $lookup: { from: models.Collection.collection.name, localField: 'collectionIds', foreignField: '_id', as: 'collection' } },
    { $match: { 'collection.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('products.fragrance.familyId', models.Product, [
    { $match: { 'fragrance.familyId': { $exists: true, $ne: null } } },
    { $lookup: { from: models.FragranceFamily.collection.name, localField: 'fragrance.familyId', foreignField: '_id', as: 'family' } },
    { $match: { 'family.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('products.createdBy', models.Product, [
    { $match: { createdBy: { $exists: true, $ne: null } } },
    { $lookup: { from: models.User.collection.name, localField: 'createdBy', foreignField: '_id', as: 'user' } },
    { $match: { 'user.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('categories.parentId', models.Category, [
    { $match: { parentId: { $exists: true, $ne: null } } },
    { $lookup: { from: models.Category.collection.name, localField: 'parentId', foreignField: '_id', as: 'parent' } },
    { $match: { 'parent.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('bundles.productId', models.Bundle, [
    { $lookup: { from: models.Product.collection.name, localField: 'productId', foreignField: '_id', as: 'product' } },
    { $match: { 'product.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('bundles.components.variantId', models.Bundle, [
    { $unwind: '$components' },
    { $lookup: { from: models.ProductVariant.collection.name, localField: 'components.variantId', foreignField: '_id', as: 'variant' } },
    { $match: { 'variant.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('reviews.productId', models.Review, [
    { $lookup: { from: models.Product.collection.name, localField: 'productId', foreignField: '_id', as: 'product' } },
    { $match: { 'product.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('reviews.customerId', models.Review, [
    { $lookup: { from: models.Customer.collection.name, localField: 'customerId', foreignField: '_id', as: 'customer' } },
    { $match: { 'customer.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('reviews.orderId', models.Review, [
    { $match: { orderId: { $exists: true, $ne: null } } },
    { $lookup: { from: models.Order.collection.name, localField: 'orderId', foreignField: '_id', as: 'order' } },
    { $match: { 'order.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('reviews.moderatedBy', models.Review, [
    { $match: { moderatedBy: { $exists: true, $ne: null } } },
    { $lookup: { from: models.User.collection.name, localField: 'moderatedBy', foreignField: '_id', as: 'user' } },
    { $match: { 'user.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('wishlists.customerId', models.Wishlist, [
    { $lookup: { from: models.Customer.collection.name, localField: 'customerId', foreignField: '_id', as: 'customer' } },
    { $match: { 'customer.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('wishlists.productIds', models.Wishlist, [
    { $unwind: '$productIds' },
    { $lookup: { from: models.Product.collection.name, localField: 'productIds', foreignField: '_id', as: 'product' } },
    { $match: { 'product.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('variants.productId', models.ProductVariant, [
    { $lookup: { from: models.Product.collection.name, localField: 'productId', foreignField: '_id', as: 'product' } },
    { $match: { 'product.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('payments.orderId', models.Payment, [
    { $lookup: { from: models.Order.collection.name, localField: 'orderId', foreignField: '_id', as: 'order' } },
    { $match: { 'order.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('returns.orderId', models.Return, [
    { $lookup: { from: models.Order.collection.name, localField: 'orderId', foreignField: '_id', as: 'order' } },
    { $match: { 'order.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('refunds.orderId', models.Refund, [
    { $lookup: { from: models.Order.collection.name, localField: 'orderId', foreignField: '_id', as: 'order' } },
    { $match: { 'order.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('refunds.returnId', models.Refund, [
    { $match: { returnId: { $exists: true, $ne: null } } },
    { $lookup: { from: models.Return.collection.name, localField: 'returnId', foreignField: '_id', as: 'return' } },
    { $match: { 'return.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('refunds.customerId', models.Refund, [
    { $match: { customerId: { $exists: true, $ne: null } } },
    { $lookup: { from: models.Customer.collection.name, localField: 'customerId', foreignField: '_id', as: 'customer' } },
    { $match: { 'customer.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('coupon.usage.orderId', models.Coupon, [
    { $unwind: '$usage' },
    { $match: { 'usage.orderId': { $exists: true, $ne: null } } },
    { $lookup: { from: models.Order.collection.name, localField: 'usage.orderId', foreignField: '_id', as: 'order' } },
    { $match: { 'order.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('inventory.variantId', models.Inventory, [
    { $lookup: { from: models.ProductVariant.collection.name, localField: 'variantId', foreignField: '_id', as: 'variant' } },
    { $match: { 'variant.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('inventory.productId', models.Inventory, [
    { $lookup: { from: models.Product.collection.name, localField: 'productId', foreignField: '_id', as: 'product' } },
    { $match: { 'product.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('inventory.productId↔variant.productId', models.Inventory, [
    { $lookup: { from: models.ProductVariant.collection.name, localField: 'variantId', foreignField: '_id', as: 'variant' } },
    { $unwind: '$variant' },
    { $match: { $expr: { $ne: ['$productId', '$variant.productId'] } } },
  ]);
  failures += await referenceCheck('inventoryTransactions.variantId', models.InventoryTransaction, [
    { $lookup: { from: models.ProductVariant.collection.name, localField: 'variantId', foreignField: '_id', as: 'variant' } },
    { $match: { variant: { $eq: [] } } },
  ]);
  failures += await referenceCheck('inventoryTransactions.productId', models.InventoryTransaction, [
    { $lookup: { from: models.Product.collection.name, localField: 'productId', foreignField: '_id', as: 'product' } },
    { $match: { product: { $eq: [] } } },
  ]);
  failures += await referenceCheck('inventoryTransactions.productId↔variant.productId', models.InventoryTransaction, [
    { $lookup: { from: models.ProductVariant.collection.name, localField: 'variantId', foreignField: '_id', as: 'variant' } },
    { $unwind: '$variant' },
    { $match: { $expr: { $ne: ['$productId', '$variant.productId'] } } },
  ]);
  failures += await referenceCheck('purchaseOrders.supplierId', models.PurchaseOrder, [
    { $lookup: { from: models.Supplier.collection.name, localField: 'supplierId', foreignField: '_id', as: 'supplier' } },
    { $match: { 'supplier.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('suppliers.productIds', models.Supplier, [
    { $unwind: '$productIds' },
    { $lookup: { from: models.Product.collection.name, localField: 'productIds', foreignField: '_id', as: 'product' } },
    { $match: { 'product.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('purchaseOrders.items.productId', models.PurchaseOrder, [
    { $unwind: '$items' },
    { $lookup: { from: models.Product.collection.name, localField: 'items.productId', foreignField: '_id', as: 'product' } },
    { $match: { 'product.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('purchaseOrders.items.variantId', models.PurchaseOrder, [
    { $unwind: '$items' },
    { $lookup: { from: models.ProductVariant.collection.name, localField: 'items.variantId', foreignField: '_id', as: 'variant' } },
    { $match: { 'variant.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('purchaseOrders.items.productId↔variant.productId', models.PurchaseOrder, [
    { $unwind: '$items' },
    { $lookup: { from: models.ProductVariant.collection.name, localField: 'items.variantId', foreignField: '_id', as: 'variant' } },
    { $unwind: '$variant' },
    { $match: { $expr: { $ne: ['$items.productId', '$variant.productId'] } } },
  ]);
  failures += await referenceCheck('coupons.productIds', models.Coupon, [
    { $unwind: '$productIds' },
    { $lookup: { from: models.Product.collection.name, localField: 'productIds', foreignField: '_id', as: 'product' } },
    { $match: { 'product.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('coupons.categoryIds', models.Coupon, [
    { $unwind: '$categoryIds' },
    { $lookup: { from: models.Category.collection.name, localField: 'categoryIds', foreignField: '_id', as: 'category' } },
    { $match: { 'category.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('coupons.customerIds', models.Coupon, [
    { $unwind: '$customerIds' },
    { $lookup: { from: models.Customer.collection.name, localField: 'customerIds', foreignField: '_id', as: 'customer' } },
    { $match: { 'customer.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('coupon.usage.customerId', models.Coupon, [
    { $unwind: '$usage' },
    { $match: { 'usage.customerId': { $exists: true, $ne: null } } },
    { $lookup: { from: models.Customer.collection.name, localField: 'usage.customerId', foreignField: '_id', as: 'customer' } },
    { $match: { 'customer.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('flashSales.productId', models.FlashSale, [
    { $lookup: { from: models.Product.collection.name, localField: 'productId', foreignField: '_id', as: 'product' } },
    { $match: { 'product.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('flashSales.variantId', models.FlashSale, [
    { $match: { variantId: { $exists: true, $ne: null } } },
    { $lookup: { from: models.ProductVariant.collection.name, localField: 'variantId', foreignField: '_id', as: 'variant' } },
    { $match: { 'variant.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('flashSales.productId-variant.productId', models.FlashSale, [
    { $match: { variantId: { $exists: true, $ne: null } } },
    { $lookup: { from: models.ProductVariant.collection.name, localField: 'variantId', foreignField: '_id', as: 'variant' } },
    { $unwind: '$variant' },
    { $match: { $expr: { $ne: ['$productId', '$variant.productId'] } } },
  ]);
  failures += await referenceCheck('campaigns.createdBy', models.Campaign, [
    { $match: { createdBy: { $exists: true, $ne: null } } },
    { $lookup: { from: models.User.collection.name, localField: 'createdBy', foreignField: '_id', as: 'user' } },
    { $match: { 'user.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('giftCards.issuedTo', models.GiftCard, [
    { $match: { issuedTo: { $exists: true, $ne: null } } },
    { $lookup: { from: models.Customer.collection.name, localField: 'issuedTo', foreignField: '_id', as: 'customer' } },
    { $match: { 'customer.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('loyaltyTransactions.customerId', models.LoyaltyTransaction, [
    { $lookup: { from: models.Customer.collection.name, localField: 'customerId', foreignField: '_id', as: 'customer' } },
    { $match: { 'customer.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('loyaltyTransactions.orderId', models.LoyaltyTransaction, [
    { $match: { orderId: { $exists: true, $ne: null } } },
    { $lookup: { from: models.Order.collection.name, localField: 'orderId', foreignField: '_id', as: 'order' } },
    { $match: { 'order.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('loyaltyTransactions.by', models.LoyaltyTransaction, [
    { $match: { by: { $exists: true, $ne: null } } },
    { $lookup: { from: models.User.collection.name, localField: 'by', foreignField: '_id', as: 'user' } },
    { $match: { 'user.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('media.uploadedBy', models.Media, [
    { $match: { uploadedBy: { $exists: true, $ne: null } } },
    { $lookup: { from: models.User.collection.name, localField: 'uploadedBy', foreignField: '_id', as: 'user' } },
    { $match: { 'user.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('notifications.readBy', models.Notification, [
    { $unwind: '$readBy' },
    { $lookup: { from: models.User.collection.name, localField: 'readBy', foreignField: '_id', as: 'user' } },
    { $match: { 'user.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('expenses.createdBy', models.Expense, [
    { $match: { createdBy: { $exists: true, $ne: null } } },
    { $lookup: { from: models.User.collection.name, localField: 'createdBy', foreignField: '_id', as: 'user' } },
    { $match: { 'user.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('analyticsEvents.productId', models.AnalyticsEvent, [
    { $match: { productId: { $exists: true, $ne: null } } },
    { $lookup: { from: models.Product.collection.name, localField: 'productId', foreignField: '_id', as: 'product' } },
    { $match: { 'product.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('analyticsEvents.customerId', models.AnalyticsEvent, [
    { $match: { customerId: { $exists: true, $ne: null } } },
    { $lookup: { from: models.Customer.collection.name, localField: 'customerId', foreignField: '_id', as: 'customer' } },
    { $match: { 'customer.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('auditLogs.userId', models.AuditLog, [
    { $match: { userId: { $exists: true, $ne: null } } },
    { $lookup: { from: models.User.collection.name, localField: 'userId', foreignField: '_id', as: 'user' } },
    { $match: { 'user.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('settings.updatedBy', models.Setting, [
    { $match: { updatedBy: { $exists: true, $ne: null } } },
    { $lookup: { from: models.User.collection.name, localField: 'updatedBy', foreignField: '_id', as: 'user' } },
    { $match: { 'user.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('inventoryTransactions.by', models.InventoryTransaction, [
    { $match: { by: { $exists: true, $ne: null } } },
    { $lookup: { from: models.User.collection.name, localField: 'by', foreignField: '_id', as: 'user' } },
    { $match: { 'user.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('purchaseOrders.createdBy', models.PurchaseOrder, [
    { $match: { createdBy: { $exists: true, $ne: null } } },
    { $lookup: { from: models.User.collection.name, localField: 'createdBy', foreignField: '_id', as: 'user' } },
    { $match: { 'user.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('orders.timeline.by', models.Order, [
    { $unwind: '$timeline' },
    { $match: { 'timeline.by': { $exists: true, $ne: null } } },
    { $lookup: { from: models.User.collection.name, localField: 'timeline.by', foreignField: '_id', as: 'user' } },
    { $match: { 'user.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('orders.internalNotes.by', models.Order, [
    { $unwind: '$internalNotes' },
    { $match: { 'internalNotes.by': { $exists: true, $ne: null } } },
    { $lookup: { from: models.User.collection.name, localField: 'internalNotes.by', foreignField: '_id', as: 'user' } },
    { $match: { 'user.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('returns.timeline.by', models.Return, [
    { $unwind: '$timeline' },
    { $match: { 'timeline.by': { $exists: true, $ne: null } } },
    { $lookup: { from: models.User.collection.name, localField: 'timeline.by', foreignField: '_id', as: 'user' } },
    { $match: { 'user.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('carts.items.productId', models.Cart, [
    { $unwind: '$items' },
    { $match: { 'items.productId': { $exists: true, $ne: null } } },
    { $lookup: { from: models.Product.collection.name, localField: 'items.productId', foreignField: '_id', as: 'product' } },
    { $match: { 'product.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('carts.items.variantId', models.Cart, [
    { $unwind: '$items' },
    { $match: { 'items.variantId': { $exists: true, $ne: null } } },
    { $lookup: { from: models.ProductVariant.collection.name, localField: 'items.variantId', foreignField: '_id', as: 'variant' } },
    { $match: { 'variant.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('orders.assignedTo', models.Order, [
    { $match: { assignedTo: { $exists: true, $ne: null } } },
    { $lookup: { from: models.User.collection.name, localField: 'assignedTo', foreignField: '_id', as: 'user' } },
    { $match: { 'user.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('orders.createdBy', models.Order, [
    { $match: { createdBy: { $exists: true, $ne: null } } },
    { $lookup: { from: models.User.collection.name, localField: 'createdBy', foreignField: '_id', as: 'user' } },
    { $match: { 'user.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('orderItems.productId↔variant.productId', models.OrderItem, [
    { $lookup: { from: models.ProductVariant.collection.name, localField: 'variantId', foreignField: '_id', as: 'variant' } },
    { $unwind: '$variant' },
    { $match: { $expr: { $ne: ['$productId', '$variant.productId'] } } },
  ]);
  failures += await referenceCheck('payments.receivedBy', models.Payment, [
    { $match: { receivedBy: { $exists: true, $ne: null } } },
    { $lookup: { from: models.User.collection.name, localField: 'receivedBy', foreignField: '_id', as: 'user' } },
    { $match: { 'user.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('shipments.orderId', models.Shipment, [
    { $lookup: { from: models.Order.collection.name, localField: 'orderId', foreignField: '_id', as: 'order' } },
    { $match: { 'order.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('shipments.courierId', models.Shipment, [
    { $match: { courierId: { $exists: true, $ne: null } } },
    { $lookup: { from: models.Courier.collection.name, localField: 'courierId', foreignField: '_id', as: 'courier' } },
    { $match: { 'courier.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('returns.handledBy', models.Return, [
    { $match: { handledBy: { $exists: true, $ne: null } } },
    { $lookup: { from: models.User.collection.name, localField: 'handledBy', foreignField: '_id', as: 'user' } },
    { $match: { 'user.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('returns.createdBy', models.Return, [
    { $match: { createdBy: { $exists: true, $ne: null } } },
    { $lookup: { from: models.User.collection.name, localField: 'createdBy', foreignField: '_id', as: 'user' } },
    { $match: { 'user.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('returns.assignedTo', models.Return, [
    { $match: { assignedTo: { $exists: true, $ne: null } } },
    { $lookup: { from: models.User.collection.name, localField: 'assignedTo', foreignField: '_id', as: 'user' } },
    { $match: { 'user.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('refunds.approvedBy', models.Refund, [
    { $lookup: { from: models.User.collection.name, localField: 'approvedBy', foreignField: '_id', as: 'user' } },
    { $match: { 'user.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('carts.customerId', models.Cart, [
    { $match: { customerId: { $exists: true, $ne: null } } },
    { $lookup: { from: models.Customer.collection.name, localField: 'customerId', foreignField: '_id', as: 'customer' } },
    { $match: { 'customer.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('abandonedCarts.cartId', models.AbandonedCart, [
    { $match: { cartId: { $exists: true, $ne: null } } },
    { $lookup: { from: models.Cart.collection.name, localField: 'cartId', foreignField: '_id', as: 'cart' } },
    { $match: { 'cart.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('abandonedCarts.customerId', models.AbandonedCart, [
    { $match: { customerId: { $exists: true, $ne: null } } },
    { $lookup: { from: models.Customer.collection.name, localField: 'customerId', foreignField: '_id', as: 'customer' } },
    { $match: { 'customer.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('orders.without-order-items', models.Order, [
    { $lookup: { from: models.OrderItem.collection.name, localField: '_id', foreignField: 'orderId', as: 'items' } },
    { $match: { 'items.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('orders.without-payment', models.Order, [
    { $lookup: { from: models.Payment.collection.name, localField: '_id', foreignField: 'orderId', as: 'payments' } },
    { $match: { 'payments.0': { $exists: false } } },
  ]);
  failures += await referenceCheck('orders.multiple-payments', models.Order, [
    { $lookup: { from: models.Payment.collection.name, localField: '_id', foreignField: 'orderId', as: 'payments' } },
    { $match: { $expr: { $gt: [{ $size: '$payments' }, 1] } } },
  ]);
  failures += await referenceCheck('order.payment-status-mismatch', models.Order, [
    { $lookup: { from: models.Payment.collection.name, localField: '_id', foreignField: 'orderId', as: 'payments' } },
    { $unwind: '$payments' },
    { $match: { $expr: { $ne: ['$paymentStatus', '$payments.status'] } } },
  ]);
  if (failures) throw new Error(`Index/reference preflight failed: ${failures} conflict(s) detected. Resolve them before npm run db:indexes.`);
  console.log('Index preflight OK: no duplicate values for declared unique indexes.');
}

main()
  .catch((err) => { console.error(err.message || err); process.exitCode = 1; })
  .finally(async () => { await mongoose.disconnect().catch(() => {}); });
