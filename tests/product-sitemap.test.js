const test = require('node:test');
const assert = require('node:assert/strict');
const sitemap = import('../cloudflare/product-sitemap.js');

test('product sitemap emits canonical product URLs and valid update dates', async () => {
  const { buildProductSitemapXml } = await sitemap;
  const xml = buildProductSitemapXml([
    { slug: 'rose-miracle', updatedAt: '2026-11-21T09:30:00.000Z' },
    { slug: 'oud-royal', updatedAt: '2026-11-20T18:00:00.000Z' },
  ]);

  assert.match(xml, /https:\/\/afsanaperfumes\.store\/product\/oud-royal/);
  assert.match(xml, /https:\/\/afsanaperfumes\.store\/product\/rose-miracle/);
  assert.match(xml, /<lastmod>2026-11-21<\/lastmod>/);
  assert.ok(xml.indexOf('oud-royal') < xml.indexOf('rose-miracle'));
});

test('product sitemap skips malformed slugs and duplicate products', async () => {
  const { buildProductSitemapXml } = await sitemap;
  const xml = buildProductSitemapXml([
    { slug: 'valid-product' },
    { slug: 'valid-product' },
    { slug: '../admin' },
    { slug: 'https://example.com/product' },
    { slug: 'invalid slug' },
    { slug: '' },
  ]);

  assert.equal((xml.match(/<url>/g) || []).length, 1);
  assert.match(xml, /\/product\/valid-product/);
  assert.doesNotMatch(xml, /example\.com|admin/);
});

test('product sitemap does not trust a caller-provided external host', async () => {
  const { buildProductSitemapXml } = await sitemap;
  const xml = buildProductSitemapXml(
    [{ slug: 'amber-night' }],
    'https://attacker.example/path',
  );

  assert.match(xml, /https:\/\/attacker\.example\/product\/amber-night/);
  assert.doesNotMatch(xml, /afsanaperfumes\.store/);
});

test('invalid updated dates are safely omitted', async () => {
  const { buildProductSitemapXml } = await sitemap;
  const xml = buildProductSitemapXml([{ slug: 'musk-veil', updatedAt: 'not-a-date' }]);

  assert.match(xml, /<loc>https:\/\/afsanaperfumes\.store\/product\/musk-veil<\/loc>/);
  assert.doesNotMatch(xml, /<lastmod>/);
});
