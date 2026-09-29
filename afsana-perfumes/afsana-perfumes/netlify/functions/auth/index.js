const { createHandler } = require('../../../middleware/withApi');
const { login, clearCookie, sessionCookie } = require('../../../middleware/auth');
const { res } = require('../../../middleware/http');
const { E } = require('../../../middleware/errors');
const { Session } = require('../../../database/models');
const S = require('../../../validation/schemas');

const routes = [
  { method: 'POST', path: '/login', public: true, body: S.loginBody, rateLimit: { limit: 10, windowMs: 15 * 60000 },
    async handler({ body, ip, req }) {
      const { cookie, user, staff } = await login({ ...body, ip, userAgent: req.headers['user-agent'] });
      return res(200, { user: { id: user._id, email: user.email, name: staff.name } }, { 'Set-Cookie': cookie });
    } },
  { method: 'POST', path: '/logout',
    async handler({ ctx }) {
      await Session.updateOne({ _id: ctx.session._id }, { revokedAt: new Date(), revokedReason: 'logout' });
      return res(200, {}, { 'Set-Cookie': clearCookie() });
    } },
  { method: 'POST', path: '/logout-all',
    async handler({ ctx }) {
      await Session.updateMany({ userId: ctx.user._id, revokedAt: { $exists: false } }, { revokedAt: new Date(), revokedReason: 'logout_all' });
      return res(200, {}, { 'Set-Cookie': clearCookie() });
    } },
  { method: 'GET', path: '/me',
    async handler({ ctx }) {
      return { user: { id: ctx.user._id, email: ctx.user.email, name: ctx.staff.name, role: { key: ctx.role.key, name: ctx.role.name, level: ctx.role.level } }, permissions: ctx.perms.toClient() };
    } },
  { method: 'GET', path: '/sessions',
    async handler({ ctx }) {
      const rows = await Session.find({ userId: ctx.user._id, revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } }).sort({ lastActiveAt: -1 }).lean();
      return { sessions: rows.map((s) => ({ id: s._id, device: s.device, lastActiveAt: s.lastActiveAt, createdAt: s.createdAt, current: String(s._id) === String(ctx.session._id) })) };
    } },
  { method: 'DELETE', path: '/sessions/:id',
    async handler({ ctx, params }) {
      const r = await Session.updateOne({ _id: params.id, userId: ctx.user._id, revokedAt: { $exists: false } }, { revokedAt: new Date(), revokedReason: 'revoked' });
      if (!r.matchedCount) throw E.notFound('Session not found.');
      return {};
    } },
];
exports.handler = createHandler('auth', routes);
