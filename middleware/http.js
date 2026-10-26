const json = (status, body, headers = {}) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  body: status === 204 ? '' : JSON.stringify(body),
});
const res = (status, data = {}, headers = {}) => ({ __res: true, status, data, headers });
const lowerKeys = (h = {}) => Object.fromEntries(Object.entries(h).map(([k, v]) => [k.toLowerCase(), v]));
const clientIp = (h) => h['x-nf-client-connection-ip'] || (h['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map((c) => c.trim()).filter(Boolean).map((c) => {
    const i = c.indexOf('='); return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))];
  }));
}
function serializeCookie(name, value, { maxAge, secure = true } = {}) {
  // Same-site Netlify deployments use Lax. Set COOKIE_SAMESITE=None only when the frontend/API are intentionally cross-site.
  const sameSite = String(process.env.COOKIE_SAMESITE || 'Lax').toLowerCase();
  const sameSiteValue = ['lax', 'strict', 'none'].includes(sameSite) ? sameSite[0].toUpperCase() + sameSite.slice(1) : 'Lax';
  return [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', `SameSite=${sameSiteValue}`, secure ? 'Secure' : '', maxAge !== undefined ? `Max-Age=${maxAge}` : '']
    .filter(Boolean).join('; ');
}
function parseBody(event) {
  if (!event.body) return undefined;
  const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  if (raw.length > 1_000_000) { const { E } = require('./errors'); throw E.badRequest('Request too large.'); }
  try { return JSON.parse(raw); } catch { const { E } = require('./errors'); throw E.badRequest('Invalid JSON.'); }
}
module.exports = { json, res, lowerKeys, clientIp, parseCookies, serializeCookie, parseBody };
