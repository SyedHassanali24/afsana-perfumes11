// Anonymous, per-tab storefront attribution. A random session reference is kept in sessionStorage
// so refreshes do not inflate unique-session counts; no customer identity or IP is stored.
let activeSession = null;
let lastTrackedLocation = '';
const REF_KEY = 'afsana_referral_code_v1';
const SESSION_KEY = 'afsana_traffic_session_v1';

function createSessionRef() {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  } catch {
    return 'afsana-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36);
  }
}
function getSessionRef() {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing && /^[a-zA-Z0-9-]{8,100}$/.test(existing)) return existing;
    const created = createSessionRef();
    sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    // Private browsing/storage restrictions should never block storefront analytics.
    return createSessionRef();
  }
}
function hostOnly(value) {
  try { return value ? new URL(value).hostname.toLowerCase() : ''; } catch { return ''; }
}
function safePath(value) {
  const raw = String(value || '/').split(/[?#]/, 1)[0];
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/';
  return raw.slice(0, 220);
}

export function trackStorefrontPageView(pathname, search = '') {
  if (typeof window === 'undefined') return;
  const path = safePath(pathname);
  const locationKey = path + String(search || '');
  if (locationKey === lastTrackedLocation) return;
  lastTrackedLocation = locationKey;

  if (!activeSession) {
    const params = new URLSearchParams(search || '');
    activeSession = {
      sessionRef: getSessionRef(),
      landingPath: path,
      utmSource: params.get('utm_source') || '',
      utmMedium: params.get('utm_medium') || '',
      utmCampaign: params.get('utm_campaign') || '',
      referrerHost: hostOnly(document.referrer),
      affiliateCode: (() => { try { return sessionStorage.getItem(REF_KEY) || ''; } catch { return ''; } })(),
    };
  }

  const payload = {
    ...activeSession,
    path,
  };
  try {
    // Keep analytics out of the shared API cache: telemetry must never invalidate product/CMS caches.
    fetch('/api/analytics/events', {
      method: 'POST',
      credentials: 'omit',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'afsana' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch {
    // Analytics is optional and must never interrupt shopping or checkout.
  }
}

export function getReferralCode() {
  try { return String(sessionStorage.getItem(REF_KEY) || '').toUpperCase(); } catch { return ''; }
}
