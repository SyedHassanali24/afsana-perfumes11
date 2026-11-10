// API responses are sent with no-store by the Cloudflare Worker, so there is no
// edge cache to invalidate. Keep standard Cache-Control helpers for local handlers.
function cacheHeaders(ttl, swr = Math.max(ttl, 60)) {
  const seconds = Math.max(1, Number(ttl) || 1);
  const stale = Math.max(0, Number(swr) || 0);
  return { 'Cache-Control': `public, max-age=${seconds}, stale-while-revalidate=${stale}` };
}

async function invalidateForGroup() {
  // Cloudflare Worker currently disables API caching (no-store); invalidation is unnecessary.
}

module.exports = { cacheHeaders, invalidateForGroup };
