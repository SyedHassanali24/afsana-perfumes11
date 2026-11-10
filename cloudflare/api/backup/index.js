// POST /api/backup/admin/{overview|data|pictures}: owner-level export, one page per request. Needs backup.export AND the user's password every time.
const { createHandler } = require('../../../middleware/withApi');
const S = require('../../../validation/schemas');
const B = require('../../../services/backupService');

const opts = { permission: ['backup', 'export'], reauth: true, rateLimit: { limit: 400, windowMs: 10 * 60000 } };
exports.handler = createHandler('backup', [
  { method: 'POST', path: '/admin/overview', ...opts, body: S.backupOverview, handler: ({ ctx }) => B.overview(ctx) },
  { method: 'POST', path: '/admin/data', ...opts, body: S.backupData, handler: ({ body }) => B.page(body.name, body.after, body.limit) },
  { method: 'POST', path: '/admin/pictures', ...opts, body: S.backupPictures, handler: ({ body }) => B.pictures(body.after, body.limit) },
]);
