const test = require('node:test');
const assert = require('node:assert/strict');

test('chunked video: supports original MP4/WebM uploads up to 250 MiB', async () => {
  const rules = await import('../shared/mediaLimits.mjs');
  assert.equal(rules.MEDIA_MAX_BYTES, 250 * 1024 * 1024);
  assert.equal(rules.MEDIA_CHUNK_BYTES, 4 * 1024 * 1024);
  assert.deepEqual(rules.CHUNKED_VIDEO_TYPES, ['video/mp4', 'video/webm']);

  const maximum = rules.MEDIA_MAX_BYTES;
  assert.equal(rules.mediaChunkCount(1), 1);
  assert.equal(rules.mediaChunkCount(rules.MEDIA_CHUNK_BYTES), 1);
  assert.equal(rules.mediaChunkCount(rules.MEDIA_CHUNK_BYTES + 1), 2);
  assert.equal(rules.mediaChunkCount(maximum), 63);
  assert.equal(rules.expectedMediaChunkBytes(maximum, 62), 2 * 1024 * 1024);
  assert.throws(() => rules.mediaChunkCount(maximum + 1), RangeError);
  assert.throws(() => rules.mediaChunkCount(0), RangeError);
});

test('chunked video: validates per-chunk sizes and rejects invalid indices', async () => {
  const rules = await import('../shared/mediaLimits.mjs');
  const size = 4 * 1024 * 1024 + 7;
  assert.equal(rules.expectedMediaChunkBytes(size, 0), 4 * 1024 * 1024);
  assert.equal(rules.expectedMediaChunkBytes(size, 1), 7);
  assert.throws(() => rules.expectedMediaChunkBytes(size, 2), RangeError);
  assert.throws(() => rules.expectedMediaChunkBytes(size, 0, rules.MEDIA_MAX_CHUNK_BYTES + 1), RangeError);
});

test('chunked video: validates MP4/WebM file signatures and rejects other content types', async () => {
  const rules = await import('../shared/mediaLimits.mjs');
  const mp4 = Buffer.concat([Buffer.alloc(4), Buffer.from('ftyp'), Buffer.alloc(8)]);
  const webm = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(8)]);
  const disguised = Buffer.from('<html>not a video</html>');

  assert.equal(rules.isValidChunkedMediaSignature(mp4, 'video/mp4'), true);
  assert.equal(rules.isValidChunkedMediaSignature(webm, 'video/webm'), true);
  assert.equal(rules.isValidChunkedMediaSignature(mp4, 'video/webm'), false);
  assert.equal(rules.isValidChunkedMediaSignature(disguised, 'video/mp4'), false);
  assert.equal(rules.isValidChunkedMediaSignature(mp4, 'video/quicktime'), false);
});
