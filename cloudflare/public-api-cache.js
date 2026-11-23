const PREFIX = 'public-api-cache:';
const INTERNAL_TTL_MS = 5 * 60 * 1000;

// Cache only small, explicitly-public responses needed by the first storefront render.
// Product lists are intentionally excluded because their stock/price data changes more often.
const CACHEABLE_PATHS = new Set([
  '/api/cms/public',
  '/api/settings/public',
  '/api/products/featured',
]);

function publicApiCacheKey(request) {
  if (!request || request.method !== 'GET') return null;
  const url = new URL(request.url);
  if (!CACHEABLE_PATHS.has(url.pathname)) return null;

  // The API handler can attach an origin-specific CORS header. Keep origins isolated.
  const origin = request.headers.get('Origin') || '';
  return PREFIX + encodeURIComponent(origin) + ':' + encodeURIComponent(url.pathname + url.search);
}

function publicApiCacheable(response) {
  if (!response || response.status !== 200 || response.headers.has('Set-Cookie')) return false;
  const policy = String(response.headers.get('Cache-Control') || '').toLowerCase();
  if (!/\bpublic\b/.test(policy) || /\b(private|no-store)\b/.test(policy)) return false;
  const maxAge = policy.match(/(?:^|,)\s*max-age=(\d+)/);
  return !!maxAge && Number(maxAge[1]) > 0;
}

async function readPublicApiCache(storage, request, now = Date.now()) {
  const key = publicApiCacheKey(request);
  if (!key) return null;
  const entry = await storage.get(key);
  if (!entry) return null;

  if (!Number.isFinite(entry.expiresAt) || entry.expiresAt <= now) {
    await storage.delete(key);
    return null;
  }

  return new Response(entry.body, {
    status: entry.status,
    statusText: entry.statusText || '',
    headers: new Headers(entry.headers || []),
  });
}

async function writePublicApiCache(storage, request, response, now = Date.now()) {
  const key = publicApiCacheKey(request);
  if (!key || !publicApiCacheable(response)) return false;

  const body = await response.clone().text();
  await storage.put(key, {
    status: response.status,
    statusText: response.statusText,
    headers: [...response.headers.entries()],
    body,
    // A five-minute ceiling bounds staleness even if an out-of-band data change occurs.
    // Normal CMS/product/settings mutations clear this cache immediately after success.
    expiresAt: now + INTERNAL_TTL_MS,
  });
  return true;
}

async function clearPublicApiCache(storage) {
  const entries = await storage.list({ prefix: PREFIX });
  let deleted = 0;
  for (const key of entries.keys()) {
    if (await storage.delete(key)) deleted += 1;
  }
  return deleted;
}

module.exports = {
  PREFIX,
  CACHEABLE_PATHS,
  INTERNAL_TTL_MS,
  publicApiCacheKey,
  publicApiCacheable,
  readPublicApiCache,
  writePublicApiCache,
  clearPublicApiCache,
};
