// The Cloudflare Worker marks API responses no-store; there is no
// provider-specific cache invalidation step for API writes.
function cacheHeaders(ttl, swr = Math.max(ttl, 60)) {
  const seconds = Math.max(1, Number(ttl) || 1);
  const stale = Math.max(0, Number(swr) || 0);
  return { 'Cache-Control': `public, max-age=${seconds}, stale-while-revalidate=${stale}` };
}

async function invalidateForGroup() {
  // API responses are no-store at the Worker, so invalidation is unnecessary.
}

module.exports = { cacheHeaders, invalidateForGroup };
