// Privacy-conscious traffic attribution rules. No IP address, full referrer URL, search query or customer identity is stored.
const SOURCES = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'search', label: 'Search engines' },
  { key: 'direct', label: 'Direct / unknown' },
  { key: 'email', label: 'Email' },
  { key: 'other_social', label: 'Other social' },
  { key: 'referral', label: 'Other websites' },
  { key: 'other', label: 'Other campaigns' },
];
const LABELS = Object.fromEntries(SOURCES.map((x) => [x.key, x.label]));
const cleanText = (value, max = 100) => String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);

function safeHost(value) {
  const raw = cleanText(value, 240);
  if (!raw) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return '';
    return url.hostname.toLowerCase().replace(/^www\./, '').slice(0, 160);
  } catch { return ''; }
}
function sourceFromName(value, medium, campaign = false) {
  const s = cleanText(value, 100).toLowerCase().replace(/[^a-z0-9._ -]/g, '').replace(/\s+/g, '');
  if (!s) return '';
  if (/instagram|insta|ig$/.test(s)) return 'instagram';
  if (/tiktok|tik-tok|tt$/.test(s)) return 'tiktok';
  if (/youtube|youtu\.be|yt$/.test(s)) return 'youtube';
  if (/facebook|fb$/.test(s)) return 'facebook';
  if (/whatsapp|wa\.me|whats-app|wa$/.test(s)) return 'whatsapp';
  if (/google|bing|yahoo|duckduckgo|ecosia|yandex|baidu|search/.test(s)) return 'search';
  if (/email|newsletter|mailchimp|klaviyo/.test(s) || /email/.test(String(medium || '').toLowerCase())) return 'email';
  if (/linkedin|pinterest|snapchat|reddit|threads|twitter|(^|\.)x\.com/.test(s)) return 'other_social';
  if (/social|paid_social/.test(String(medium || '').toLowerCase())) return 'other_social';
  return campaign && s ? 'other' : '';
}
function classifySource(utmSource, utmMedium, referrerHost) {
  const fromCampaign = sourceFromName(utmSource, utmMedium, true);
  if (fromCampaign) return fromCampaign;
  const host = safeHost(referrerHost);
  if (!host || host === 'localhost' || host === '127.0.0.1' || host === 'afsana-perfumes11.eastwala12.workers.dev') return 'direct';
  const fromHost = sourceFromName(host, '');
  if (fromHost) return fromHost;
  return 'referral';
}
function safePath(value) {
  const raw = cleanText(value, 400);
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/';
  let path = raw.split(/[?#]/, 1)[0].replace(/\/{2,}/g, '/').slice(0, 220) || '/';
  path = path.replace(/^\/order-success\/[^/]+/i, '/order-success/:order');
  path = path.replace(/^\/account\/orders\/[^/]+/i, '/account/orders/:order');
  path = path.split('/').map((part) => (
    /^[a-f0-9]{24}$/i.test(part) || /^\d{5,}$/.test(part) || /^[a-z]{1,6}-\d{6,}$/i.test(part) || part.includes('@')
      ? ':id' : part
  )).join('/');
  return path || '/';
}
function pageViewEvent(input = {}) {
  const sessionRef = cleanText(input.sessionRef, 80);
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(sessionRef)) return null;
  const path = safePath(input.path);
  const landingPath = safePath(input.landingPath || input.path);
  const utmSource = cleanText(input.utmSource, 100);
  const medium = cleanText(input.utmMedium, 80);
  const campaign = cleanText(input.utmCampaign, 100);\n  const affiliateCode = cleanText(input.affiliateCode, 30).toUpperCase();
  const referrerHost = safeHost(input.referrerHost);
  const source = classifySource(utmSource, medium, referrerHost);
  return {
    event: 'page_view',
    sessionRef,
    source,
    medium: medium || null,
    campaign: campaign || null,\n    affiliateCode: /^[A-Z0-9][A-Z0-9_-]{2,29}$/.test(affiliateCode) ? affiliateCode : null,
    referrerHost: referrerHost || null,
    path,
    landingPath,
    at: new Date(),
  };
}
module.exports = { SOURCES, LABELS, safeHost, safePath, classifySource, pageViewEvent };
