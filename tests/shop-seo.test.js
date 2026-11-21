import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProductJsonLd,
  getCanonicalUrl,
  getPageMetadata,
} from '../src/shop/seo.js';

test('canonical URLs discard filters and query parameters', () => {
  assert.equal(
    getCanonicalUrl('/shop?q=oud&page=2'),
    'https://afsanaperfumes.store/shop',
  );
});

test('off-site product canonical URLs are ignored', () => {
  assert.equal(
    getCanonicalUrl('/product/rose-miracle', 'https://example.com/other'),
    'https://afsanaperfumes.store/product/rose-miracle',
  );
});

test('private and transactional routes are marked noindex', () => {
  for (const path of ['/admin/cms', '/checkout', '/account', '/wishlist', '/order-success/123']) {
    assert.match(getPageMetadata(path).robots, /^noindex/);
  }
});

test('public collection routes remain indexable', () => {
  assert.match(getPageMetadata('/shop').robots, /^index,follow/);
});

test('Product JSON-LD uses available real product facts only', () => {
  const schema = buildProductJsonLd({
    product: {
      name: 'Rose Miracle',
      sku: 'AF-ROSE-001',
      content: { shortDescription: 'A floral fragrance.' },
    },
    price: 4990,
    available: 4,
    imageUrls: ['/images/rose-miracle.webp'],
    canonicalUrl: 'https://afsanaperfumes.store/product/rose-miracle',
    category: 'Women',
    ratingAverage: 4.8,
    ratingCount: 12,
  });

  assert.equal(schema['@type'], 'Product');
  assert.equal(schema.offers.priceCurrency, 'PKR');
  assert.equal(schema.offers.availability, 'https://schema.org/InStock');
  assert.equal(schema.aggregateRating.reviewCount, 12);
  assert.equal(schema.image[0], 'https://afsanaperfumes.store/images/rose-miracle.webp');
});

test('Product JSON-LD never fabricates rating data', () => {
  const schema = buildProductJsonLd({
    product: { name: 'New Fragrance', sku: 'AF-NEW' },
    price: 2500,
    available: 0,
    imageUrls: ['https://cdn.example.com/new-fragrance.webp'],
    ratingAverage: 0,
    ratingCount: 0,
  });

  assert.equal(schema.offers.availability, 'https://schema.org/OutOfStock');
  assert.equal('aggregateRating' in schema, false);
});

test('Product JSON-LD is skipped when product identity or image is absent', () => {
  assert.equal(buildProductJsonLd({ product: { name: 'No image' } }), null);
  assert.equal(buildProductJsonLd({ product: {}, imageUrls: ['/image.webp'] }), null);
});
