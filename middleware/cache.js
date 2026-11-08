// Cloudflare Worker API responses are deliberately sent with no-store by
// cloudflare/worker.js. Do not call Netlify cache APIs from the Cloudflare runtime.
function cacheHeaders(ttl, swr = Math.max(ttl, 60)) {
  const seconds = Math.max(1, Number(ttl) || 1);
  const stale = Math.max(0, Number(swr) || 0);
  return {
    "Cache-Control": `public, max-age=${seconds}, stale-while-revalidate=${stale}`,
  };
}

// The Worker currently disables API response caching, so there is no edge
// cache to purge after mutations. Keep this hook for the existing handler API.
async function invalidateForGroup() {}

module.exports = { cacheHeaders, invalidateForGroup };
