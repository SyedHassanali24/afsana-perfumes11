function cacheHeaders(ttl, swr = Math.max(ttl, 60), tags = []) {
  const seconds = Math.max(1, Number(ttl) || 1);
  const stale = Math.max(0, Number(swr) || 0);
  const headers = {
    'Cache-Control': `public, max-age=${seconds}, stale-while-revalidate=${stale}`,
  };
  return headers;
}

const INVALIDATION = {
  products: ['products'],
  taxonomy: ['taxonomy'],
  cms: ['cms'],
  settings: ['settings'],
  reviews: ['reviews', 'products'],
  orders: ['products'],
  returns: ['products'],
  inventory: ['products'],
};

async function invalidateForGroup(group, context, extraTags = []) {
  const tags = [...new Set([...(INVALIDATION[group] || []), ...extraTags].filter(Boolean))];
  if (!tags.length) return;
  const invalidate = globalThis.__AFSANA_CACHE_INVALIDATE__;
  if (typeof invalidate === 'function') {
    try { await invalidate(tags); }
    catch (err) { console.error('Cloudflare cache invalidation failed:', err?.message || err); }
  }
}

module.exports = { cacheHeaders, invalidateForGroup };
