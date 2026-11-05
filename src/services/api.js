import { MEDIA_CHUNK_BYTES, MEDIA_MAX_BYTES, MEDIA_MAX_CHUNK_BYTES, mediaChunkCount } from '../../shared/mediaLimits.mjs';

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

export async function uploadChunkedMedia(file, onProgress) {
  const MAX_CHUNK_RETRIES = 3;
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  if (!file || !Number.isSafeInteger(file.size) || file.size < 1 || file.size > MEDIA_MAX_BYTES) {
    throw new ApiError(400, 'MEDIA_TOO_LARGE', 'Choose a video up to 250 MB.');
  }

  // Prefer the filename extension when browsers report a generic or empty MIME type.
  const extension = String(file.name || '').split('.').pop().toLowerCase();
  const extensionType = ({ mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm' })[extension];
  const declaredType = String(file.type || '').split(';')[0].trim().toLowerCase();
  const contentType = extensionType || (['video/mp4', 'video/webm'].includes(declaredType) ? declaredType : '');
  if (!contentType) {
    throw new ApiError(400, 'MEDIA_TYPE', 'Please select an MP4 or WebM video.');
  }

  const requestJson = async (path, { method = 'POST', body, token } = {}) => {
    let response;
    try {
      response = await fetch(new URL('/api' + path, API_ORIGIN), {
        method,
        credentials: 'include',
        headers: {
          'X-Requested-With': 'afsana',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: 'Bearer ' + token } : {})
        },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
    } catch {
      throw new ApiError(0, 'NETWORK', 'Network error. Please check your connection.');
    }
    let data;
    try { data = await response.json(); } catch { data = null; }
    if (!response.ok || !data?.success) {
      const error = data?.error || {};
      throw new ApiError(response.status, error.code || 'UPLOAD_FAILED', error.message || 'Video upload failed.');
    }
    return data;
  };

  const session = await requestJson('/media/chunked/init', {
    body: { filename: file.name || 'afsana-video', contentType, size: file.size }
  });
  if (!/^[a-f0-9]{24}$/i.test(String(session.uploadId || '')) || !session.token) {
    throw new ApiError(502, 'UPLOAD_SESSION_INVALID', 'The upload session could not be started. Please try again.');
  }

  const chunkSize = Number(session.chunkSize) || MEDIA_CHUNK_BYTES;
  if (!Number.isSafeInteger(chunkSize) || chunkSize < 1 || chunkSize > MEDIA_MAX_CHUNK_BYTES) {
    throw new ApiError(502, 'UPLOAD_CHUNK_INVALID', 'The server returned an invalid upload chunk size.');
  }
  const totalChunks = mediaChunkCount(file.size, chunkSize);

  for (let index = 0; index < totalChunks; index += 1) {
    const start = index * chunkSize;
    const end = Math.min(file.size, start + chunkSize);
    const chunk = file.slice(start, end);
    let uploaded = false;
    let lastError;

    // PUT is idempotent for a chunk key, so transient failures can safely retry.
    for (let attempt = 0; attempt < MAX_CHUNK_RETRIES; attempt += 1) {
      let response;
      try {
        response = await fetch(new URL('/api/media/chunked/' + session.uploadId + '/' + index, API_ORIGIN), {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'X-Requested-With': 'afsana',
            'Content-Type': 'application/octet-stream',
            Authorization: 'Bearer ' + session.token
          },
          body: chunk
        });
      } catch {
        lastError = new ApiError(0, 'NETWORK', 'Connection interrupted while uploading video part ' + (index + 1) + '.');
        if (attempt + 1 < MAX_CHUNK_RETRIES) {
          await wait(500 * (2 ** attempt));
          continue;
        }
        throw lastError;
      }

      let data;
      try { data = await response.json(); } catch { data = null; }
      if (response.ok && data?.success) {
        uploaded = true;
        break;
      }

      const error = data?.error || {};
      lastError = new ApiError(
        response.status,
        error.code || 'UPLOAD_FAILED',
        error.message || ('Could not upload video part ' + (index + 1) + '.')
      );
      const retryable = response.status === 408 || response.status === 425 ||
        response.status === 429 || response.status >= 500;
      if (!retryable || attempt + 1 >= MAX_CHUNK_RETRIES) throw lastError;
      await wait(500 * (2 ** attempt));
    }

    if (!uploaded) throw lastError || new ApiError(0, 'UPLOAD_FAILED', 'Video upload failed.');
    onProgress?.(Math.round(((index + 1) / totalChunks) * 98));
  }

  const complete = await requestJson('/media/chunked/' + session.uploadId + '/complete', { token: session.token });
  onProgress?.(100);
  return { url: complete.url, size: complete.size };
}
