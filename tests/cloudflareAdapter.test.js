const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const load = async () => import('data:text/javascript;base64,' +
  Buffer.from(fs.readFileSync(path.join(__dirname, '../functions/api/response.js'), 'utf8')).toString('base64'));

test('Cloudflare adapter returns uploaded image, video and GLB media as bytes', async () => {
  const { responseFromHandler } = await load();
  const samples = [
    ['image/jpeg', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x41, 0x46, 0x53, 0x41, 0x4e, 0x41])],
    ['video/mp4', Buffer.concat([Buffer.alloc(4), Buffer.from('ftyp'), Buffer.from('AFSANA-MP4')])],
    ['video/webm', Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.from('AFSANA-WEBM')])],
    ['model/gltf-binary', Buffer.concat([Buffer.from('glTF'), Buffer.from([2, 0, 0, 0]), Buffer.alloc(4), Buffer.from('AFSANA-GLB')])]
  ];

  for (const [contentType, original] of samples) {
    const response = responseFromHandler({
      statusCode: 200,
      isBase64Encoded: true,
      body: original.toString('base64'),
      headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=31536000, immutable' }
    });
    assert.equal(response.status, 200, contentType);
    assert.equal(response.headers.get('content-type'), contentType, contentType);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), original, contentType);
  }
});

test('Cloudflare adapter preserves ordinary JSON response bodies', async () => {
  const { responseFromHandler } = await load();
  const response = responseFromHandler({
    statusCode: 201,
    isBase64Encoded: false,
    body: JSON.stringify({ success: true, url: '/api/media/0123456789abcdef01234567' }),
    headers: { 'Content-Type': 'application/json' }
  });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { success: true, url: '/api/media/0123456789abcdef01234567' });
});
