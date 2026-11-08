export const MEDIA_CHUNK_BYTES = 4 * 1024 * 1024;
export const MEDIA_MAX_BYTES = 250 * 1024 * 1024;
export const MEDIA_MAX_CHUNK_BYTES = 25 * 1024 * 1024;
export const MEDIA_UPLOAD_TTL_SECONDS = 24 * 60 * 60;
export const CHUNKED_VIDEO_TYPES = Object.freeze(['video/mp4', 'video/webm']);

export function mediaChunkCount(size, chunkSize = MEDIA_CHUNK_BYTES) {
  if (!Number.isSafeInteger(size) || size < 1 || size > MEDIA_MAX_BYTES) {
    throw new RangeError('Video size must be between 1 byte and 250 MiB.');
  }
  if (!Number.isSafeInteger(chunkSize) || chunkSize < 1 || chunkSize > MEDIA_MAX_CHUNK_BYTES) {
    throw new RangeError('Video chunk size is outside the supported range.');
  }
  return Math.ceil(size / chunkSize);
}

export function expectedMediaChunkBytes(size, index, chunkSize = MEDIA_CHUNK_BYTES) {
  const count = mediaChunkCount(size, chunkSize);
  if (!Number.isSafeInteger(index) || index < 0 || index >= count) {
    throw new RangeError('Video chunk index is invalid.');
  }
  return Math.min(chunkSize, size - index * chunkSize);
}

export function isValidChunkedMediaSignature(input, contentType) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input || []);
  if (contentType === 'video/mp4') {
    return bytes.length >= 12 &&
      bytes[4] === 0x66 && bytes[5] === 0x74 &&
      bytes[6] === 0x79 && bytes[7] === 0x70;
  }
  if (contentType === 'video/webm') {
    return bytes.length >= 4 &&
      bytes[0] === 0x1a && bytes[1] === 0x45 &&
      bytes[2] === 0xdf && bytes[3] === 0xa3;
  }
  return false;
}
