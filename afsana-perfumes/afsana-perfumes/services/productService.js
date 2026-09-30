const { Product, ProductVariant, Inventory, InventoryTransaction, Category, Collection, Brand, FragranceFamily } = require('../database/models');
const { E } = require('../middleware/errors');
const { paging: pg, pageMeta, escapeRegex } = require('../middleware/pagination');
const { scopeFilter } = require('../middleware/permissions');
const { effectivePrice } = require('./pricing');
const { withTx } = require('./tx');
const { audit } = require('./audit');

const SCOPE_MAP = { categories: 'categoryId', createdBy: 'createdBy', products: '_id', stores: 'storeId' };
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function uniqueSlug(base, excludeId) {
  let slug = slugify(base), n = 1;
  while (await Product.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) slug = `${slugify(base)}-${++n}`;
  return slug;
}
async function stockByProduct(ids) {
  const rows = await Inventory.aggregate([{ $match: { productId: { $in: ids } } }, { $group: { _id: '$productId', current: { $sum: '$current' }, reserved: { $sum: '$reserved' } } }]);
  return new Map(rows.map((r) => [String(r._id), { current: r.current, available: r.current - r.reserved }]));
}
async function recomputePriceFrom(productId, session) {
  const vs = await ProductVariant.find({ productId, isActive: true, isDeleted: false }).session(session || null);
  const priceFrom = vs.length ? Math.min(...vs.map(effectivePrice)) : undefined;
  await Product.updateOne({ _id: productId }, { $set: { priceFrom } }, session ? { session } : {});
}

