const { Cart, Wishlist, Product, ProductVariant, Inventory, Coupon } = require('../database/models');
const { ApiError, E } = require('../middleware/errors');
const { effectivePrice, calcShipping, validateCoupon, calcDiscount } = require('./pricing');
const { mergeItems, lineStatus, summarize } = require('./cartRules');
const { shippingSettings } = require('./orderService');

const mainImage = (p) => ((p.media || []).find((m) => m.kind === 'main') || (p.media || [])[0] || {}).url;
const card = (p) => ({ id: p._id, name: p.name, slug: p.slug, priceFrom: p.priceFrom, ratingAvg: p.ratingAvg, ratingCount: p.ratingCount, image: (p.media || []).find((m) => m.kind === 'main') || (p.media || [])[0] || null });

// ---------- quote: prices a list of { variantId, quantity } from the DB. Never trusts client prices. Never throws for stale items. ----------
async function quote({ items, couponCode }, cust) {
  const merged = mergeItems(items);
  const ids = merged.map((i) => i.variantId);
  const variants = ids.length ? await ProductVariant.find({ _id: { $in: ids }, isActive: true, isDeleted: false }).lean() : [];
  const products = variants.length ? await Product.find({ _id: { $in: variants.map((v) => v.productId) }, status: 'Active', isDeleted: false }).select('name slug media categoryId').lean() : [];
  const inv = ids.length ? await Inventory.find({ variantId: { $in: ids } }).select('variantId current reserved').lean() : [];
  const vById = new Map(variants.map((v) => [String(v._id), v]));
  const pById = new Map(products.map((p) => [String(p._id), p]));
  const stock = new Map(inv.map((i) => [String(i.variantId), Math.max(0, i.current - i.reserved)]));

  const lines = merged.map(({ variantId, quantity }) => {
    const v = vById.get(variantId); const p = v && pById.get(String(v.productId));
    if (!v || !p) return { variantId, quantity, status: 'unavailable', name: 'This item is no longer available', unitPrice: 0, lineTotal: 0, available: 0 };
    const available = stock.get(variantId) || 0; const unitPrice = effectivePrice(v);
    return {
      variantId, productId: p._id, categoryId: p.categoryId, slug: p.slug, name: p.name, label: v.label || `${v.sizeMl}ml`, sizeMl: v.sizeMl, image: mainImage(p),
      unitPrice, compareAt: unitPrice < v.price ? v.price : undefined, quantity, lineTotal: unitPrice * quantity, available,
      status: lineStatus({ found: true, available, quantity }),
    };
  });

  const ship = await shippingSettings();
  const priced = lines.filter((l) => l.status === 'ok' || l.status === 'limited');
  const subtotal = priced.reduce((s, l) => s + l.lineTotal, 0);
  let discount = 0; let shippingDiscount = 0; let coupon = null;
  if (couponCode && priced.length) {
    const code = couponCode.toUpperCase();
    try {
      const c = await Coupon.findOne({ code, isDeleted: false });
      const cid = cust && cust.customer._id;
      validateCoupon(c, {
        subtotal, customerId: cid,
        customerUses: c && cid ? (c.usage || []).filter((u) => String(u.customerId) === String(cid)).length : 0,
        isFirstOrder: !cust || ((cust.customer.stats && cust.customer.stats.ordersCount) || 0) === 0,
      });
      ({ discount, shippingDiscount } = calcDiscount(c, priced, calcShipping(subtotal, ship)));
      coupon = { code: c.code, valid: true };
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
      coupon = { code, valid: false, message: e.message }; // shown next to the coupon box, does not break the cart
    }
  }
  return { lines: lines.map(({ categoryId, ...l }) => l), coupon, ...summarize(lines, ship, { discount, shippingDiscount }) };
}

// ---------- logged-in customer's saved cart ----------
async function liveVariantIds(items) {
  if (!items.length) return new Set();
  const rows = await ProductVariant.find({ _id: { $in: items.map((i) => i.variantId) }, isDeleted: false }).select('_id').lean();
  return new Set(rows.map((r) => String(r._id)));
}
const shapeCart = (c) => ({ items: ((c && c.items) || []).map((i) => ({ variantId: String(i.variantId), quantity: i.quantity })), couponCode: (c && c.couponCode) || undefined });

async function getCart(ctx) { return shapeCart(await Cart.findOne({ customerId: ctx.customer._id }).lean()); }

async function saveCart(ctx, { items, couponCode }) {
  const live = await liveVariantIds(mergeItems(items));
  const clean = mergeItems(items).filter((i) => live.has(i.variantId)); // drop ids that do not exist at all
  const code = couponCode ? couponCode.toUpperCase() : undefined;
  const c = await Cart.findOneAndUpdate({ customerId: ctx.customer._id },
    { $set: { items: clean, lastActivityAt: new Date(), ...(code ? { couponCode: code } : {}) }, ...(code ? {} : { $unset: { couponCode: 1 } }) },
    { upsert: true, new: true });
  return shapeCart(c);
}

// Called once after login: guest items are added to whatever the account already had.
async function mergeCart(ctx, { items, couponCode }) {
  const server = await getCart(ctx);
  return saveCart(ctx, { items: mergeItems(server.items, items), couponCode: couponCode || server.couponCode });
}

// ---------- wishlist ----------
async function getWishlist(ctx) {
  const w = await Wishlist.findOne({ customerId: ctx.customer._id }).lean();
  const ids = ((w && w.productIds) || []).map(String);
  const rows = ids.length ? await Product.find({ _id: { $in: ids }, status: 'Active', isDeleted: false }).select('name slug priceFrom media ratingAvg ratingCount').lean() : [];
  return { ids, products: rows.map(card) };
}
async function addToWishlist(ctx, productId) {
  if (!(await Product.exists({ _id: productId, status: 'Active', isDeleted: false }))) throw E.notFound('Product not found.');
  await Wishlist.updateOne({ customerId: ctx.customer._id }, { $addToSet: { productIds: productId } }, { upsert: true });
  return {};
}
async function removeFromWishlist(ctx, productId) {
  await Wishlist.updateOne({ customerId: ctx.customer._id }, { $pull: { productIds: productId } });
  return {};
}
module.exports = { quote, getCart, saveCart, mergeCart, getWishlist, addToWishlist, removeFromWishlist };
