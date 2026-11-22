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

test('dedicated journal guides remain indexable with article metadata', async () => {
  const { getPageMetadata, getCanonicalUrl } = await seo;
  const metadata = getPageMetadata('/journal/perfume-notes-explained');

  assert.match(metadata.robots, /^index,follow/);
  assert.equal(metadata.type, 'article');
  assert.equal(
    getCanonicalUrl('/journal/perfume-notes-explained'),
    'https://afsanaperfumes.store/journal/perfume-notes-explained',
  );
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

test('Product JSON-LD publishes only verified public review aggregates', async () => {
  const { buildProductJsonLd } = await seo;
  const schema = buildProductJsonLd({
    product: {
      name: 'Oud Royal',
      slug: 'oud-royal',
      ratingAvg: 4.75,
      ratingCount: 12,
    },
    price: 6990,
    available: 3,
    imageUrls: ['/images/oud-royal.webp'],
  });

  assert.deepEqual(schema.aggregateRating, {
    '@type': 'AggregateRating',
    ratingValue: 4.75,
    reviewCount: 12,
    bestRating: 5,
    worstRating: 1,
  });
});

test('Product JSON-LD ignores invalid or empty review aggregates', async () => {
  const { buildProductJsonLd } = await seo;
  for (const product of [
    { name: 'Invalid Rating', ratingAvg: 6, ratingCount: 3 },
    { name: 'No Reviews', ratingAvg: 4.8, ratingCount: 0 },
    { name: 'Fractional Count', ratingAvg: 4.8, ratingCount: 2.5 },
  ]) {
    const schema = buildProductJsonLd({
      product,
      imageUrls: ['/images/product.webp'],
    });
    assert.equal('aggregateRating' in schema, false);
  }
});

test('Product JSON-LD is skipped when product identity or image is absent', async () => {
  const { buildProductJsonLd } = await seo;
  assert.equal(buildProductJsonLd({ product: { name: 'No image' } }), null);
  assert.equal(buildProductJsonLd({ product: {}, imageUrls: ['/image.webp'] }), null);
});