// ---------------- public storefront ----------------
async function listPublic(q) {
  const { page, limit, skip } = pg(q);
  const filter = { status: 'Active', isDeleted: false };
  if (q.category) { const c = await Category.findOne({ slug: q.category, isDeleted: false }); filter.categoryId = c ? c._id : null; }
  if (q.collection) { const c = await Collection.findOne({ slug: q.collection, isDeleted: false }); filter.collectionIds = c ? c._id : null; }
  if (q.gender) filter['fragrance.gender'] = q.gender;
  if (q.minPrice !== undefined || q.maxPrice !== undefined) filter.priceFrom = { ...(q.minPrice !== undefined && { $gte: q.minPrice }), ...(q.maxPrice !== undefined && { $lte: q.maxPrice }) };
  let sort = { createdAt: -1 };
  if (q.sort === 'price_asc') sort = { priceFrom: 1 }; else if (q.sort === 'price_desc') sort = { priceFrom: -1 }; else if (q.sort === 'popular') sort = { ratingCount: -1 };
  let projection = 'name slug priceFrom media tags ratingAvg ratingCount fragrance.gender categoryId';
  if (q.q) { filter.$text = { $search: q.q }; projection += ' score'; sort = { score: { $meta: 'textScore' } }; }
  const [rows, total] = await Promise.all([
    Product.find(filter, q.q ? { score: { $meta: 'textScore' }, ...Object.fromEntries(projection.split(' ').map((f) => [f, 1])) } : projection).sort(sort).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);
  const stock = await stockByProduct(rows.map((r) => r._id));
  return {
    products: rows.map((p) => ({
      id: p._id, name: p.name, slug: p.slug, priceFrom: p.priceFrom, tags: p.tags, ratingAvg: p.ratingAvg, ratingCount: p.ratingCount,
      gender: p.fragrance && p.fragrance.gender, image: (p.media || []).find((m) => m.kind === 'main') || (p.media || [])[0] || null,
      inStock: ((stock.get(String(p._id)) || {}).available || 0) > 0,
    })),
    pagination: pageMeta(total, page, limit),
  };
}
async function getPublicBySlug(slug) {
  const p = await Product.findOne({ slug, status: 'Active', isDeleted: false }).select('-createdBy').lean();
  if (!p) throw E.notFound('Product not found.');
  const variants = await ProductVariant.find({ productId: p._id, isActive: true, isDeleted: false }).sort({ sizeMl: 1 }).lean();
  const inv = await Inventory.find({ productId: p._id }).lean();
  const avail = new Map(inv.map((i) => [String(i.variantId), Math.max(0, i.current - i.reserved)]));
  const related = await Product.find({ categoryId: p.categoryId, status: 'Active', isDeleted: false, _id: { $ne: p._id } }).select('name slug priceFrom media').limit(4).lean();
  return {
    product: p,
    variants: variants.map((v) => ({ id: v._id, label: v.label, sizeMl: v.sizeMl, price: v.price, salePrice: v.salePrice, available: avail.get(String(v._id)) || 0 })), // costPrice never public
    related,
  };
}

// ---------------- admin ----------------
async function listAdmin(q, scopes, uid, { trash = false } = {}) {
  const { page, limit, skip } = pg(q);
  const filter = { isDeleted: trash, ...scopeFilter(scopes, uid, SCOPE_MAP) };
  if (q.status) filter.status = q.status;
  if (q.category) filter.categoryId = q.category;
  if (q.q) { const r = new RegExp(escapeRegex(q.q), 'i'); filter.$or = [...(filter.$or || []), { name: r }, { sku: r }]; }
  const [rows, total] = await Promise.all([
    Product.find(filter).select('name slug sku status categoryId priceFrom tags media createdAt').sort({ createdAt: -1 }).skip(skip).limit(limit).populate('categoryId', 'name').lean(),
    Product.countDocuments(filter),
  ]);
  const stock = await stockByProduct(rows.map((r) => r._id));
  return {
    products: rows.map((p) => ({ ...p, category: p.categoryId && p.categoryId.name, categoryId: p.categoryId && p.categoryId._id, stock: (stock.get(String(p._id)) || { current: 0, available: 0 }) })),
    pagination: pageMeta(total, page, limit),
  };
}
// Everything the product form needs for its dropdowns (active entries only).
async function listCategories() {
  const opts = (M) => M.find({ isDeleted: false, isActive: true }).select('name slug').sort({ sortOrder: 1, name: 1 }).lean()
    .then((rows) => rows.map((c) => ({ id: c._id, name: c.name, slug: c.slug })));
  const [categories, brands, collections, families] = await Promise.all([opts(Category), opts(Brand), opts(Collection), opts(FragranceFamily)]);
  return { categories, brands, collections, families };
}
async function getAdmin(id, scopes, uid) {
  const p = await Product.findOne({ _id: id, ...scopeFilter(scopes, uid, SCOPE_MAP) }).lean();
  if (!p) throw E.notFound('Product not found.');
  const variants = await ProductVariant.find({ productId: id, isDeleted: false }).sort({ sizeMl: 1 }).lean();
  const inv = await Inventory.find({ productId: id }).lean();
  const byV = new Map(inv.map((i) => [String(i.variantId), i]));
  return { product: p, variants: variants.map((v) => ({ ...v, stock: byV.get(String(v._id)) || null })) };
}

async function createProduct(ctx, body) {
  const denyCost = ctx.perms.deniedFields.has('product.costPrice');
  const { variants, ...data } = body;
  data.slug = data.slug || (await uniqueSlug(data.name));
  const product = await withTx(async (session) => {
    const [p] = await Product.create([{ ...data, createdBy: ctx.user._id }], { session });
    for (const v of variants) {
      const { stock, costPrice, ...vd } = v;
      const [variant] = await ProductVariant.create([{ ...vd, ...(denyCost ? {} : { costPrice }), productId: p._id, label: vd.label || `${vd.sizeMl}ml` }], { session });
      await Inventory.create([{ variantId: variant._id, productId: p._id, current: stock }], { session });
      if (stock > 0) await InventoryTransaction.create([{ variantId: variant._id, productId: p._id, type: 'opening', delta: stock, before: 0, after: stock, by: ctx.user._id }], { session });
    }
    await recomputePriceFrom(p._id, session);
    await audit(ctx, { action: 'product.created', module: 'products', recordId: p._id, newValue: { name: p.name, sku: p.sku } }, session);
    return p;
  });
  return product;
}

async function updateProduct(ctx, id, body, scopes) {
  const before = await Product.findOne({ _id: id, isDeleted: false, ...scopeFilter(scopes, ctx.user._id, SCOPE_MAP) });
  if (!before) throw E.notFound('Product not found.');
  if (body.status && body.status !== before.status) {
    await audit(ctx, { action: 'product.status_changed', module: 'products', recordId: id, oldValue: before.status, newValue: body.status });
  }
  Object.assign(before, body);
  await before.save();
  return before;
}

const PRICE_FIELDS = ['price', 'salePrice', 'costPrice'];
async function updateVariant(ctx, productId, variantId, body) {
  const { confirmPassword, ...patch } = body;
  const touchesPrice = PRICE_FIELDS.some((f) => patch[f] !== undefined);
  if (touchesPrice) {
    if (!ctx.perms.can('products', 'managePrice')) throw E.forbidden('You cannot change prices.');
    if (patch.costPrice !== undefined && ctx.perms.deniedFields.has('product.costPrice')) throw E.forbidden('You cannot change cost prices.');
    await ctx.reauth(confirmPassword); // high-risk
  }
  return withTx(async (session) => {
    const v = await ProductVariant.findOne({ _id: variantId, productId, isDeleted: false }).session(session);
    if (!v) throw E.notFound('Variant not found.');
    const oldValue = Object.fromEntries(PRICE_FIELDS.map((f) => [f, v[f]]));
    Object.assign(v, patch);
    await v.save({ session });
    if (touchesPrice) {
      await recomputePriceFrom(productId, session);
      await audit(ctx, { action: 'variant.price_changed', module: 'products', recordId: variantId, oldValue, newValue: Object.fromEntries(PRICE_FIELDS.map((f) => [f, v[f]])) }, session);
    }
    return v;
  });
}
async function addVariant(ctx, productId, body) {
  if (!(await Product.exists({ _id: productId, isDeleted: false }))) throw E.notFound('Product not found.');
  const { stock, costPrice, ...vd } = body;
  return withTx(async (session) => {
    const [v] = await ProductVariant.create([{ ...vd, ...(ctx.perms.deniedFields.has('product.costPrice') ? {} : { costPrice }), productId, label: vd.label || `${vd.sizeMl}ml` }], { session });
    await Inventory.create([{ variantId: v._id, productId, current: stock }], { session });
    if (stock > 0) await InventoryTransaction.create([{ variantId: v._id, productId, type: 'opening', delta: stock, before: 0, after: stock, by: ctx.user._id }], { session });
    await recomputePriceFrom(productId, session);
    return v;
  });
}

// Soft-deletes ONE size. Blocked while units are reserved for open orders, and the last remaining size can't be removed.
async function removeVariant(ctx, productId, variantId) {
  return withTx(async (session) => {
    const v = await ProductVariant.findOne({ _id: variantId, productId, isDeleted: false }).session(session);
    if (!v) throw E.notFound('Size not found.');
    if ((await ProductVariant.countDocuments({ productId, isDeleted: false }).session(session)) <= 1) throw E.conflict('A product needs at least one size. Delete the product instead.');
    const inv = await Inventory.findOne({ variantId }).session(session);
    if (inv && inv.reserved > 0) throw E.conflict(`${inv.reserved} unit(s) of this size are reserved for open orders.`);
    await ProductVariant.updateOne({ _id: variantId }, { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: ctx.user._id } }, { session });
    await recomputePriceFrom(productId, session);
    await audit(ctx, { action: 'variant.deleted', module: 'products', recordId: variantId, oldValue: { sku: v.sku, price: v.price, stock: inv ? inv.current : 0 } }, session);
    return v;
  });
}

async function setDeleted(ctx, id, isDeleted, scopes) {
  return withTx(async (session) => {
    const p = await Product.findOne({ _id: id, isDeleted: !isDeleted, ...scopeFilter(scopes, ctx.user._id, SCOPE_MAP) }).session(session);
    if (!p) throw E.notFound('Product not found.');
    const stamp = isDeleted ? { isDeleted: true, deletedAt: new Date(), deletedBy: ctx.user._id } : { isDeleted: false, deletedAt: null, deletedBy: null };
    await Product.updateOne({ _id: id }, { $set: stamp }, { session });
    await ProductVariant.updateMany({ productId: id }, { $set: stamp }, { session });
    await audit(ctx, { action: isDeleted ? 'product.deleted' : 'product.restored', module: 'products', recordId: id, oldValue: { name: p.name } }, session);
    return p;
  });
}
module.exports = { listPublic, getPublicBySlug, listAdmin, listCategories, getAdmin, createProduct, updateProduct, updateVariant, addVariant, removeVariant, setDeleted };
