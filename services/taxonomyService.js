// Categories, collections, brands and fragrance families share one shape and one service.
const { Category, Collection, Brand, FragranceFamily, Product } = require('../database/models');
const { E } = require('../middleware/errors');
const { paging, pageMeta, escapeRegex } = require('../middleware/pagination');
const { audit } = require('./audit');
const { scopeFilter } = require('../middleware/permissions');
const SCOPE_MAP = { stores: 'storeId' };
const storeFilter = (scopes, uid) => scopeFilter(scopes, uid, SCOPE_MAP);
const createStoreId = (scopes) => {
  if (scopes?.some((s) => s.kind === 'all')) return 'main';
  const stores = [...new Set((scopes || []).filter((s) => s.kind === 'stores').flatMap((s) => s.values || []))];
  if (stores.length !== 1) throw E.forbidden('Catalog entries must belong to exactly one store in your access scope.');
  return stores[0];
};

// productField = where products point at this kind of entry; `array` = the field holds many ids.
// Fragrance families are permissioned under `categories` (there is no separate module for them).
const TYPES = {
  categories: { Model: Category, module: 'categories', productField: 'categoryId', label: 'category' },
  collections: { Model: Collection, module: 'collections', productField: 'collectionIds', array: true, label: 'collection' },
  brands: { Model: Brand, module: 'brands', productField: 'brandId', label: 'brand' },
  'fragrance-families': { Model: FragranceFamily, module: 'categories', productField: 'fragrance.familyId', label: 'fragrance family' },
};
const cfg = (type) => { const c = TYPES[type]; if (!c) throw E.notFound('Unknown catalog type.'); return c; };
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'item';

async function uniqueSlug(Model, base, excludeId) {
  let slug = slugify(base), n = 1;
  while (await Model.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) slug = `${slugify(base)}-${++n}`;
  return slug;
}
async function usage(c, scopes, uid) {
  const pipe = [{ $match: { isDeleted: false, ...storeFilter(scopes, uid) } }];
  if (c.array) pipe.push({ $unwind: `$${c.productField}` });
  pipe.push({ $group: { _id: `$${c.productField}`, n: { $sum: 1 } } });
  return new Map((await Product.aggregate(pipe)).filter((r) => r._id).map((r) => [String(r._id), r.n]));
}
const shape = (r, used) => ({
  id: r._id, name: r.name, slug: r.slug, description: r.description, image: r.image, sortOrder: r.sortOrder, isActive: r.isActive,
  seo: r.seo, parentId: r.parentId || null, productCount: used.get(String(r._id)) || 0,
});

async function list(type, q, scopes, uid) {
  const c = cfg(type);
  const { page, limit, skip } = paging(q);
  const filter = { isDeleted: false, ...storeFilter(scopes, uid) };
  if (q.active !== undefined) filter.isActive = q.active;
  if (q.q) filter.name = new RegExp(escapeRegex(q.q), 'i');
  const [rows, total, used] = await Promise.all([
    c.Model.find(filter).sort({ sortOrder: 1, name: 1 }).skip(skip).limit(limit).lean(), c.Model.countDocuments(filter), usage(c, scopes, uid),
  ]);
  return { items: rows.map((r) => shape(r, used)), pagination: pageMeta(total, page, limit) };
}

// Categories are at most two levels deep: a parent must itself be top-level.
async function checkParent(id, parentId, scopes, uid) {
  if (!parentId) return;
  if (String(parentId) === String(id)) throw E.badRequest('A category cannot be its own parent.');
  const parent = await Category.findOne({ _id: parentId, isDeleted: false, ...storeFilter(scopes, uid) });
  if (!parent) throw E.badRequest('Parent category not found.');
  if (parent.parentId) throw E.badRequest('Categories can only be nested one level deep.');
  if (id && (await Category.exists({ parentId: id, isDeleted: false, ...storeFilter(scopes, ctx.user._id) }))) throw E.badRequest('This category has sub-categories, so it cannot become a sub-category itself.');
}

async function create(ctx, type, body, scopes) {
  const c = cfg(type);
  const { parentId, ...data } = body;
  data.storeId = createStoreId(scopes);
  if (type === 'categories') { await checkParent(null, parentId, scopes, ctx.user._id); if (parentId) data.parentId = parentId; }
  if (data.slug) { if (await c.Model.exists({ slug: data.slug })) throw E.conflict('That slug is already used.'); }
  else data.slug = await uniqueSlug(c.Model, data.name);
  const doc = await c.Model.create(data);
  await audit(ctx, { action: `${c.label.replace(' ', '_')}.created`, module: c.module, recordId: doc._id, newValue: { name: doc.name, slug: doc.slug } });
  return { item: shape(doc.toObject(), new Map()) };
}

async function update(ctx, type, id, body, scopes) {
  const c = cfg(type);
  const doc = await c.Model.findOne({ _id: id, isDeleted: false, ...storeFilter(scopes, ctx.user._id) });
  if (!doc) throw E.notFound(`${c.label[0].toUpperCase()}${c.label.slice(1)} not found.`);
  const before = { name: doc.name, slug: doc.slug, isActive: doc.isActive };
  const { parentId, ...data } = body;
  if (data.slug && data.slug !== doc.slug && (await c.Model.exists({ slug: data.slug, _id: { $ne: id } }))) throw E.conflict('That slug is already used.');
  if (type === 'categories' && parentId !== undefined) { await checkParent(id, parentId, scopes, ctx.user._id); doc.parentId = parentId || undefined; }
  Object.assign(doc, data);
  await doc.save();
  await audit(ctx, { action: `${c.label.replace(' ', '_')}.updated`, module: c.module, recordId: id, oldValue: before, newValue: { name: doc.name, slug: doc.slug, isActive: doc.isActive } });
  return { item: shape(doc.toObject(), await usage(c, scopes, ctx.user._id)) };
}

async function remove(ctx, type, id, scopes) {
  const c = cfg(type);
  const doc = await c.Model.findOne({ _id: id, isDeleted: false, ...storeFilter(scopes, ctx.user._id) });
  if (!doc) throw E.notFound(`${c.label[0].toUpperCase()}${c.label.slice(1)} not found.`);
  const n = (await usage(c, scopes, ctx.user._id)).get(String(id)) || 0;
  if (n) throw E.conflict(`${n} product${n === 1 ? ' uses' : 's use'} this ${c.label}. Move ${n === 1 ? 'it' : 'them'} first, or mark this ${c.label} inactive instead.`);
  if (type === 'categories' && (await Category.exists({ parentId: id, isDeleted: false }))) throw E.conflict('This category still has sub-categories.');
  await c.Model.updateOne({ _id: id }, { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: ctx.user._id, isActive: false } });
  await audit(ctx, { action: `${c.label.replace(' ', '_')}.deleted`, module: c.module, recordId: id, oldValue: { name: doc.name } });
  return {};
}

// Storefront menus / filters: active entries only, no internal fields.
async function publicList(type) {
  const c = cfg(type);
  const rows = await c.Model.find({ isDeleted: false, isActive: true }).sort({ sortOrder: 1, name: 1 }).select('name slug description image parentId').lean();
  return { items: rows.map((r) => ({ id: r._id, name: r.name, slug: r.slug, description: r.description, image: r.image, parentId: r.parentId || null })) };
}

module.exports = { TYPES, list, create, update, remove, publicList, slugify };
