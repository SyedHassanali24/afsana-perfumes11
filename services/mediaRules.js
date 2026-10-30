// Secure image/video/3D upload rules. Types are verified from file signatures; filename and browser MIME alone are not trusted.
const MAX_BYTES = 700 * 1024; // compressed image limit
const MAX_ASSET_BYTES = 4 * 1024 * 1024; // safe ceiling for short MP4/WebM clips and optimized GLB models
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'model/gltf-binary'];
const MEDIA_URL = /^\/api\/media\/[0-9a-f]{24}$/;

function sniff(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  if (buf.subarray(4, 8).toString('latin1') === 'ftyp') return 'video/mp4';
  if (buf.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return 'video/webm';
  if (buf.subarray(0, 4).toString('latin1') === 'glTF') return 'model/gltf-binary';
  return null;
}
// -> { ok, buffer, contentType } or { ok:false, message }
function checkUpload({ contentType, data }) {
  if (!TYPES.includes(contentType)) return { ok: false, message: 'Allowed files: JPEG, PNG, WebP, MP4, WebM and GLB.' };
  if (typeof data !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return { ok: false, message: 'The picture could not be read.' };
  const buffer = Buffer.from(data, 'base64');
  if (!buffer.length) return { ok: false, message: 'The picture is empty.' };
  const max = contentType.startsWith('image/') ? MAX_BYTES : MAX_ASSET_BYTES;
  if (buffer.length > max) return { ok: false, message: contentType.startsWith('image/') ? `The picture is too big (max ${Math.round(MAX_BYTES / 1024)} KB after shrinking).` : `The media file is too big (max ${Math.round(MAX_ASSET_BYTES / 1024 / 1024)} MB).` };
  if (sniff(buffer) !== contentType) return { ok: false, message: 'This file is not a real picture of that type.' };
  return { ok: true, buffer, contentType };
}
// A picture address we accept in products/categories: normal http(s) link OR one of our own uploads.
function isAllowedImageUrl(v) {
  if (MEDIA_URL.test(v)) return true;
  try { const u = new URL(v); return u.protocol === 'https:' || u.protocol === 'http:'; } catch { return false; }
}
module.exports = { MAX_BYTES, MAX_ASSET_BYTES, TYPES, MEDIA_URL, sniff, checkUpload, isAllowedImageUrl };
