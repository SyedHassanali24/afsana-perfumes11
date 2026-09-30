const { createHandler } = require('../../../middleware/withApi');
const { res } = require('../../../middleware/http');
const { clearCustomerCookie } = require('../../../middleware/customerAuth');
const { Session } = require('../../../database/models');
const S = require('../../../validation/schemas');
const A = require('../../../services/accountService');
const O = require('../../../services/orderService');

const meta = (req, ip) => ({ ip, userAgent: req.headers['user-agent'] });
const customer = { audience: 'customer' };

// Storefront customer accounts (cookie: afsana_customer). Staff use /api/auth instead.
const routes = [
  { method: 'POST', path: '/register', public: true, body: S.registerBody, rateLimit: { limit: 5, windowMs: 60 * 60000 },
    async handler({ body, req, ip }) { const { cookie, customer: c } = await A.register(body, meta(req, ip)); return res(201, { customer: c }, { 'Set-Cookie': cookie }); } },
  { method: 'POST', path: '/login', public: true, body: S.customerLoginBody, rateLimit: { limit: 10, windowMs: 15 * 60000 },
    async handler({ body, req, ip }) { const { cookie, customer: c } = await A.login(body, meta(req, ip)); return res(200, { customer: c }, { 'Set-Cookie': cookie }); } },
  { method: 'POST', path: '/forgot-password', public: true, body: S.forgotBody, rateLimit: { limit: 5, windowMs: 60 * 60000 },
    async handler({ body }) { await A.forgotPassword(body); return { message: 'If an account exists, a reset link has been sent.' }; } },
  { method: 'POST', path: '/reset-password', public: true, body: S.resetBody, rateLimit: { limit: 10, windowMs: 60 * 60000 },
    async handler({ body }) { await A.resetPassword(body); return {}; } },

  { ...customer, method: 'POST', path: '/logout',
    async handler({ ctx }) { await Session.updateOne({ _id: ctx.session._id }, { revokedAt: new Date(), revokedReason: 'logout' }); return res(200, {}, { 'Set-Cookie': clearCustomerCookie() }); } },
  { ...customer, method: 'GET', path: '/me', handler: ({ ctx }) => ({ customer: A.shape(ctx.customer) }) },
  { ...customer, method: 'PATCH', path: '/me', body: S.profilePatch, handler: ({ ctx, body }) => A.updateProfile(ctx, body) },
  { ...customer, method: 'GET', path: '/orders', query: S.myOrdersQuery, handler: ({ ctx, query }) => O.listMine(ctx.customer._id, query) },
  { ...customer, method: 'GET', path: '/orders/:orderNumber', handler: ({ ctx, params }) => O.getMine(ctx.customer._id, params.orderNumber) },
  { ...customer, method: 'GET', path: '/addresses', handler: ({ ctx }) => A.listAddresses(ctx) },
  { ...customer, method: 'POST', path: '/addresses', body: S.addressBody, handler: async ({ ctx, body }) => res(201, await A.addAddress(ctx, body)) },
  { ...customer, method: 'PATCH', path: '/addresses/:id', body: S.addressPatch, handler: ({ ctx, params, body }) => A.updateAddress(ctx, params.id, body) },
  { ...customer, method: 'DELETE', path: '/addresses/:id', handler: ({ ctx, params }) => A.removeAddress(ctx, params.id) },
  { ...customer, method: 'POST', path: '/change-password', body: S.customerChangePassword, rateLimit: { limit: 10, windowMs: 15 * 60000 }, handler: ({ ctx, body }) => A.changePassword(ctx, body) },
];
exports.handler = createHandler('account', routes);
