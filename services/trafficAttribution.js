const clean = (value, max = 120) => String(value || '').trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max);
const pathOnly = (value) => {
  const path = clean(value, 220).split(/[?#]/, 1)[0];
  return path.startsWith('/') && !path.startsWith('//') ? path : '/';
};

function classifyTrafficSource(utmSource, referrerHost) {
  const source = clean(utmSource, 100).toLowerCase();
  const host = clean(referrerHost, 255).toLowerCase();
  const value = source + ' ' + host;
  if (/tiktok/.test(value)) return 'TikTok';
  if (/youtube|youtu\.be/.test(value)) return 'YouTube';
  if (/instagram/.test(value)) return 'Instagram';
  if (/facebook|fb\.com/.test(value)) return 'Facebook';
  if (/whatsapp|wa\.me/.test(value)) return 'WhatsApp';
  if (/google|bing|yahoo|duckduckgo|search/.test(value)) return 'Search';
  if (source) return source.split(/[\s_-]+/).filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join(' ').slice(0, 60);
  return host ? 'Referral' : 'Direct';
}

function normalizeAttribution(input = {}) {
  const utmSource = clean(input.utmSource, 100);
  const referrerHost = clean(input.referrerHost, 255).toLowerCase();
  return {
    source: classifyTrafficSource(utmSource, referrerHost),
    medium: clean(input.utmMedium, 100),
    campaign: clean(input.utmCampaign, 100),
    referrerHost,
    landingPath: pathOnly(input.landingPath),
    path: pathOnly(input.path),
    affiliateCode: clean(input.affiliateCode, 60).toUpperCase(),
  };
}

module.exports = { classifyTrafficSource, normalizeAttribution };
