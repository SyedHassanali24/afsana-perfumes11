const { z, objectId, num, bool, paging, confirmPassword } = require('./common');
const C = require('../database/constants');
const { normalizePhone } = require('../services/phone');

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
  q: z.string().trim().max(80).optional(), category: z.string().max(100).optional(), collection: z.string().max(100).optional(), brand: z.string().max(100).optional(),
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

// ---------- passwords ----------
const passwordRule = (min) => z.string().min(min, `Use at least ${min} characters`).max(128)
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), 'Use both letters and numbers');
const changePasswordBody = z.object({ currentPassword: z.string().min(1).max(200), newPassword: passwordRule(10) });

// ---------- staff / roles ----------
const deniedFields = z.array(z.enum(C.RESTRICTABLE_FIELDS)).max(C.RESTRICTABLE_FIELDS.length);
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM');
const workingHours = z.object({
  enabled: z.boolean(), days: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  start: hhmm.optional(), end: hhmm.optional(), timezone: z.string().max(60).optional(),
}).refine((w) => !w.enabled || (w.start && w.end && w.days && w.days.length), 'Choose days, start and end time');
const staffQuery = z.object({ q: z.string().trim().max(80).optional(), status: z.enum(['Active', 'Suspended', 'Disabled']).optional(), roleId: objectId.optional(), ...paging });
const staffCreate = z.object({
  name: z.string().trim().min(2).max(100), email: z.string().trim().email().max(200), roleId: objectId,
  password: passwordRule(10).optional(), workingHours: workingHours.optional(), deniedFields: deniedFields.optional(),
});
const staffPatch = z.object({
  name: z.string().trim().min(2).max(100), roleId: objectId, status: z.enum(['Active', 'Suspended', 'Disabled']),
  workingHours, deniedFields,
}).partial();
const staffPasswordBody = z.object({ password: passwordRule(10).optional() });
const scopeIn = z.object({ kind: z.enum(C.SCOPES).default('all'), values: z.array(z.string().max(80)).max(200).default([]) });
const grantIn = z.object({ module: z.enum(C.MODULES), actions: z.array(z.enum(C.ACTIONS)).min(1).max(C.ACTIONS.length), scope: scopeIn.optional() });
const overrideBody = z.object({
  effect: z.enum(['allow', 'deny']), module: z.enum(C.MODULES), actions: z.array(z.enum(C.ACTIONS)).min(1).max(C.ACTIONS.length),
  scope: scopeIn.optional(), startsAt: z.coerce.date().optional(), expiresAt: z.coerce.date().optional(), reason: z.string().trim().min(3).max(300),
});
const roleCreate = z.object({
  name: z.string().trim().min(2).max(60), description: z.string().trim().max(300).optional(),
  level: z.number().int().min(1).max(99), grants: z.array(grantIn).max(C.MODULES.length * 2), deniedFields: deniedFields.optional(),
});
const roleUpdate = roleCreate.partial();
const historyQuery2 = z.object({ staffId: objectId.optional(), roleId: objectId.optional(), ...paging });
const auditQuery = z.object({
  q: z.string().trim().max(60).optional(), module: z.enum(C.MODULES).optional(), userId: objectId.optional(),
  from: z.coerce.date().optional(), to: z.coerce.date().optional(), ...paging,
});

// ---------- customer accounts ----------
const custPhone = z.string().trim().regex(/^[0-9+\-\s()]{10,18}$/, 'Enter a valid phone number').transform(normalizePhone);
const registerBody = z.object({
  name: z.string().trim().min(2).max(100), phone: custPhone,
  email: z.string().trim().email().max(200).optional().or(z.literal('')).transform((v) => v || undefined),
  password: passwordRule(8),
});
const customerLoginBody = z.object({ identifier: z.string().trim().min(3).max(200), password: z.string().min(1).max(200) });
const profilePatch = z.object({ name: z.string().trim().min(2).max(100), city: z.string().trim().max(80) }).partial();
const customerChangePassword = z.object({ currentPassword: z.string().min(1).max(200), newPassword: passwordRule(8) });
const forgotBody = z.object({ identifier: z.string().trim().min(3).max(200) });
const resetBody = z.object({ token: z.string().regex(/^[a-f\d]{64}$/i, 'Invalid link'), newPassword: passwordRule(8) });

// ---------- storefront: cart, wishlist, addresses, my orders ----------
const cartItems = z.array(z.object({ variantId: objectId, quantity: z.number().int().min(1).max(20) })).max(30);
const quoteBody = z.object({ items: cartItems, couponCode: z.string().trim().max(40).optional() });
const cartBody = z.object({ items: cartItems, couponCode: z.string().trim().max(40).optional().or(z.literal('')).transform((v) => v || undefined) });
const addressBody = z.object({
  type: z.enum(['Home', 'Office', 'Other']).default('Home'), fullName: z.string().trim().min(2).max(100), phone,
  line1: z.string().trim().min(5).max(200), line2: z.string().trim().max(200).optional(), city: z.string().trim().min(2).max(80),
  postalCode: z.string().trim().max(12).optional(), isDefault: z.boolean().optional(),
});
const addressPatch = addressBody.partial();
const myOrdersQuery = z.object({ ...paging });

