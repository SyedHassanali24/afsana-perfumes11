// Single fetch wrapper for the whole frontend. Cookies carry the session (HTTP-only), never tokens in JS.
export class ApiError extends Error {
  constructor(status, code, message, details) { super(message); this.status = status; this.code = code; this.details = details; }
}
export async function api(path, { method = 'GET', body, query } = {}) {
  const url = new URL(`/api${path}`, window.location.origin);
  Object.entries(query || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v); });
  let res;
  try {
    res = await fetch(url, {
      method, credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'afsana' }, // CSRF guard header
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch { throw new ApiError(0, 'NETWORK', 'Network error. Please check your connection.'); }
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok || !data || !data.success) {
    const e = (data && data.error) || {};
    // Session expired / revoked -> tell AuthContext (login call itself also returns 401 for bad credentials, so skip it)
    const staffPath = !path.startsWith('/account');
    if (staffPath && res.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/me')) window.dispatchEvent(new Event('afsana:unauthorized'));
    if (staffPath && e.code === 'PASSWORD_CHANGE_REQUIRED') window.dispatchEvent(new Event('afsana:must-change-password'));
    throw new ApiError(res.status, e.code || 'ERROR', e.message || 'Something went wrong. Please try again.', e.details);
  }
  return data;
}
