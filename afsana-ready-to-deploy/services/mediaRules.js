// Image upload rules (pure, tested in tests/media.test.js). Only real JPEG / PNG / WebP pictures are accepted:
// the file's first bytes must match what the browser says it is (so a script cannot be uploaded as "image").
const MAX_BYTES = 700 * 1024;               // after the browser has shrunk it; a normal product photo is 100-300 KB
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MEDIA_URL = /^\/api\/media\/[0-9a-f]{24}$/;

function sniff(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  return null;
}
// -> { ok, buffer, contentType } or { ok:false, message }
function checkUpload({ contentType, data }) {
  if (!TYPES.includes(contentType)) return { ok: false, message: 'Only JPEG, PNG or WebP pictures are allowed.' };
  if (typeof data !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return { ok: false, message: 'The picture could not be read.' };
  const buffer = Buffer.from(data, 'base64');
  if (!buffer.length) return { ok: false, message: 'The picture is empty.' };
  if (buffer.length > MAX_BYTES) return { ok: false, message: `The picture is too big (max ${Math.round(MAX_BYTES / 1024)} KB after shrinking).` };
  if (sniff(buffer) !== contentType) return { ok: false, message: 'This file is not a real picture of that type.' };
  return { ok: true, buffer, contentType };
}
// A picture address we accept in products/categories: normal http(s) link OR one of our own uploads.
function isAllowedImageUrl(v) {
  if (MEDIA_URL.test(v)) return true;
  try { const u = new URL(v); return u.protocol === 'https:' || u.protocol === 'http:'; } catch { return false; }
}
module.exports = { MAX_BYTES, TYPES, MEDIA_URL, sniff, checkUpload, isAllowedImageUrl };
