const test = require('node:test');
const assert = require('node:assert/strict');
const seo = import('../src/shop/seo.js');

test('canonical URLs discard filters and query parameters', async () => {
  const { getCanonicalUrl } = await seo;
  assert.equal(
    getCanonicalUrl('/shop?q=oud&page=2'),
    'https://afsanaperfumes.store/shop',
  );
});

test('off-site product canonical URLs are ignored', async () => {
  const { getCanonicalUrl } = await seo;
  assert.equal(
    getCanonicalUrl('/product/rose-miracle', 'https://example.com/other'),
    'https://afsanaperfumes.store/product/rose-miracle',
  );
});

test('private and transactional routes are marked noindex', async () => {
  const { getPageMetadata } = await seo;
  for (const path of ['/admin/cms', '/checkout', '/account', '/wishlist', '/order-success/123']) {
    assert.match(getPageMetadata(path).robots, /^noindex/);
  }
});

test('public collection routes remain indexable', async () => {
  const { getPageMetadata } = await seo;
  assert.match(getPageMetadata('/shop').robots, /^index,follow/);
});

test('Product JSON-LD uses available real product facts only', async () => {
  const { buildProductJsonLd } = await seo;
  const schema = buildProductJsonLd({
    product: {
      name: 'Rose Miracle',
      slug: 'rose-miracle',
      sku: 'AF-ROSE-001',
      content: { shortDescription: 'A floral fragrance.' },
    },
    price: 4990,
    available: 4,
    imageUrls: ['/images/rose-miracle.webp'],
    canonicalUrl: 'https://afsanaperfumes.store/product/rose-miracle',
    category: 'Women',
  });

  assert.equal(schema['@type'], 'Product');
  assert.equal(schema.offers.priceCurrency, 'PKR');
  assert.equal(schema.offers.availability, 'https://schema.org/InStock');
  assert.equal(schema.url, 'https://afsanaperfumes.store/product/rose-miracle');
  assert.equal(schema.image[0], 'https://afsanaperfumes.store/images/rose-miracle.webp');
});

test('Product JSON-LD excludes rating data unless review provenance is confirmed', async () => {
  const { buildProductJsonLd } = await seo;
  const schema = buildProductJsonLd({
    product: { name: 'New Fragrance', sku: 'AF-NEW' },
    price: 2500,
    available: 0,
    imageUrls: ['https://cdn.example.com/new-fragrance.webp'],
  });

  assert.equal(schema.offers.availability, 'https://schema.org/OutOfStock');
  assert.equal('aggregateRating' in schema, false);
});

test('Product JSON-LD is skipped when product identity or image is absent', async () => {
  const { buildProductJsonLd } = await seo;
  assert.equal(buildProductJsonLd({ product: { name: 'No image' } }), null);
  assert.equal(buildProductJsonLd({ product: {}, imageUrls: ['/image.webp'] }), null);
});
