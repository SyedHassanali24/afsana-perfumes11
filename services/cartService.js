const { Cart, Wishlist, Product, ProductVariant, Inventory, Coupon, AffiliatePartner } = require('../database/models');
const { ApiError, E } = require('../middleware/errors');
const { effectivePrice, validateCoupon, calcDiscount } = require('./pricing');
const { mergeItems, lineStatus, summarize } = require('./cartRules');
const { loadContext, deliveryFor } = require('./shippingQuote');
const { validatePartner, discountFor, normalizeCode } = require('./affiliateRules');

const mainImage = (p) => ((p.media || []).find((m) => m.kind === 'main') || (p.media || [])[0] || {}).url;
const card = (p) => ({ id: p._id, name: p.name, slug: p.slug, priceFrom: p.priceFrom, ratingAvg: p.ratingAvg, ratingCount: p.ratingCount, image: (p.media || []).find((m) => m.kind === 'main') || (p.media || [])[0] || null });

// ---------- quote: prices a list of { variantId, quantity } from the DB. Never trusts client prices. Never throws for stale items. ----------
async function quote({ items, couponCode, referralCode, city }, cust) {
  let stage = 'merge cart items';
  try {
  const merged = mergeItems(items);
  const ids = merged.map((i) => i.variantId);
  // Load shipping settings alongside the first lookup, then fetch product and stock
  // records together. These reads are independent and keep checkout quote latency down.
  stage = 'load variants and shipping settings';
  const [variants, ship] = await Promise.all([
    ids.length ? ProductVariant.find({ _id: { $in: ids }, isActive: true, isDeleted: false }).lean() : Promise.resolve([]),
    loadContext(),
  ]);
  stage = 'load products and inventory';
  const [products, inv] = await Promise.all([
    variants.length ? Product.find({ _id: { $in: variants.map((v) => v.productId) }, status: 'Active', isDeleted: false }).select('name slug media categoryId').lean() : Promise.resolve([]),
    ids.length ? Inventory.find({ variantId: { $in: ids } }).select('variantId current reserved').lean() : Promise.resolve([]),
  ]);
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

  const priced = lines.filter((l) => l.status === 'ok' || l.status === 'limited');
  const subtotal = priced.reduce((s, l) => s + l.lineTotal, 0);
  stage = 'calculate city delivery fee';
  const delivery = await deliveryFor(city, subtotal, ship); // city fee (zone) or the Settings fee when the city has no zone
  let discount = 0; let shippingDiscount = 0; let coupon = null; let appliedReferral = null;
  if (priced.length) {
    const manualCode = normalizeCode(couponCode);
    const linkCode = normalizeCode(referralCode);
    stage = 'load coupon and referral codes';
    const [regularCoupon, linkPartner] = await Promise.all([
      manualCode ? Coupon.findOne({ code: manualCode, isDeleted: false }) : Promise.resolve(null),
      linkCode ? AffiliatePartner.findOne({ code: linkCode, storeId: 'main', isDeleted: false, isActive: true }) : Promise.resolve(null),
    ]);
    const manualPartner = manualCode && !regularCoupon
      ? await AffiliatePartner.findOne({ code: manualCode, storeId: 'main', isDeleted: false, isActive: true })
      : null;

    if (manualPartner || (!manualCode && linkCode)) {
      const partner = manualPartner || linkPartner;
      if (!partner) {
        coupon = { code: manualCode || linkCode, valid: false, message: 'This referral code is not active.' };
      } else {
        const problem = validatePartner(partner, { subtotal, customerId: cust?.customer?._id });
        if (problem) coupon = { code: partner.code, valid: false, message: problem };
        else {
          ({ discount, shippingDiscount } = discountFor(partner, subtotal, delivery.fee));
          coupon = { code: partner.code, valid: true, kind: 'referral' };
          appliedReferral = { code: partner.code, name: partner.name, discountApplied: discount + shippingDiscount, source: manualPartner ? 'promo_code' : 'referral_link' };
        }
      }
    } else if (regularCoupon) {
      try {
        const cid = cust && cust.customer._id;
        stage = 'validate coupon and discount';
        validateCoupon(regularCoupon, {
          subtotal, customerId: cid,
          customerUses: cid ? (regularCoupon.usage || []).filter((u) => String(u.customerId) === String(cid)).length : 0,
          isFirstOrder: !cust || ((cust.customer.stats && cust.customer.stats.ordersCount) || 0) === 0,
        });
        ({ discount, shippingDiscount } = calcDiscount(regularCoupon, priced, delivery.fee));
        coupon = { code: regularCoupon.code, valid: true, kind: 'coupon' };
        // A valid first-touch referral is recorded, but its discount never stacks with a coupon.
        if (linkPartner && !validatePartner(linkPartner, { subtotal, customerId: cust?.customer?._id })) {
          appliedReferral = { code: linkPartner.code, name: linkPartner.name, discountApplied: 0, source: 'referral_link' };
        }
      } catch (e) {
        if (!(e instanceof ApiError)) throw e;
        coupon = { code: manualCode, valid: false, message: e.message };
      }
    } else if (manualCode) {
      try {
        validateCoupon(null, {
          subtotal, customerId: cust?.customer?._id,
          customerUses: 0, isFirstOrder: !cust || ((cust.customer.stats && cust.customer.stats.ordersCount) || 0) === 0,
        });
      } catch (e) {
        if (!(e instanceof ApiError)) throw e;
        coupon = { code: manualCode, valid: false, message: e.message };
      }
    }
  }
  stage = 'build cart quote response';
  return {
    lines: lines.map(({ categoryId, ...l }) => l), coupon, referral: appliedReferral,
    ...summarize(lines, ship.cfg, { discount, shippingDiscount, delivery }),
    delivery: { city: city || '', zone: delivery.zone, method: delivery.method, estDays: delivery.estDays, source: delivery.source },
  };
  } catch (error) {
    if (error && typeof error === 'object') error.afsanaStage = stage;
    throw error;
  }
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
