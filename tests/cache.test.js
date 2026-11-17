const test = require('node:test');
const assert = require('node:assert/strict');
const cache = require('../middleware/cache');

test('public cache headers are capped and tagged for edge caching', () => {
  const headers = cache.cacheHeaders(300, 300, ['cms', 'products', 'cms', 'not a tag']);
  assert.equal(headers['Cache-Control'], 'public, max-age=60, stale-while-revalidate=60');
  assert.equal(headers['Cache-Tag'], 'cms,products');
});

test('public cache headers preserve short route TTLs', () => {
  const headers = cache.cacheHeaders(30, 60, ['settings']);
  assert.equal(headers['Cache-Control'], 'public, max-age=30, stale-while-revalidate=60');
  assert.equal(headers['Cache-Tag'], 'settings');
});

test('cache tags are omitted when a route has no tags', () => {
  const headers = cache.cacheHeaders(15, 15);
  assert.equal(headers['Cache-Control'], 'public, max-age=15, stale-while-revalidate=15');
  assert.equal(Object.hasOwn(headers, 'Cache-Tag'), false);
});

test('successful writes purge only valid unique cache tags', async () => {
  let received = null;
  const context = { ctx: { cache: { purge: async (value) => { received = value; } } } };
  await cache.invalidateForGroup('catalog', context, ['products', 'bad tag', 'products', 'taxonomy']);
  assert.deepEqual(received, { tags: ['products', 'taxonomy'] });
});

test('cache purge errors never fail a successful database write', async () => {
  const context = { ctx: { cache: { purge: async () => { throw new Error('cache unavailable'); } } } };
  await assert.doesNotReject(() => cache.invalidateForGroup('catalog', context, ['products']));
});
