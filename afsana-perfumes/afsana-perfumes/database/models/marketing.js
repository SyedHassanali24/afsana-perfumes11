const mongoose = require('mongoose');
const { Schema } = mongoose;
const { ObjectId } = Schema.Types;
const { storeScoped, softDelete, model: m } = require('./_plugins');
const model = (n, s) => m(mongoose, n, s);

const couponSchema = new Schema({
  code: { type: String, required: true, uppercase: true, trim: true },
  type: { type: String, enum: ['percentage', 'fixed', 'free_shipping'], required: true },
  value: { type: Number, default: 0 },
  minOrder: { type: Number, default: 0 }, maxDiscount: Number,
  firstOrderOnly: { type: Boolean, default: false },
  productIds: [{ type: ObjectId, ref: 'Product' }], categoryIds: [{ type: ObjectId, ref: 'Category' }],
  customerIds: [{ type: ObjectId, ref: 'Customer' }],
  usageLimit: Number, perCustomerLimit: { type: Number, default: 1 }, usedCount: { type: Number, default: 0 },
  startsAt: Date, expiresAt: Date, isActive: { type: Boolean, default: true },
  usage: [{ customerId: ObjectId, orderId: ObjectId, at: { type: Date, default: Date.now } }],
}, { timestamps: true });
couponSchema.index({ code: 1, storeId: 1 }, { unique: true });
storeScoped(couponSchema); softDelete(couponSchema);

const flashSaleSchema = new Schema({
  name: String,
  productId: { type: ObjectId, ref: 'Product', required: true }, variantId: { type: ObjectId, ref: 'ProductVariant' },
  originalPrice: Number, salePrice: { type: Number, required: true },
  startsAt: { type: Date, required: true }, endsAt: { type: Date, required: true },
  stockLimit: Number, soldCount: { type: Number, default: 0 }, isActive: { type: Boolean, default: true },
}, { timestamps: true });
flashSaleSchema.index({ startsAt: 1, endsAt: 1 });
storeScoped(flashSaleSchema);

const campaignSchema = new Schema({
  name: { type: String, required: true }, type: { type: String, enum: ['email', 'whatsapp', 'banner', 'popup', 'newsletter'] },
  segment: String, content: Schema.Types.Mixed,
  status: { type: String, enum: ['Draft', 'Scheduled', 'Active', 'Completed', 'Cancelled'], default: 'Draft' },
  startsAt: Date, endsAt: Date, createdBy: { type: ObjectId, ref: 'User' },
}, { timestamps: true });
storeScoped(campaignSchema);

const giftCardSchema = new Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  initialValue: Number, balance: Number, expiresAt: Date, isActive: { type: Boolean, default: true },
  issuedTo: { type: ObjectId, ref: 'Customer' },
}, { timestamps: true });

const loyaltyTxSchema = new Schema({
  customerId: { type: ObjectId, ref: 'Customer', required: true, index: true },
  type: { type: String, enum: ['earn', 'redeem', 'adjust', 'expire'], required: true },
  points: { type: Number, required: true }, orderId: ObjectId, reason: String, by: { type: ObjectId, ref: 'User' },
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = {
  Coupon: model('Coupon', couponSchema), FlashSale: model('FlashSale', flashSaleSchema),
  Campaign: model('Campaign', campaignSchema), GiftCard: model('GiftCard', giftCardSchema),
  LoyaltyTransaction: model('LoyaltyTransaction', loyaltyTxSchema),
};