// ---------- taxonomy / suppliers / purchase orders ----------
const slugRule = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and dashes').max(100);
const optUrl = z.string().trim().url().max(500).or(z.literal(''));
const taxonomyBody = z.object({
  name: z.string().trim().min(2).max(80), slug: slugRule.optional(), description: z.string().trim().max(1000).optional(),
  image: z.object({ url: optUrl.optional(), alt: z.string().max(200).optional() }).optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(), isActive: z.boolean().optional(),
  seo: z.object({ title: z.string().max(120).optional(), description: z.string().max(300).optional() }).optional(),
  parentId: objectId.nullable().optional(), // categories only
});
const taxonomyPatch = taxonomyBody.partial();
const taxonomyQuery = z.object({ q: z.string().trim().max(80).optional(), active: bool, ...paging });
const supplierBody = z.object({
  name: z.string().trim().min(2).max(120), contactPerson: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(30).optional(), email: z.string().trim().email().max(200).optional().or(z.literal('')),
  address: z.string().trim().max(300).optional(), paymentTerms: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(1000).optional(), isActive: z.boolean().optional(),
});
const supplierPatch = supplierBody.partial();
const supplierQuery = z.object({ q: z.string().trim().max(80).optional(), active: bool, ...paging });
const poItems = z.array(z.object({ variantId: objectId, quantity: z.number().int().min(1).max(100000), costPerUnit: z.number().min(0).max(10000000) })).min(1).max(50);
const poCreate = z.object({ supplierId: objectId, items: poItems, expectedDate: z.coerce.date().optional() });
const poPatch = z.object({ supplierId: objectId, items: poItems, expectedDate: z.coerce.date().nullable() }).partial();
const poReceive = z.object({ items: z.array(z.object({ variantId: objectId, quantity: z.number().int().min(1).max(100000) })).min(1).max(50), confirmPassword });
const poQuery = z.object({ q: z.string().trim().max(40).optional(), status: z.enum(['Draft', 'Ordered', 'Partially Received', 'Received', 'Cancelled']).optional(), supplierId: objectId.optional(), ...paging });
const thresholdBody = z.object({ lowStockThreshold: z.number().int().min(0).max(100000) });

// ---------- Phase 7: returns & refunds ----------
const returnLines = z.array(z.object({ orderItemId: objectId, quantity: z.number().int().min(1).max(20) })).min(1, 'Choose at least one item').max(30);
const returnCreate = z.object({
  orderNumber: z.string().trim().toUpperCase().min(4).max(30),
  items: returnLines,
  reason: z.enum(C.RETURN_REASONS),
  details: z.string().trim().max(500).optional(),
}).superRefine((v, ctx) => {
  if (v.reason === 'Other' && !(v.details && v.details.length >= 5)) ctx.addIssue({ code: 'custom', path: ['details'], message: 'Please tell us a little more' });
});
const returnStatusBody = z.object({
  status: z.enum(['Approved', 'Rejected', 'Received']),
  note: z.string().trim().max(300).optional(),                 // shown to the customer
  condition: z.enum(C.RETURN_CONDITIONS).optional(),           // required when goods are received
}).superRefine((v, ctx) => {
  if (v.status === 'Rejected' && !v.note) ctx.addIssue({ code: 'custom', path: ['note'], message: 'Tell the customer why the return was declined' });
  if (v.status === 'Received' && !v.condition) ctx.addIssue({ code: 'custom', path: ['condition'], message: 'Say whether the items can be resold' });
});
const refundBody = z.object({
  amount: z.number().int('Enter a whole number of rupees').min(1, 'Enter an amount').max(10000000),
  method: z.enum(C.REFUND_METHODS),
  reference: z.string().trim().max(100).optional(),
  reason: z.string().trim().min(3, 'Add a short reason').max(300),
  confirmPassword,
});
const returnsQuery = z.object({ q: z.string().trim().max(60).optional(), status: z.enum(C.RETURN_STATUSES).optional(), ...paging });
const myReturnsQuery = z.object({ orderNumber: z.string().trim().toUpperCase().max(30).optional(), ...paging });

module.exports = {
  returnCreate, returnStatusBody, refundBody, returnsQuery, myReturnsQuery,
  quoteBody, cartBody, addressBody, addressPatch, myOrdersQuery,
  taxonomyBody, taxonomyPatch, taxonomyQuery, supplierBody, supplierPatch, supplierQuery, poCreate, poPatch, poReceive, poQuery, thresholdBody,
  changePasswordBody, staffQuery, staffCreate, staffPatch, staffPasswordBody, overrideBody, roleCreate, roleUpdate, historyQuery2, auditQuery,
  registerBody, customerLoginBody, profilePatch, customerChangePassword, forgotBody, resetBody,
  loginBody, productCreate, productPatch, variantCreate, variantPatch, publicProductsQuery, adminProductsQuery,
  adjustBody, inventoryQuery, historyQuery, checkoutBody, trackQuery, ordersQuery, statusBody, noteBody, paymentBody,
};
