const test = require('node:test');
const assert = require('node:assert/strict');
const { sniff, checkUpload, isAllowedImageUrl, MAX_BYTES } = require('../services/mediaRules');

const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(40, 1)]);
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40, 1)]);
const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.from([1, 2, 3, 4]), Buffer.from('WEBP'), Buffer.alloc(40, 1)]);
const b64 = (b) => b.toString('base64');

test('media: real pictures are recognised by their first bytes', () => {
  assert.equal(sniff(jpeg), 'image/jpeg'); assert.equal(sniff(png), 'image/png'); assert.equal(sniff(webp), 'image/webp');
  assert.equal(sniff(Buffer.from('<svg onload=alert(1)></svg>')), null);
  assert.equal(sniff(Buffer.from('<script>alert(1)</script> padding')), null);
});

test('media: upload check accepts a matching picture and refuses disguised, huge or wrong-type files', () => {
  assert.equal(checkUpload({ contentType: 'image/jpeg', data: b64(jpeg) }).ok, true);
  assert.equal(checkUpload({ contentType: 'image/png', data: b64(png) }).ok, true);
  assert.equal(checkUpload({ contentType: 'image/png', data: b64(jpeg) }).ok, false, 'type must match the content');
  assert.equal(checkUpload({ contentType: 'image/svg+xml', data: b64(jpeg) }).ok, false, 'svg is refused (can carry scripts)');
  assert.equal(checkUpload({ contentType: 'image/jpeg', data: b64(Buffer.from('<html><script>x</script></html>')) }).ok, false);
  assert.equal(checkUpload({ contentType: 'image/jpeg', data: 'not base64!!' }).ok, false);
  assert.equal(checkUpload({ contentType: 'image/jpeg', data: '' }).ok, false);
  const big = Buffer.concat([jpeg, Buffer.alloc(MAX_BYTES, 7)]);
  assert.match(checkUpload({ contentType: 'image/jpeg', data: b64(big) }).message, /too big/);
});

test('media: picture addresses = https/http links or our own uploads only', () => {
  assert.equal(isAllowedImageUrl('https://cdn.example.com/a.jpg'), true);
  assert.equal(isAllowedImageUrl('/api/media/0123456789abcdef01234567'), true);
  for (const bad of ['javascript:alert(1)', 'data:image/png;base64,AAAA', '/api/media/xyz', '/api/media/0123456789abcdef01234567/../x', 'ftp://x/y.jpg', '//evil.com/a.jpg', '']) assert.equal(isAllowedImageUrl(bad), false, bad);
});
