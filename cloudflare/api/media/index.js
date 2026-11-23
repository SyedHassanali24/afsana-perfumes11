// Picture upload + serving.
//   POST /api/media/admin  (staff who can edit pictures: products.manageImages, categories/banners edit...) body { filename?, contentType, data: base64 }  -> { url: "/api/media/<id>" }
//   GET  /api/media/<id>   (public)  -> the picture itself, cached by the browser for a year (a picture never changes once uploaded)
const { createHandler } = require('../../../middleware/withApi');
const { res, json } = require('../../../middleware/http');
const { stripPrefix } = require('../../../middleware/router');
const { connectDB } = require('../../../database/connection');
const { E } = require('../../../middleware/errors');
const { Media } = require('../../../database/models');
const { audit } = require('../../../services/audit');
const { checkUpload } = require('../../../services/mediaRules');
const mongoose = require('mongoose');
const S = require('../../../validation/schemas');

// Anyone who can edit a picture somewhere (product pictures, categories, banners...) may upload one.
const UPLOADERS = [['products', 'manageImages'], ['categories', 'edit'], ['categories', 'create'], ['collections', 'edit'], ['brands', 'edit'], ['banners', 'create'], ['banners', 'edit'], ['homepage', 'create'], ['homepage', 'edit']];

const VIDEO_UPLOADS = 'afsana_video_uploads';
const VIDEO_CHUNKS = 'afsana_video_chunks';
const VIDEO_FILES = 'afsana_video_files';

function scopedStoreId(scopes) {
  if (!Array.isArray(scopes) || !scopes.length) throw E.forbidden();
  if (scopes.some((scope) => scope.kind === 'all')) return 'main';
  const ids = [...new Set(scopes.filter((scope) => scope.kind === 'stores').flatMap((scope) => scope.values || []))];
  if (ids.length !== 1) throw E.forbidden('Video uploads must belong to one store in your access scope.');
  return ids[0];
}
function objectIdOrNull(value) {
  return /^[a-f0-9]{24}$/i.test(String(value || '')) ? new mongoose.Types.ObjectId(String(value)) : null;
}
function safeFilename(value) {
  return String(value || 'afsana-video')
    .replace(/[^a-zA-Z0-9._ -]/g, '_')
    .trim()
    .slice(0, 120) || 'afsana-video';
}

function videoChunkBuffer(value) {
  if (Buffer.isBuffer(value)) return value;
  if (value && typeof value.value === 'function') return Buffer.from(value.value(true));
  if (value && value.buffer) {
    const bytes = Buffer.from(value.buffer);
    return bytes.subarray(0, Number.isInteger(value.position) ? value.position : bytes.length);
  }
  return Buffer.from(value || []);
}

