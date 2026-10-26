function cacheHeaders(ttl, swr = Math.max(ttl, 60), tags = []) {
  const seconds = Math.max(1, Number(ttl) || 1);
  const stale = Math.max(0, Number(swr) || 0);
  const headers = {
    'Netlify-CDN-Cache-Control': `public, durable, max-age=${seconds}, stale-while-revalidate=${stale}`,
    'Cache-Control': `public, max-age=${seconds}, stale-while-revalidate=${stale}`,
  };
  if (Array.isArray(tags) && tags.length) headers['Netlify-Cache-Tag'] = tags.filter(Boolean).join(',');
  return headers;
}
module.exports = { cacheHeaders };
