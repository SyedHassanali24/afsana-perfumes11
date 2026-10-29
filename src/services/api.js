// Single fetch wrapper for the whole frontend. Cookies carry the session (HTTP-only), never tokens in JS.
export class ApiError extends Error {
  constructor(status, code, message, details) { super(message); this.status = status; this.code = code; this.details = details; }
}

const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN || window.location.origin).replace(/\/$/, "");
const inflightGets = new Map();
const memoryGets = new Map();
const CACHE_EVENT = 'afsana:cache-change';
const PERSIST_PREFIX = 'afsana-api-cache:';

function loadPersistent(key) {
  try {
    const raw = sessionStorage.getItem(PERSIST_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry || entry.expiresAt <= Date.now()) { sessionStorage.removeItem(PERSIST_PREFIX + key); return null; }
    memoryGets.set(key, entry);
    return entry;
  } catch { return null; }
}
function persistCache(key, entry) {
  try { sessionStorage.setItem(PERSIST_PREFIX + key, JSON.stringify(entry)); } catch {}
}

function cacheBytes() {
  let bytes = 0;
  for (const [key, entry] of memoryGets) {
    try { bytes += new Blob([key, JSON.stringify(entry.data)]).size; } catch {}
  }
  return bytes;
}
function emitCacheChange() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(CACHE_EVENT, { detail: getApiCacheStats() }));
}
export function getApiCacheStats() {
  const now = Date.now();
  let active = 0;
  for (const entry of memoryGets.values()) if (entry.expiresAt > now) active += 1;
  return { entries: memoryGets.size, active, bytes: cacheBytes() };
}
export function clearApiCache() {
  memoryGets.clear();
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(PERSIST_PREFIX)) sessionStorage.removeItem(key);
    }
  } catch {}
  emitCacheChange();
}
export { CACHE_EVENT };

async function executeRequest(url, path, options) {
  const { method = 'GET', body, idempotencyKey } = options;
  let res;
  try {
    res = await fetch(url, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'afsana', ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch { throw new ApiError(0, 'NETWORK', 'Network error. Please check your connection.'); }

  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok || !data || !data.success) {
    const e = (data && data.error) || {};
    const staffPath = !/^\/(account|cart|wishlist|returns\/mine)(\/|$)/.test(path);
    if (staffPath && res.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/me')) window.dispatchEvent(new Event('afsana:unauthorized'));
    if (staffPath && e.code === 'PASSWORD_CHANGE_REQUIRED') window.dispatchEvent(new Event('afsana:must-change-password'));
    throw new ApiError(res.status, e.code || 'ERROR', e.message || 'Something went wrong. Please try again.', e.details);
  }
  return data;
}

export async function api(path, { method = 'GET', body, query, idempotencyKey, cacheTtl = 0 } = {}) {
  const url = new URL(`/api${path}`, API_ORIGIN);
  Object.entries(query || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v); });

  if (method === 'GET') {
    const key = url.toString();
    const now = Date.now();
    const cached = memoryGets.get(key) || loadPersistent(key);
    if (cached && cached.expiresAt > now) return Promise.resolve(cached.data);

    const existing = inflightGets.get(key);
    if (existing) return existing;

    const request = executeRequest(url, path, { method, body, idempotencyKey })
      .then((data) => {
        if (cacheTtl > 0) {
          const entry = { data, expiresAt: Date.now() + cacheTtl };
          memoryGets.set(key, entry);
          persistCache(key, entry);
          emitCacheChange();
        }
        return data;
      })
      .finally(() => inflightGets.delete(key));
    inflightGets.set(key, request);
    return request;
  }

  const result = await executeRequest(url, path, { method, body, idempotencyKey });
  // Mutations can make cached GET data stale. Keep the UI correct and still fast.
  if (memoryGets.size) clearApiCache();
  return result;
}
