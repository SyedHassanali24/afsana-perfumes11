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

// Influencer and staff partners. Every referral code is unique within the store.
const affiliatePartnerSchema = new Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, uppercase: true, trim: true },
  type: { type: String, enum: ['influencer', 'staff'], required: true, index: true },
  userId: { type: ObjectId, ref: 'User', index: true },
  staffId: { type: ObjectId, ref: 'Staff', index: true },
  platform: String, handle: String, email: String, phone: String,
  discountType: { type: String, enum: ['none', 'percentage', 'fixed', 'free_shipping'], default: 'none' },
  discountValue: { type: Number, default: 0 }, maxDiscount: Number, minOrder: { type: Number, default: 0 },
  commissionType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
  commissionValue: { type: Number, default: 0 },
  usageLimit: Number, perCustomerLimit: { type: Number, default: 0 }, usedCount: { type: Number, default: 0 },
  redemptions: [{ customerId: ObjectId, orderId: ObjectId, at: { type: Date, default: Date.now } }],
  startsAt: Date, expiresAt: Date, isActive: { type: Boolean, default: true },
  createdBy: { type: ObjectId, ref: 'User' },
}, { timestamps: true });
affiliatePartnerSchema.index({ code: 1, storeId: 1 }, { unique: true });
affiliatePartnerSchema.index({ userId: 1, isActive: 1 });
storeScoped(affiliatePartnerSchema); softDelete(affiliatePartnerSchema);

module.exports = {
  Coupon: model('Coupon', couponSchema), AffiliatePartner: model('AffiliatePartner', affiliatePartnerSchema), FlashSale: model('FlashSale', flashSaleSchema),
  Campaign: model('Campaign', campaignSchema), GiftCard: model('GiftCard', giftCardSchema),
  LoyaltyTransaction: model('LoyaltyTransaction', loyaltyTxSchema),
};
