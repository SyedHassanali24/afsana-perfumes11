const { createHandler } = require('../../../middleware/withApi');
const { res } = require('../../../middleware/http');
const { redact } = require('../../../middleware/redact');
const S = require('../../../validation/schemas');
const Rt = require('../../../services/returnService');

const mine = { audience: 'customer' }; // storefront session (afsana_customer); a shopper only ever reaches their own returns

// Static paths first: the router is first-match.
const routes = [
  // ---- shopper (signed in) ----
  { ...mine, method: 'GET', path: '/mine', query: S.myReturnsQuery, handler: ({ ctx, query }) => Rt.listMine(ctx.customer._id, query) },
  { ...mine, method: 'GET', path: '/mine/eligibility/:orderNumber', handler: ({ ctx, params }) => Rt.eligibilityMine(ctx.customer._id, params.orderNumber) },
  { ...mine, method: 'POST', path: '/mine', body: S.returnCreate, rateLimit: { limit: 10, windowMs: 60 * 60000 },
    handler: async ({ ctx, body }) => res(201, await Rt.createMine(ctx.customer, body)) },
  { ...mine, method: 'GET', path: '/mine/:returnNumber', handler: ({ ctx, params }) => Rt.getMine(ctx.customer._id, params.returnNumber) },
  { ...mine, method: 'POST', path: '/mine/:returnNumber/cancel', rateLimit: { limit: 20, windowMs: 60 * 60000 }, handler: ({ ctx, params }) => Rt.cancelMine(ctx.customer, params.returnNumber) },

  // ---- staff ----
  { method: 'GET', path: '/admin/list', permission: ['returns', 'view'], query: S.returnsQuery,
    handler: async ({ ctx, query, scopes }) => redact(await Rt.list(ctx, query, scopes), ctx.perms.deniedFields) },
  { method: 'GET', path: '/admin/eligibility/:orderNumber', permission: ['returns', 'create'],
    handler: async ({ ctx, params, scopes }) => redact(await Rt.eligibilityStaff(ctx, params.orderNumber, scopes), ctx.perms.deniedFields) },
  { method: 'POST', path: '/admin', permission: ['returns', 'create'], body: S.returnCreate,
    handler: async ({ ctx, body, scopes }) => res(201, redact(await Rt.createStaff(ctx, body, scopes), ctx.perms.deniedFields)) },
  { method: 'GET', path: '/admin/:id', permission: ['returns', 'view'],
    handler: async ({ ctx, params, scopes }) => redact(await Rt.get(ctx, params.id, scopes), ctx.perms.deniedFields) },
  { method: 'PATCH', path: '/admin/:id/status', permission: ['returns', 'changeStatus'], body: S.returnStatusBody,
    handler: async ({ ctx, params, body, scopes }) => redact(await Rt.setStatus(ctx, params.id, body, scopes), ctx.perms.deniedFields) },
  // Money leaves the business: refunds.refund permission + the actor's password (reauth) + audit log row written by the service.
  { method: 'POST', path: '/admin/:id/refund', permission: ['refunds', 'refund'], body: S.refundBody, reauth: true, rateLimit: { limit: 30, windowMs: 10 * 60000 },
    handler: async ({ ctx, params, body, scopes }) => redact(await Rt.issueRefund(ctx, params.id, body, scopes), ctx.perms.deniedFields) },
];
exports.handler = createHandler('returns', routes);
