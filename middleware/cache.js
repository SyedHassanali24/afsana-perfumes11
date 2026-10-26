const { purgeCache } = require('@netlify/functions');

function cacheHeaders(ttl, swr = Math.max(ttl, 60), tags = []) {
  const seconds = Math.max(1, Number(ttl) || 1);
  const stale = Math.max(0, Number(swr) || 0);
  const headers = {
    'Netlify-CDN-Cache-Control': `public, durable, max-age=${seconds}, stale-while-revalidate=${stale}`,
    'Cache-Control': `public, max-age=${seconds}, stale-while-revalidate=${stale}`,
  };
  if (Array.isArray(tags) && tags.length) headers['Netlify-Cache-Tag'] = tags.filter((tag) => typeof tag === 'string' && tag.length <= 1024).join(',');
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
  try {
    const token = context?.clientContext?.custom?.purge_api_token;
    await purgeCache({ tags, ...(token ? { token } : {}) });
  } catch (err) {
    console.error('Cache invalidation failed:', err?.message || err);
  }
}

module.exports = { cacheHeaders, invalidateForGroup };
