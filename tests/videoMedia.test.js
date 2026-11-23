const test = require('node:test');
const assert = require('node:assert/strict');

const {
  MEDIA_CHUNK_BYTES,
  MEDIA_MAX_BYTES,
  CHUNKED_VIDEO_TYPES,
  mediaChunkCount,
  expectedMediaChunkBytes,
  isValidChunkedMediaSignature,
  parseMediaByteRange,
} = await import('../shared/mediaLimits.mjs');

test('video media: upload chunk counts and final chunk lengths are exact', () => {
  assert.deepEqual(CHUNKED_VIDEO_TYPES, ['video/mp4', 'video/webm']);
  assert.equal(mediaChunkCount(1), 1);
  assert.equal(mediaChunkCount(MEDIA_CHUNK_BYTES), 1);
  assert.equal(mediaChunkCount(MEDIA_CHUNK_BYTES + 1), 2);
  assert.equal(mediaChunkCount(MEDIA_MAX_BYTES), Math.ceil(MEDIA_MAX_BYTES / MEDIA_CHUNK_BYTES));
  assert.equal(expectedMediaChunkBytes(MEDIA_CHUNK_BYTES + 1, 0), MEDIA_CHUNK_BYTES);
  assert.equal(expectedMediaChunkBytes(MEDIA_CHUNK_BYTES + 1, 1), 1);
  assert.throws(() => mediaChunkCount(0), /between 1 byte/);
  assert.throws(() => mediaChunkCount(MEDIA_MAX_BYTES + 1), /between 1 byte/);
  assert.throws(() => expectedMediaChunkBytes(MEDIA_CHUNK_BYTES, 1), /index is invalid/);
});

test('video media: MP4 and WebM signatures are checked against the selected type', () => {
  const mp4 = new Uint8Array(16);
  mp4.set([0x66, 0x74, 0x79, 0x70], 4);
  const webm = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x00, 0x00]);
  const fake = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00]);
  assert.equal(isValidChunkedMediaSignature(mp4, 'video/mp4'), true);
  assert.equal(isValidChunkedMediaSignature(webm, 'video/webm'), true);
  assert.equal(isValidChunkedMediaSignature(mp4, 'video/webm'), false);
  assert.equal(isValidChunkedMediaSignature(webm, 'video/mp4'), false);
  assert.equal(isValidChunkedMediaSignature(fake, 'video/mp4'), false);
});

test('video media: byte ranges support full, open-ended and suffix requests', () => {
  assert.equal(parseMediaByteRange('', 100), null);
  assert.deepEqual(parseMediaByteRange('bytes=0-9', 100), { start: 0, end: 9 });
  assert.deepEqual(parseMediaByteRange('bytes=10-', 100), { start: 10, end: 99 });
  assert.deepEqual(parseMediaByteRange('bytes=-10', 100), { start: 90, end: 99 });
  assert.deepEqual(parseMediaByteRange('bytes=90-200', 100), { start: 90, end: 99 });
});

test('video media: malformed, multiple and unsatisfiable ranges are rejected', () => {
  for (const range of ['items=0-1', 'bytes=1-2,4-5', 'bytes=-0', 'bytes=100-101', 'bytes=9-2', 'bytes=-', 'bytes=x-y']) {
    assert.equal(parseMediaByteRange(range, 100), false, range);
  }
  assert.equal(parseMediaByteRange('bytes=0-0', 0), false);
});
