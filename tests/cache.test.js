import test from 'node:test';
import assert from 'node:assert/strict';
import cache from '../middleware/cache.js';

test('public cache headers are capped and tagged for edge caching', () => {
  const headers = cache.cacheHeaders(300, 300, ['cms', 'products', 'cms', 'not a tag']);
  assert.equal(headers['Cache-Control'], 'public, max-age=60, s-maxage=60, stale-while-revalidate=60');
  assert.equal(headers['Cache-Tag'], 'cms,products');
});

test('public cache headers preserve short route TTLs', () => {
  const headers = cache.cacheHeaders(30, 60, ['settings']);
  assert.equal(headers['Cache-Control'], 'public, max-age=30, s-maxage=30, stale-while-revalidate=60');
  assert.equal(headers['Cache-Tag'], 'settings');
});

test('cache tags are omitted when a route has no tags', () => {
  const headers = cache.cacheHeaders(15, 15);
  assert.equal(headers['Cache-Control'], 'public, max-age=15, s-maxage=15, stale-while-revalidate=15');
  assert.equal(Object.hasOwn(headers, 'Cache-Tag'), false);
});
