const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const load = async () => import('data:text/javascript;base64,' +
  Buffer.from(fs.readFileSync(path.join(__dirname, '../functions/api/response.js'), 'utf8')).toString('base64'));

test('Cloudflare adapter returns uploaded binary media as bytes, not base64 text', async () => {
  const { responseFromNetlify } = await load();
  const original = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x41, 0x46, 0x53, 0x41, 0x4e, 0x41]);
  const response = responseFromNetlify({
    statusCode: 200,
    isBase64Encoded: true,
    body: original.toString('base64'),
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' }
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/jpeg');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), original);
});

test('Cloudflare adapter preserves ordinary JSON response bodies', async () => {
  const { responseFromNetlify } = await load();
  const response = responseFromNetlify({
    statusCode: 201,
    isBase64Encoded: false,
    body: JSON.stringify({ success: true, url: '/api/media/0123456789abcdef01234567' }),
    headers: { 'Content-Type': 'application/json' }
  });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { success: true, url: '/api/media/0123456789abcdef01234567' });
});
