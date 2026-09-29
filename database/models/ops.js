const mongoose = require('mongoose');
const { Schema } = mongoose;
const { ObjectId } = Schema.Types;
const { storeScoped, model: m } = require('./_plugins');
const model = (n, s) => m(mongoose, n, s);

const notificationSchema = new Schema({
  type: { type: String, enum: ['new_order', 'low_stock', 'new_review', 'return_request', 'new_customer', 'payment_received', 'security_alert'], required: true },
  title: String, body: String, link: String,
  forPermission: String, // only staff holding this permission see it
  readBy: [{ type: ObjectId, ref: 'User' }],
}, { timestamps: true });
notificationSchema.index({ createdAt: -1 });

const expenseSchema = new Schema({
  category: { type: String, enum: ['Shipping', 'Packaging', 'Advertising', 'Salaries', 'Rent', 'Utilities', 'Other'], required: true },
  amount: { type: Number, required: true }, date: { type: Date, required: true, index: true }, description: String,
  createdBy: { type: ObjectId, ref: 'User' },
}, { timestamps: true });
storeScoped(expenseSchema);

// Raw storefront events; TTL keeps the collection small (aggregate into daily stats before expiry, Phase 9).
const analyticsEventSchema = new Schema({
  event: { type: String, enum: ['page_view', 'product_view', 'add_to_cart', 'begin_checkout', 'purchase'], required: true },
  productId: ObjectId, customerId: ObjectId, sessionRef: String, meta: Schema.Types.Mixed,
  at: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 180 },
});
analyticsEventSchema.index({ event: 1, at: -1 });
analyticsEventSchema.index({ productId: 1, event: 1 });

// Append-only. Updates/deletes are blocked at the model layer.
const auditLogSchema = new Schema({
  userId: { type: ObjectId, ref: 'User', index: true },
  action: { type: String, required: true, index: true }, // 'product.price_changed'
  module: { type: String, index: true }, recordId: String,
  oldValue: Schema.Types.Mixed, newValue: Schema.Types.Mixed,
  ip: String, sessionId: ObjectId,
}, { timestamps: { createdAt: 'timestamp', updatedAt: false } });
auditLogSchema.index({ timestamp: -1 });
const blocked = function () { throw new Error('auditLogs are append-only'); };
['updateOne', 'updateMany', 'findOneAndUpdate', 'findOneAndDelete', 'deleteOne', 'deleteMany', 'findOneAndReplace', 'replaceOne']
  .forEach((op) => auditLogSchema.pre(op, blocked));

const settingSchema = new Schema({
  key: { type: String, required: true }, // 'store', 'payments', 'security', 'seo', 'tracking'
  value: Schema.Types.Mixed, updatedBy: { type: ObjectId, ref: 'User' },
}, { timestamps: true });
settingSchema.index({ key: 1, storeId: 1 }, { unique: true });
storeScoped(settingSchema);

module.exports = {
  Notification: model('Notification', notificationSchema), Expense: model('Expense', expenseSchema),
  AnalyticsEvent: model('AnalyticsEvent', analyticsEventSchema), AuditLog: model('AuditLog', auditLogSchema),
  Setting: model('Setting', settingSchema),
};
