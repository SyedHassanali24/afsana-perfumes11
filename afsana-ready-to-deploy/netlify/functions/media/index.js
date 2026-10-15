// Picture upload + serving.
//   POST /api/media/admin  (staff with products.manageImages) body { filename?, contentType, data: base64 }  -> { url: "/api/media/<id>" }
//   GET  /api/media/<id>   (public)  -> the picture itself, cached by the browser for a year (a picture never changes once uploaded)
const { createHandler } = require('../../../middleware/withApi');
const { res, json } = require('../../../middleware/http');
const { stripPrefix } = require('../../../middleware/router');
const { connectDB } = require('../../../database/connection');
const { E } = require('../../../middleware/errors');
const { Media } = require('../../../database/models');
const { audit } = require('../../../services/audit');
const { checkUpload } = require('../../../services/mediaRules');
const S = require('../../../validation/schemas');

const api = createHandler('media', [
  { method: 'POST', path: '/admin', permission: ['products', 'manageImages'], body: S.uploadBody, rateLimit: { limit: 60, windowMs: 10 * 60000 },
    handler: async ({ ctx, body }) => {
      const c = checkUpload(body);
      if (!c.ok) throw E.badRequest(c.message);
      const doc = await Media.create({ contentType: c.contentType, size: c.buffer.length, data: c.buffer, filename: body.filename, uploadedBy: ctx.user._id });
      await audit(ctx, { action: 'media.uploaded', module: 'products', recordId: doc._id, newValue: { size: doc.size, contentType: doc.contentType } });
      return res(201, { url: `/api/media/${doc._id}`, size: doc.size });
    } },
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
