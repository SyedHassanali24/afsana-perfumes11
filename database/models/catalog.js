const mongoose = require('mongoose');
const { Schema } = mongoose;
const { ObjectId } = Schema.Types;
const C = require('../constants');
const { softDelete, storeScoped, model: m } = require('./_plugins');
const model = (n, s) => m(mongoose, n, s);

// Categories / Collections / Brands / Fragrance families share one shape.
function taxonomy(extra = {}) {
  const s = new Schema({
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: String,
    image: { url: String, alt: String },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    seo: { title: String, description: String },
    ...extra,
  }, { timestamps: true });
  storeScoped(s); softDelete(s);
  return s;
}

const mediaSchema = new Schema({
  kind: { type: String, enum: ['main', 'gallery', 'closeup', 'lifestyle', 'packaging', 'ingredients', 'video', 'media360'], default: 'gallery' },
  url: { type: String, required: true }, // CDN/object-storage URL only; never binary in MongoDB
  alt: String, width: Number, height: Number, sortOrder: { type: Number, default: 0 },
}, { _id: true });

const productSchema = new Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, lowercase: true },
  sku: { type: String, required: true, trim: true },
  barcode: String,
  brandId: { type: ObjectId, ref: 'Brand' },
  categoryId: { type: ObjectId, ref: 'Category', required: true },
  collectionIds: [{ type: ObjectId, ref: 'Collection' }],
  productType: { type: String, enum: ['single', 'bundle', 'giftbox', 'tester'], default: 'single' },
  status: { type: String, enum: C.PRODUCT_STATUSES, default: 'Draft' },

  fragrance: {
    familyId: { type: ObjectId, ref: 'FragranceFamily' },
    scentType: String,
    gender: { type: String, enum: ['Men', 'Women', 'Unisex'] },
    concentration: String, // EDP, EDT, Attar...
    longevity: String, projection: String,
    seasons: [String], occasions: [String],
  },
  notes: { top: [String], heart: [String], base: [String] },
  profile: { // admin sliders, 0-100
    freshness: { type: Number, min: 0, max: 100, default: 0 },
    sweetness: { type: Number, min: 0, max: 100, default: 0 },
    woody: { type: Number, min: 0, max: 100, default: 0 },
    spicy: { type: Number, min: 0, max: 100, default: 0 },
    floral: { type: Number, min: 0, max: 100, default: 0 },
  },
  media: [mediaSchema],
  content: { shortDescription: String, fullDescription: String },
  seo: { title: String, metaDescription: String, keywords: [String], canonicalUrl: String, ogImage: String },
  tags: [String], // 'New Arrival','Best Seller','Under 2000'...

  // denormalised for listing speed; recomputed when variants change
  priceFrom: Number,
  ratingAvg: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  createdBy: { type: ObjectId, ref: 'User' },
}, { timestamps: true });
productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ sku: 1 }, { unique: true });
productSchema.index({ categoryId: 1 });
productSchema.index({ status: 1 });
productSchema.index({ collectionIds: 1 });
productSchema.index({ 'fragrance.familyId': 1 });
productSchema.index({ name: 'text', tags: 'text', 'notes.top': 'text', 'notes.heart': 'text', 'notes.base': 'text' },
  { weights: { name: 10, tags: 4, 'notes.top': 3, 'notes.heart': 3, 'notes.base': 3 }, name: 'product_search' });
storeScoped(productSchema); softDelete(productSchema);

const variantSchema = new Schema({
  productId: { type: ObjectId, ref: 'Product', required: true, index: true },
  sku: { type: String, required: true, unique: true },
  label: String,                       // "50ml"
  sizeMl: { type: Number, required: true },
  price: { type: Number, required: true, min: 0 },
  salePrice: { type: Number, min: 0 },
  costPrice: { type: Number, min: 0 },  // field-restricted (product.costPrice)
  barcode: String,
  weightGrams: Number,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
storeScoped(variantSchema); softDelete(variantSchema);

// Bundle stock = min over components of floor(available / qty). Computed server-side, never stored.
const bundleSchema = new Schema({
  productId: { type: ObjectId, ref: 'Product', required: true, unique: true },
  components: [{ variantId: { type: ObjectId, ref: 'ProductVariant', required: true }, quantity: { type: Number, min: 1, default: 1 } }],
}, { timestamps: true });

const reviewSchema = new Schema({
  productId: { type: ObjectId, ref: 'Product', required: true },
  customerId: { type: ObjectId, ref: 'Customer', required: true },
  orderId: { type: ObjectId, ref: 'Order' },
  rating: { type: Number, min: 1, max: 5, required: true },
  title: String, text: String,
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Featured'], default: 'Pending', index: true },
  moderatedBy: { type: ObjectId, ref: 'User' },
}, { timestamps: true });
reviewSchema.index({ productId: 1 });
reviewSchema.index({ productId: 1, customerId: 1 }, { unique: true });
softDelete(reviewSchema);

const wishlistSchema = new Schema({
  customerId: { type: ObjectId, ref: 'Customer', required: true, unique: true },
  productIds: [{ type: ObjectId, ref: 'Product' }],
}, { timestamps: true });
wishlistSchema.index({ productIds: 1 });

module.exports = {
  Category: model('Category', taxonomy({ parentId: { type: ObjectId, ref: 'Category' } })),
  Collection: model('Collection', taxonomy()),
  Brand: model('Brand', taxonomy()),
  FragranceFamily: model('FragranceFamily', taxonomy()),
  Product: model('Product', productSchema),
  ProductVariant: model('ProductVariant', variantSchema),
  Bundle: model('Bundle', bundleSchema),
  Review: model('Review', reviewSchema),
  Wishlist: model('Wishlist', wishlistSchema),
};
