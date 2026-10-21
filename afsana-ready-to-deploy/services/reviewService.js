const { Review, Product, Order, OrderItem, Customer, Notification } = require('../database/models');
const { E } = require('../middleware/errors');
const { paging, pageMeta, escapeRegex } = require('../middleware/pagination');
const { audit } = require('./audit');
const R = require('./reviewRules');

const ID = /^[a-f\d]{24}$/i;

async function publicProduct(slug) {
  const p = await Product.findOne({ slug: String(slug || ''), status: 'Active', isDeleted: false }).select('_id name slug').lean();
  if (!p) throw E.notFound('Product not found.');
  return p;
}
// Keeps Product.ratingAvg / ratingCount (shown on cards and used by "popular" sorting) in step with the PUBLIC reviews.
async function recalcProduct(productId) {
  const rows = await Review.find({ productId, status: { $in: R.PUBLIC }, isDeleted: false }).select('rating').lean();
  const s = R.summarize(rows);
  await Product.updateOne({ _id: productId }, { $set: { ratingAvg: s.avg, ratingCount: s.count } });
  return s;
}
// "Verified buyer": the shopper has a Delivered order that contains this product. Returns that order's id (or null).
async function deliveredOrderFor(customerId, productId) {
  const orders = await Order.find({ customerId, status: 'Delivered' }).select('_id').sort({ createdAt: -1 }).lean();
  if (!orders.length) return null;
  const item = await OrderItem.findOne({ orderId: { $in: orders.map((o) => o._id) }, productId }).select('orderId').lean();
  return item ? item.orderId : null;
}

// ---------------- public ----------------
// All public reviews of a product (featured first, then newest), summary over ALL of them, paged in memory (a perfume has tens of reviews, not thousands).
async function listPublic(slug, q) {
  const p = await publicProduct(slug);
  const { page, limit, skip } = paging(q);
  const rows = R.sortPublic(await Review.find({ productId: p._id, status: { $in: R.PUBLIC }, isDeleted: false }).select('rating title text status createdAt customerId').lean());
  const names = new Map((await Customer.find({ _id: { $in: rows.slice(skip, skip + limit).map((r) => r.customerId) } }).select('name').lean()).map((c) => [String(c._id), c.name]));
  return {
    summary: R.summarize(rows),
    reviews: rows.slice(skip, skip + limit).map((r) => R.publicShape(r, names.get(String(r.customerId)))),
    pagination: pageMeta(rows.length, page, limit),
  };
}

// ---------------- signed-in shopper ----------------
async function mine(ctx, slug) {
  const p = await publicProduct(slug);
  const [review, order] = await Promise.all([Review.findOne({ productId: p._id, customerId: ctx.customer._id }).lean(), deliveredOrderFor(ctx.customer._id, p._id)]);
  return { canReview: Boolean(order), review: review ? R.ownShape(review) : null };
}
async function saveMine(ctx, slug, body) {
  const p = await publicProduct(slug);
  const orderId = await deliveredOrderFor(ctx.customer._id, p._id);
  if (!orderId) throw E.forbidden('Only customers who have received this perfume can review it.');
  const fields = { rating: body.rating, title: R.cleanText(body.title), text: R.cleanText(body.text) };
  const existing = await Review.findOne({ productId: p._id, customerId: ctx.customer._id });
  let review;
  if (existing) {
    const wasPublic = R.isPublic(existing.status);
    review = await Review.findByIdAndUpdate(existing._id, { $set: { ...fields, status: R.statusAfterEdit(existing.status) }, $unset: { moderatedBy: 1 } }, { new: true }).lean();
    if (wasPublic) await recalcProduct(p._id); // an edited review leaves the public list until staff approve it again
  } else {
    try { review = (await Review.create({ productId: p._id, customerId: ctx.customer._id, orderId, ...fields })).toObject(); }
    catch (e) { if (e && e.code === 11000) throw E.conflict('You have already reviewed this perfume.'); throw e; }
  }
  await Notification.create({ type: 'new_review', title: 'New review to approve', body: `${p.name} · ${fields.rating}/5`, link: '/admin/reviews', forPermission: 'reviews.view' }).catch(() => {});
  return { review: R.ownShape(review) };
}
async function removeMine(ctx, slug) {
  const p = await publicProduct(slug);
  const gone = await Review.findOneAndDelete({ productId: p._id, customerId: ctx.customer._id }); // hard delete: the unique (product, customer) index would otherwise block a new review
  if (gone && R.isPublic(gone.status)) await recalcProduct(p._id);
  return {};
}

// ---------------- staff ----------------
async function listAdmin(q) {
  const { page, limit, skip } = paging(q);
  const and = [{ isDeleted: false }];
  if (q.status) and.push({ status: q.status });
  if (q.q) {
    const re = new RegExp(escapeRegex(q.q), 'i');
    const [ps, cs] = await Promise.all([Product.find({ name: re }).select('_id').lean(), Customer.find({ name: re }).select('_id').lean()]);
    and.push({ $or: [{ productId: { $in: ps.map((x) => x._id) } }, { customerId: { $in: cs.map((x) => x._id) } }, { title: re }, { text: re }] });
  }
  const filter = { $and: and };
  const [rows, total, ...counts] = await Promise.all([
    Review.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Review.countDocuments(filter),
    ...R.STATUSES.map((s) => Review.countDocuments({ isDeleted: false, status: s })),
  ]);
  const [products, customers] = await Promise.all([
    Product.find({ _id: { $in: rows.map((r) => r.productId) } }).select('name slug').lean(),
    Customer.find({ _id: { $in: rows.map((r) => r.customerId) } }).select('name').lean(), // name only: staff do not need the phone to moderate
  ]);
  const pBy = new Map(products.map((p) => [String(p._id), p])); const cBy = new Map(customers.map((c) => [String(c._id), c]));
  return {
    reviews: rows.map((r) => ({
      _id: r._id, rating: r.rating, title: r.title || '', text: r.text || '', status: r.status, createdAt: r.createdAt,
      product: { name: (pBy.get(String(r.productId)) || {}).name || 'Deleted product', slug: (pBy.get(String(r.productId)) || {}).slug || '' },
      customerName: (cBy.get(String(r.customerId)) || {}).name || 'Customer',
    })),
    counts: Object.fromEntries(R.STATUSES.map((s, i) => [s, counts[i]])),
    pagination: pageMeta(total, page, limit),
  };
}
async function moderate(ctx, id, status) {
  if (!ID.test(String(id))) throw E.notFound('Review not found.');
  const before = await Review.findOne({ _id: id, isDeleted: false }).lean();
  if (!before) throw E.notFound('Review not found.');
  if (!R.canModerate(before.status, status)) throw E.badRequest(`This review is already ${before.status}.`);
  const after = await Review.findByIdAndUpdate(id, { $set: { status, moderatedBy: ctx.user._id } }, { new: true }).lean();
  await recalcProduct(before.productId);
  await audit(ctx, { action: 'review.moderated', module: 'reviews', recordId: id, oldValue: { status: before.status }, newValue: { status } });
  return { review: { _id: after._id, status: after.status } };
}
module.exports = { listPublic, mine, saveMine, removeMine, listAdmin, moderate, recalcProduct };
