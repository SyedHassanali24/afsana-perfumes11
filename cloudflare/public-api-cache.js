const PREFIX = 'public-api-cache:';
const EPOCH_KEY = PREFIX + 'epoch';
const INITIAL_EPOCH = 'initial';
const INTERNAL_TTL_MS = 5 * 60 * 1000;

// Cache only small, explicitly-public responses needed by the first storefront render.
// Product lists are intentionally excluded because their stock/price data changes more often.
const CACHEABLE_PATHS = new Set([
  '/api/cms/public',
  '/api/settings/public',
  '/api/products/featured',
]);

// Only storefront origins that receive CORS access get independent cache entries.
// Untrusted or absent Origin values share one variant to prevent cache-key amplification.
const CACHEABLE_ORIGINS = new Set([
  'https://afsanaperfumes.store',
  'https://www.afsanaperfumes.store',
  'https://afsana-perfumes11.eastwala12.workers.dev',
]);

async function getPublicApiCacheEpoch(storage) {
  return (await storage.get(EPOCH_KEY)) || INITIAL_EPOCH;
}

function publicApiCacheKey(request, epoch = INITIAL_EPOCH) {
  if (!request || request.method !== 'GET') return null;
  const url = new URL(request.url);
  if (!CACHEABLE_PATHS.has(url.pathname)) return null;

  // These allowlisted handlers do not read query parameters, so omit them to
  // keep the number of stored cache variants bounded.
  const requestOrigin = request.headers.get('Origin') || '';
  const origin = CACHEABLE_ORIGINS.has(requestOrigin) ? requestOrigin : '';
  // The epoch prevents an older in-flight GET from repopulating cache after a write.
  return PREFIX + encodeURIComponent(epoch) + ':' + encodeURIComponent(origin) + ':' + encodeURIComponent(url.pathname);
}

function publicApiCacheTtlMs(response) {
  if (!response || response.status !== 200 || response.headers.has('Set-Cookie')) return 0;
  const policy = String(response.headers.get('Cache-Control') || '').toLowerCase();
  if (!/\\bpublic\\b/.test(policy) || /\\b(private|no-store)\\b/.test(policy)) return 0;
  const maxAge = policy.match(/(?:^|,)\\s*max-age\\s*=\\s*"?([0-9]+)"?/);
  if (!maxAge) return 0;
  const declaredTtlMs = Number(maxAge[1]) * 1000;
  if (!Number.isFinite(declaredTtlMs) || declaredTtlMs <= 0) return 0;
  // Respect the route's HTTP freshness lifetime and apply the internal five-minute ceiling.
  return Math.min(INTERNAL_TTL_MS, declaredTtlMs);
}

function publicApiCacheable(response) {
  return publicApiCacheTtlMs(response) > 0;
}

async function readPublicApiCache(storage, request, now = Date.now(), epoch) {
  const keyEpoch = epoch === undefined ? await getPublicApiCacheEpoch(storage) : epoch;
  const key = publicApiCacheKey(request, keyEpoch);
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

async function writePublicApiCache(storage, request, response, now = Date.now(), epoch) {
  const keyEpoch = epoch === undefined ? await getPublicApiCacheEpoch(storage) : epoch;
  const key = publicApiCacheKey(request, keyEpoch);
  const ttlMs = publicApiCacheTtlMs(response);
  if (!key || ttlMs <= 0) return false;

  const body = await response.clone().text();
  await storage.put(key, {
    status: response.status,
    statusText: response.statusText,
    headers: [...response.headers.entries()],
    body,
    expiresAt: now + ttlMs,
  });
  return true;
}

async function clearPublicApiCache(storage) {
  // Rotate the namespace first: older in-flight reads can only write under the old epoch.
  await storage.put(EPOCH_KEY, crypto.randomUUID());
  const entries = await storage.list({ prefix: PREFIX });
  let deleted = 0;
  for (const key of entries.keys()) {
    if (key !== EPOCH_KEY && await storage.delete(key)) deleted += 1;
  }
  return deleted;
}

export {
  PREFIX,
  EPOCH_KEY,
  INITIAL_EPOCH,
  CACHEABLE_PATHS,
  CACHEABLE_ORIGINS,
  INTERNAL_TTL_MS,
  getPublicApiCacheEpoch,
  publicApiCacheKey,
  publicApiCacheTtlMs,
  publicApiCacheable,
  readPublicApiCache,
  writePublicApiCache,
  clearPublicApiCache,
};
