const { z, objectId, num, bool, paging, confirmPassword } = require('./common');
const C = require('../database/constants');

// ---------- auth ----------
const loginBody = z.object({ email: z.string().email().max(200), password: z.string().min(1).max(200) });

// ---------- products ----------
const variantBase = {
  sku: z.string().trim().min(1).max(60),
  label: z.string().trim().max(30).optional(),
  sizeMl: z.number().int().positive(),
  price: z.number().min(0),
  salePrice: z.number().min(0).optional(),
  costPrice: z.number().min(0).optional(),
  barcode: z.string().max(60).optional(),
  weightGrams: z.number().min(0).optional(),
};
const variantCreate = z.object({ ...variantBase, stock: z.number().int().min(0).default(0) });
const variantPatch = z.object({
  label: variantBase.label, barcode: variantBase.barcode, weightGrams: variantBase.weightGrams,
  price: variantBase.price.optional(), salePrice: variantBase.salePrice, costPrice: variantBase.costPrice,
  isActive: z.boolean().optional(), confirmPassword,
});

const productBase = {
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/).max(160).optional(),
  sku: z.string().trim().min(1).max(60),
  barcode: z.string().max(60).optional(),
  brandId: objectId.optional(),
  categoryId: objectId,
  collectionIds: z.array(objectId).max(20).optional(),
  productType: z.enum(['single', 'bundle', 'giftbox', 'tester']).optional(),
  status: z.enum(C.PRODUCT_STATUSES).optional(),
  fragrance: z.object({
    familyId: objectId.optional(), scentType: z.string().max(60).optional(),
    gender: z.enum(['Men', 'Women', 'Unisex']).optional(), concentration: z.string().max(40).optional(),
    longevity: z.string().max(40).optional(), projection: z.string().max(40).optional(),
    seasons: z.array(z.string().max(30)).max(8).optional(), occasions: z.array(z.string().max(30)).max(12).optional(),
  }).optional(),
  notes: z.object({ top: z.array(z.string().max(40)).max(15).optional(), heart: z.array(z.string().max(40)).max(15).optional(), base: z.array(z.string().max(40)).max(15).optional() }).optional(),
  profile: z.object({ freshness: z.number().min(0).max(100).optional(), sweetness: z.number().min(0).max(100).optional(), woody: z.number().min(0).max(100).optional(), spicy: z.number().min(0).max(100).optional(), floral: z.number().min(0).max(100).optional() }).optional(),
  media: z.array(z.object({ kind: z.string().max(20).optional(), url: z.string().url().max(500), alt: z.string().max(200).optional(), sortOrder: z.number().optional() })).max(30).optional(),
  content: z.object({ shortDescription: z.string().max(500).optional(), fullDescription: z.string().max(10000).optional() }).optional(),
  seo: z.object({ title: z.string().max(120).optional(), metaDescription: z.string().max(300).optional(), keywords: z.array(z.string().max(40)).max(20).optional(), canonicalUrl: z.string().url().optional(), ogImage: z.string().url().optional() }).optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
};
const productCreate = z.object({ ...productBase, variants: z.array(variantCreate).min(1).max(12) });
const productPatch = z.object(productBase).partial();

const publicProductsQuery = z.object({
  q: z.string().trim().max(80).optional(), category: z.string().max(100).optional(), collection: z.string().max(100).optional(),
  gender: z.enum(['Men', 'Women', 'Unisex']).optional(),
  minPrice: num(z.number().min(0).optional()), maxPrice: num(z.number().min(0).optional()),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'popular']).optional(), ...paging,
});
const adminProductsQuery = z.object({
  q: z.string().trim().max(80).optional(), category: objectId.optional(), status: z.enum(C.PRODUCT_STATUSES).optional(), ...paging,
});

// ---------- inventory ----------
const adjustBody = z.object({
  variantId: objectId,
  type: z.enum(['restock', 'damaged', 'adjustment']),
  quantity: z.number().int(),
  reason: z.string().trim().min(3).max(300),
  confirmPassword,
}).superRefine((v, ctx) => {
  if (v.quantity === 0) ctx.addIssue({ code: 'custom', path: ['quantity'], message: 'Quantity cannot be 0' });
  if (v.type !== 'adjustment' && v.quantity < 0) ctx.addIssue({ code: 'custom', path: ['quantity'], message: 'Quantity must be positive' });
});
const inventoryQuery = z.object({ q: z.string().trim().max(80).optional(), low: bool, productId: objectId.optional(), ...paging });
const historyQuery = z.object({ variantId: objectId.optional(), type: z.enum(C.STOCK_TX_TYPES).optional(), ...paging });

// ---------- orders ----------
const phone = z.string().trim().regex(/^[0-9+\-\s]{10,15}$/, 'Enter a valid phone number');
const checkoutBody = z.object({
  items: z.array(z.object({ variantId: objectId, quantity: z.number().int().min(1).max(20) })).min(1).max(30),
  customer: z.object({ name: z.string().trim().min(2).max(100), phone, email: z.string().email().max(200).optional().or(z.literal('')) }),
  shippingAddress: z.object({ fullName: z.string().trim().max(100).optional(), line1: z.string().trim().min(5).max(200), line2: z.string().max(200).optional(), city: z.string().trim().min(2).max(80), postalCode: z.string().max(12).optional(), phone: phone.optional() }),
  paymentMethod: z.enum(C.PAYMENT_METHODS),
  couponCode: z.string().trim().max(40).optional(),
});
const trackQuery = z.object({ phone });
const ordersQuery = z.object({
  q: z.string().trim().max(80).optional(), status: z.enum(C.ORDER_STATUSES).optional(),
  paymentStatus: z.enum(C.PAYMENT_STATUSES).optional(), ...paging,
});
const statusBody = z.object({ status: z.enum(C.ORDER_STATUSES), note: z.string().trim().max(300).optional() });
const noteBody = z.object({ text: z.string().trim().min(1).max(500) });
const paymentBody = z.object({ paymentStatus: z.enum(['Pending', 'Paid', 'Failed']), reference: z.string().max(100).optional() });

module.exports = {
  loginBody, productCreate, productPatch, variantCreate, variantPatch, publicProductsQuery, adminProductsQuery,
  adjustBody, inventoryQuery, historyQuery, checkoutBody, trackQuery, ordersQuery, statusBody, noteBody, paymentBody,
};
