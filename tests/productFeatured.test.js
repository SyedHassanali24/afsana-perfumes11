const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const stub = (rel, exports) => {
  const id = require.resolve(path.join(ROOT, rel));
  require.cache[id] = { id, filename: id, loaded: true, exports };
};

let featuredDoc;
const calls = {};
const query = {
  select(fields) { calls.select = fields; return this; },
  sort(order) { calls.sort = order; return this; },
  lean() { calls.lean = true; return Promise.resolve(featuredDoc); },
};

stub('database/models/index.js', {
  Product: { findOne(filter) { calls.filter = filter; return query; } },
  ProductVariant: {}, Inventory: {}, InventoryTransaction: {},
  Category: {}, Collection: {}, Brand: {}, FragranceFamily: {},
});
stub('middleware/errors.js', { E: {} });
stub('middleware/pagination.js', { paging() {}, pageMeta() {}, escapeRegex() {} });
stub('middleware/permissions.js', { scopeFilter() { return {}; } });
stub('services/pricing.js', { effectivePrice() {} });
stub('services/tx.js', { withTx() {} });
stub('services/audit.js', { audit() {} });

const products = require('../services/productService');

test('featured public product is a minimal primary-image view using the popular index', async () => {
  Object.keys(calls).forEach((key) => delete calls[key]);
  featuredDoc = {
    _id: 'p'.repeat(24),
    name: 'Dastan',
    slug: 'dastan',
    ratingCount: 8,
    media: [
      { kind: 'gallery', url: '/gallery.jpg', alt: 'Gallery' },
      { kind: 'main', url: '/api/media/primary-id', alt: 'Dastan bottle' },
      { kind: 'video', url: '/film.mp4' },
    ],
    costPrice: 999,
    createdBy: 'private-user-id',
  };

  const result = await products.getFeaturedPublic();

  assert.deepEqual(calls.filter, { status: 'Active', isDeleted: false });
  assert.equal(calls.select, 'name slug media ratingCount');
  assert.deepEqual(calls.sort, { ratingCount: -1 });
  assert.equal(calls.lean, true);
  assert.deepEqual(result, {
    product: {
      id: 'p'.repeat(24),
      name: 'Dastan',
      slug: 'dastan',
      image: { kind: 'main', url: '/api/media/primary-id', alt: 'Dastan bottle' },
    },
  });
  assert.equal(JSON.stringify(result).includes('costPrice'), false);
  assert.equal(JSON.stringify(result).includes('private-user-id'), false);
});

test('featured public product returns a stable empty value when the catalogue is empty', async () => {
  featuredDoc = null;
  assert.deepEqual(await products.getFeaturedPublic(), { product: null });
});

test('products API exposes the featured preview as a public, short-cache route before the slug route', async () => {
  stub('middleware/withApi.js', { createHandler: (group, routes) => ({ group, routes }) });
  stub('middleware/http.js', { res: (status, data) => ({ status, data, __res: true }) });
  stub('middleware/redact.js', { redact: (value) => value });
  stub('validation/schemas.js', { publicProductsQuery: {}, adminProductsQuery: {} });

  const publicService = {
    getFeaturedPublic: async () => ({ product: { name: 'Dastan' } }),
    listPublic: async () => ({ products: [] }),
    getPublicBySlug: async () => ({ product: null }),
    listAdmin: async () => ({}),
    listCategories: async () => ({}),
    getAdmin: async () => ({}),
    createProduct: async () => ({}),
    updateProduct: async () => ({}),
    updateVariant: async () => ({}),
    addVariant: async () => ({}),
    removeVariant: async () => ({}),
    setDeleted: async () => ({}),
  };
  stub('services/productService.js', publicService);

  const { group, routes } = require('../cloudflare/api/products/index.js').handler;
  const route = routes.find((item) => item.method === 'GET' && item.path === '/featured');
  assert.equal(group, 'products');
  assert.ok(route);
  assert.equal(route.public, true);
  assert.equal(route.cache, 60);
  assert.deepEqual(route.cacheTags, ['products']);
  assert.deepEqual(await route.handler({}), { product: { name: 'Dastan' } });
});