const api = createHandler('media', [
  { method: 'POST', path: '/profile', body: S.uploadBody, rateLimit: { limit: 20, windowMs: 10 * 60000 }, handler: async ({ ctx, body }) => {
      const c = checkUpload(body); if (!c.ok) throw E.badRequest(c.message);
      const doc = await Media.create({ contentType: c.contentType, size: c.buffer.length, data: c.buffer, filename: body.filename || 'profile-avatar', uploadedBy: ctx.user._id });
      await audit(ctx, { action: 'media.profile_uploaded', module: 'staff', recordId: doc._id, newValue: { size: doc.size, contentType: doc.contentType } });
      return res(201, { url: `/api/media/${doc._id}`, size: doc.size });
    } },
  { method: 'POST', path: '/admin', body: S.uploadBody, rateLimit: { limit: 60, windowMs: 10 * 60000 },
    handler: async ({ ctx, body }) => {
      if (!UPLOADERS.some(([m, a]) => ctx.perms.can(m, a))) throw E.forbidden();
      const c = checkUpload(body);
      if (!c.ok) throw E.badRequest(c.message);
      const doc = await Media.create({ contentType: c.contentType, size: c.buffer.length, data: c.buffer, filename: body.filename, uploadedBy: ctx.user._id });
      await audit(ctx, { action: 'media.uploaded', module: 'products', recordId: doc._id, newValue: { size: doc.size, contentType: doc.contentType } });
      return res(201, { url: `/api/media/${doc._id}`, size: doc.size });
    } },
  {
    method: 'POST', path: '/videos/uploads', permission: ['homepage', 'edit'],
    body: S.videoUploadStartBody, rateLimit: { limit: 10, windowMs: 10 * 60000 },
    handler: async ({ ctx, scopes, body }) => {
      const { MEDIA_CHUNK_BYTES, MEDIA_UPLOAD_TTL_SECONDS, mediaChunkCount, CHUNKED_VIDEO_TYPES } = await import('../../../shared/mediaLimits.mjs');
      if (!CHUNKED_VIDEO_TYPES.includes(body.contentType)) throw E.badRequest('Choose an MP4 or WebM video.');
      const chunkCount = mediaChunkCount(body.size, MEDIA_CHUNK_BYTES);
      const db = mongoose.connection.db;
      const storeId = scopedStoreId(scopes);
      const uploads = db.collection(VIDEO_UPLOADS);
      const chunks = db.collection(VIDEO_CHUNKS);
      await Promise.all([
        uploads.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'afsana_video_upload_expiry' }),
        chunks.createIndex({ uploadId: 1, index: 1 }, { unique: true, name: 'afsana_video_chunk_unique' }),
        chunks.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'afsana_video_chunk_expiry' }),
      ]);
      const uploadId = new mongoose.Types.ObjectId();
      const expiresAt = new Date(Date.now() + MEDIA_UPLOAD_TTL_SECONDS * 1000);
      const filename = safeFilename(body.filename);
      await uploads.insertOne({
        _id: uploadId, storeId, filename, contentType: body.contentType,
        size: body.size, chunkSize: MEDIA_CHUNK_BYTES, chunkCount,
        uploadedBy: ctx.user._id, status: 'uploading', createdAt: new Date(), expiresAt,
      });
      return res(201, { uploadId: String(uploadId), chunkSize: MEDIA_CHUNK_BYTES, chunkCount, expiresAt });
    },
  },
  {
    method: 'POST', path: '/videos/uploads/:uploadId/chunks/:index',
    permission: ['homepage', 'edit'], body: S.videoUploadChunkBody,
    maxBodyBytes: 5700000, rateLimit: { limit: 1000, windowMs: 10 * 60000 },
    handler: async ({ ctx, scopes, params, body }) => {
      const uploadId = objectIdOrNull(params.uploadId);
      if (!uploadId) throw E.badRequest('Invalid video upload session.');
      const { expectedMediaChunkBytes, isValidChunkedMediaSignature, decodeCanonicalBase64 } = await import('../../../shared/mediaLimits.mjs');
      const db = mongoose.connection.db;
      const storeId = scopedStoreId(scopes);
      const uploads = db.collection(VIDEO_UPLOADS);
      const chunks = db.collection(VIDEO_CHUNKS);
      const upload = await uploads.findOne({
        _id: uploadId, storeId, uploadedBy: ctx.user._id,
        status: 'uploading', expiresAt: { $gt: new Date() },
      });
      if (!upload) throw E.notFound('Video upload session not found or expired.');
      const index = Number(params.index);
      if (!Number.isSafeInteger(index)) throw E.badRequest('Invalid video chunk number.');
      let expectedBytes;
      try { expectedBytes = expectedMediaChunkBytes(upload.size, index, upload.chunkSize); }
      catch { throw E.badRequest('Video chunk number is outside the upload.'); }
      // Do not run a backtracking RegExp over multi-megabyte base64 payloads:
      // V8 can overflow its stack on a full 4 MiB video chunk. The canonical
      // decode/encode equality check below rejects malformed or non-canonical base64.
      const data = decodeCanonicalBase64(body.data);
      if (!data || data.length !== expectedBytes) {
        throw E.badRequest('The uploaded video part is not valid base64 or has an unexpected size.');
      }
      if (index === 0 && !isValidChunkedMediaSignature(data, upload.contentType)) {
        throw E.badRequest('The file contents do not match the selected video format.');
      }
      await chunks.updateOne(
        { uploadId, index },
        { $set: { uploadId, index, data, storeId, expiresAt: upload.expiresAt }, $setOnInsert: { createdAt: new Date() } },
        { upsert: true },
      );
      return { uploaded: true, index, bytes: data.length };
    },
  },
  {
    method: 'POST', path: '/videos/uploads/:uploadId/complete',
    permission: ['homepage', 'edit'], rateLimit: { limit: 20, windowMs: 10 * 60000 },
    handler: async ({ ctx, scopes, params }) => {
      const uploadId = objectIdOrNull(params.uploadId);
      if (!uploadId) throw E.badRequest('Invalid video upload session.');
      const db = mongoose.connection.db;
      const storeId = scopedStoreId(scopes);
      const uploads = db.collection(VIDEO_UPLOADS);
      const chunks = db.collection(VIDEO_CHUNKS);
      const videos = db.collection(VIDEO_FILES);
      const existing = await videos.findOne({ _id: uploadId, storeId });
      if (existing) {
        await chunks.updateMany({ uploadId, storeId }, { $unset: { expiresAt: '' } });
        await uploads.deleteOne({ _id: uploadId });
        return { url: `/api/media/video/${uploadId}`, size: existing.size, contentType: existing.contentType, filename: existing.filename };
      }
      const lock = await uploads.updateOne(
        { _id: uploadId, storeId, uploadedBy: ctx.user._id, status: 'uploading', expiresAt: { $gt: new Date() } },
        { $set: { status: 'completing', completingAt: new Date() } },
      );
      if (!lock.modifiedCount) throw E.conflict('This video upload is already completing or has expired.');
      const upload = await uploads.findOne({ _id: uploadId, storeId });
      if (!upload) throw E.notFound('Video upload session not found.');
      const received = await chunks.find({ uploadId, storeId }, { projection: { _id: 0, index: 1 } }).sort({ index: 1 }).toArray();
      const complete = received.length === upload.chunkCount && received.every((part, index) => part.index === index);
      if (!complete) {
        await uploads.updateOne({ _id: uploadId, storeId, status: 'completing' }, { $set: { status: 'uploading' }, $unset: { completingAt: '' } });
        throw E.badRequest(`Video upload is incomplete: received ${received.length} of ${upload.chunkCount} parts.`);
      }
      const first = await chunks.findOne({ uploadId, index: 0, storeId });
      const { isValidChunkedMediaSignature } = await import('../../../shared/mediaLimits.mjs');
      if (!first || !isValidChunkedMediaSignature(videoChunkBuffer(first.data), upload.contentType)) {
        await uploads.updateOne({ _id: uploadId, storeId }, { $set: { status: 'uploading' }, $unset: { completingAt: '' } });
        throw E.badRequest('The uploaded file does not match the selected video format.');
      }
      const file = {
        _id: uploadId, storeId, filename: upload.filename, contentType: upload.contentType,
        size: upload.size, chunkSize: upload.chunkSize, chunkCount: upload.chunkCount,
        uploadedBy: upload.uploadedBy, createdAt: new Date(),
      };
      await videos.insertOne(file);
      await chunks.updateMany({ uploadId, storeId }, { $unset: { expiresAt: '' } });
      await uploads.deleteOne({ _id: uploadId, storeId });
      await audit(ctx, { action: 'media.video_uploaded', module: 'homepage', recordId: String(uploadId), newValue: { filename: file.filename, contentType: file.contentType, size: file.size } });
      return res(201, { url: `/api/media/video/${uploadId}`, size: file.size, contentType: file.contentType, filename: file.filename });
    },
  },
]);

exports.handler = async (event) => {
  const method = (event.httpMethod || 'GET').toUpperCase();
  const id = stripPrefix(event.path || '/', 'media').replace(/^\//, '');
  if (method === 'GET' && /^[0-9a-f]{24}$/.test(id)) {
    try {
      await connectDB();
      const doc = await Media.findById(id).select('contentType data').lean();
      if (!doc) return json(404, { success: false, error: { code: 'NOT_FOUND', message: 'Picture not found.' } });
      return {
        statusCode: 200, isBase64Encoded: true, body: Buffer.from(doc.data.buffer ? doc.data.buffer : doc.data).toString('base64'),
        headers: { 'Content-Type': doc.contentType, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox" },
      };
    } catch (e) {
      console.error('[media] read failed:', e && e.name);
      return json(500, { success: false, error: { code: 'INTERNAL', message: 'Something went wrong. Please try again.' } });
    }
  }
  return api(event);
};
