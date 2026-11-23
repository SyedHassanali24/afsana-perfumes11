export const MEDIA_CHUNK_BYTES = 4 * 1024 * 1024;
export const MEDIA_MAX_BYTES = 250 * 1024 * 1024;
export const MEDIA_MAX_CHUNK_BYTES = 25 * 1024 * 1024;
export const MEDIA_UPLOAD_TTL_SECONDS = 24 * 60 * 60;
export const CHUNKED_VIDEO_TYPES = Object.freeze(['video/mp4', 'video/webm']);

// Decode large upload chunks without a regular expression over the full payload.
// Buffer's canonical round-trip rejects invalid and non-canonical base64 strings.
export function decodeCanonicalBase64(value) {
  if (typeof value !== 'string' || value.length === 0) return null;
  const decoded = Buffer.from(value, 'base64');
  if (!decoded.length || decoded.toString('base64') !== value) return null;
  return decoded;
}

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


export function parseMediaByteRange(value, size) {
  if (!value) return null;
  if (!Number.isSafeInteger(size) || size < 1) return false;
  const header = String(value);
  if (!header.startsWith('bytes=') || header.includes(',')) return false;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) return false;
  let start;
  let end;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return false;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start) return false;
  return { start, end: Math.min(end, size - 1) };
}
