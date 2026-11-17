// Public API cache policy. Private/authenticated responses remain no-store at the Worker.
function cacheHeaders(ttl, swr = Math.max(ttl, 60), cacheTags = []) {
  // Keep public data fresh while still avoiding a MongoDB read on every storefront visit.
  // The cap also bounds staleness after CMS, catalogue or settings edits.
  const seconds = Math.min(60, Math.max(1, Number(ttl) || 1));
  const stale = Math.max(0, Number(swr) || 0);
  const tags = [...new Set((Array.isArray(cacheTags) ? cacheTags : [])
    .map((tag) => String(tag || '').trim())
    .filter((tag) => /^[a-z0-9_-]{1,40}$/i.test(tag)))];

  return {
    'Cache-Control': `public, max-age=${seconds}, s-maxage=${seconds}, stale-while-revalidate=${stale}`,
    ...(tags.length ? { 'Cache-Tag': tags.join(',') } : {}),
  };
}

async function invalidateForGroup() {
  // The Worker edge cache uses a short, capped TTL. The browser API cache is
  // cleared after every successful mutation; Cache-Tag is also emitted for
  // optional provider-side purge tooling without requiring paid infrastructure.
}

module.exports = { cacheHeaders, invalidateForGroup };
