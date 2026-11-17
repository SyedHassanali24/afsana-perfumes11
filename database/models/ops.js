const mongoose = require('mongoose');
const { Schema } = mongoose;
const { ObjectId } = Schema.Types;
const { storeScoped, model: m } = require('./_plugins');
const model = (n, s) => m(mongoose, n, s);

// Uploaded pictures (stored in the database so nothing depends on another service; served by cloudflare/api/media).
const mediaSchema = new Schema({
  contentType: { type: String, enum: ['image/jpeg', 'image/png', 'image/webp'], required: true },
  size: { type: Number, required: true }, data: { type: Buffer, required: true },
  filename: String, uploadedBy: { type: ObjectId, ref: 'User' },
}, { timestamps: true });
storeScoped(mediaSchema);

const notificationSchema = new Schema({
  type: { type: String, enum: ['new_order', 'order_update', 'low_stock', 'new_review', 'return_request', 'new_customer', 'payment_received', 'refund_issued', 'staff_change', 'profile_change', 'product_change', 'inventory_change', 'cms_change', 'settings_change', 'security_alert'], required: true },
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

const manualJournalLineSchema = new Schema({
  account: { type: String, required: true, trim: true, maxlength: 100 },
  accountType: { type: String, enum: ['asset', 'liability', 'equity', 'income', 'expense'], required: true },
  debit: { type: Number, min: 0, default: 0 },
  credit: { type: Number, min: 0, default: 0 },
  note: { type: String, trim: true, maxlength: 200, default: '' },
}, { _id: false });
const manualJournalEntrySchema = new Schema({
  date: { type: Date, required: true, index: true },
  narration: { type: String, required: true, trim: true, maxlength: 300 },
  lines: { type: [manualJournalLineSchema], required: true, validate: (v) => Array.isArray(v) && v.length >= 2 && v.length <= 30 },
  totalDebit: { type: Number, required: true, min: 0 },
  totalCredit: { type: Number, required: true, min: 0 },
  createdBy: { type: ObjectId, ref: 'User' },
}, { timestamps: true });
storeScoped(manualJournalEntrySchema);
manualJournalEntrySchema.index({ storeId: 1, date: -1 });


// Raw storefront events; TTL keeps the collection small (aggregate into daily stats before expiry, Phase 9).
const analyticsEventSchema = new Schema({
  event: { type: String, enum: ['page_view', 'product_view', 'add_to_cart', 'begin_checkout', 'purchase'], required: true },
  productId: ObjectId, customerId: ObjectId, sessionRef: String, meta: Schema.Types.Mixed,
  source: { type: String, enum: ['instagram', 'tiktok', 'youtube', 'facebook', 'whatsapp', 'search', 'direct', 'email', 'other_social', 'referral', 'other'] },
  medium: String, campaign: String, referrerHost: String, path: String, landingPath: String, affiliateCode: String,
  at: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 180 },
});
analyticsEventSchema.index({ event: 1, at: -1 });
analyticsEventSchema.index({ productId: 1, event: 1 });
analyticsEventSchema.index({ storeId: 1, affiliateCode: 1, event: 1, at: -1 });
analyticsEventSchema.index({ 'meta.affiliateCode': 1, event: 1, at: -1 });

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
  Notification: model('Notification', notificationSchema), Expense: model('Expense', expenseSchema), ManualJournalEntry: model('ManualJournalEntry', manualJournalEntrySchema),
  AnalyticsEvent: model('AnalyticsEvent', analyticsEventSchema), AuditLog: model('AuditLog', auditLogSchema),
  Setting: model('Setting', settingSchema), Media: model('Media', mediaSchema),
};
