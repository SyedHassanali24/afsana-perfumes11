// Anonymous, in-memory storefront session attribution. No browser storage or personal identifiers are used.
let activeSession = null;
let lastTrackedLocation = '';

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
      sessionRef: createSessionRef(),
      landingPath: path,
      utmSource: params.get('utm_source') || '',
      utmMedium: params.get('utm_medium') || '',
      utmCampaign: params.get('utm_campaign') || '',
      referrerHost: hostOnly(document.referrer),
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
