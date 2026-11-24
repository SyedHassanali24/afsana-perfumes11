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
  recipientCount: { type: Number, default: 0 }, sentCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 }, skippedCount: { type: Number, default: 0 },
  startedAt: Date, completedAt: Date,
  startsAt: Date, endsAt: Date, createdBy: { type: ObjectId, ref: 'User' },
}, { timestamps: true });
campaignSchema.index({ status: 1, createdAt: -1 });
storeScoped(campaignSchema);

// A permanent email archive. Possessing an address is not the same as consenting to marketing.
const customerEmailSchema = new Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  name: { type: String, default: '' },
  customerId: { type: ObjectId, ref: 'Customer', index: true },
  source: { type: String, enum: ['checkout', 'newsletter', 'order-history', 'customer-account'], default: 'checkout' },
  consentStatus: { type: String, enum: ['not_consented', 'subscribed', 'unsubscribed'], default: 'not_consented', index: true },
  consentAt: Date, consentSource: String, unsubscribedAt: Date,
  firstSeenAt: { type: Date, default: Date.now }, lastSeenAt: { type: Date, default: Date.now },
  lastOrderAt: Date, orderCount: { type: Number, default: 0 },
}, { timestamps: true });
customerEmailSchema.index({ email: 1, storeId: 1 }, { unique: true });
customerEmailSchema.index({ storeId: 1, consentStatus: 1, email: 1 });
storeScoped(customerEmailSchema); softDelete(customerEmailSchema);

// Recipient snapshots keep a campaign auditable even if a customer later changes their address or consent.
const campaignRecipientSchema = new Schema({
  campaignId: { type: ObjectId, ref: 'Campaign', required: true, index: true },
  contactId: { type: ObjectId, ref: 'CustomerEmail', required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  name: String,
  status: { type: String, enum: ['Pending', 'Sending', 'Sent', 'Failed', 'Skipped'], default: 'Pending', index: true },
  attempts: { type: Number, default: 0 }, sentAt: Date, messageId: String, error: String,
}, { timestamps: true });
campaignRecipientSchema.index({ campaignId: 1, status: 1, createdAt: 1 });
storeScoped(campaignRecipientSchema);

const whatsappCampaignRecipientSchema = new Schema({
  campaignId: { type: ObjectId, ref: 'Campaign', required: true, index: true },
  contactType: { type: String, enum: ['customer', 'offerLead'], required: true },
  contactId: { type: ObjectId, required: true },
  phone: { type: String, required: true, trim: true },
  name: { type: String, default: '' },
  status: { type: String, enum: ['Pending', 'Sending', 'Sent', 'Failed', 'Skipped'], default: 'Pending', index: true },
  attempts: { type: Number, default: 0 },
  sentAt: Date,
  messageId: String,
  error: String,
}, { timestamps: true });
whatsappCampaignRecipientSchema.index({ campaignId: 1, status: 1, createdAt: 1 });
whatsappCampaignRecipientSchema.index({ campaignId: 1, phone: 1 }, { unique: true });
storeScoped(whatsappCampaignRecipientSchema);

const offerLeadSchema = new Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  source: { type: String, default: 'welcome-offer-popup' },
  campaign: { type: String, default: 'WELCOME10' },
  couponCode: { type: String, required: true, uppercase: true, trim: true },
  couponId: { type: ObjectId, ref: 'Coupon', required: true },
  marketingConsent: { type: Boolean, required: true, default: false },
  marketingConsentAt: { type: Date, required: true },
  status: { type: String, enum: ['New', 'Contacted', 'Converted', 'Unsubscribed'], default: 'New', index: true },
}, { timestamps: true });
offerLeadSchema.index({ email: 1, storeId: 1 }, { unique: true });
offerLeadSchema.index({ phone: 1, storeId: 1 }, { unique: true });
offerLeadSchema.index({ status: 1, createdAt: -1 });
storeScoped(offerLeadSchema); softDelete(offerLeadSchema);

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
  Coupon: model('Coupon', couponSchema), OfferLead: model('OfferLead', offerLeadSchema), AffiliatePartner: model('AffiliatePartner', affiliatePartnerSchema), FlashSale: model('FlashSale', flashSaleSchema),
  Campaign: model('Campaign', campaignSchema), CustomerEmail: model('CustomerEmail', customerEmailSchema),
  CampaignRecipient: model('CampaignRecipient', campaignRecipientSchema),
  WhatsAppCampaignRecipient: model('WhatsAppCampaignRecipient', whatsappCampaignRecipientSchema),
  GiftCard: model('GiftCard', giftCardSchema), LoyaltyTransaction: model('LoyaltyTransaction', loyaltyTxSchema),
};
