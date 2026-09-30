const { createHandler } = require('../../../middleware/withApi');
const { res } = require('../../../middleware/http');
const { redact } = require('../../../middleware/redact');
const S = require('../../../validation/schemas');
const O = require('../../../services/orderService');

const routes = [
  // ---- public ----
  { method: 'POST', path: '/', public: true, optionalCustomer: true, body: S.checkoutBody, rateLimit: { limit: 10, windowMs: 10 * 60000 },
    handler: async ({ body, ctx }) => res(201, { order: await O.placeOrder(body, ctx) }) },
  { method: 'GET', path: '/track/:orderNumber', public: true, query: S.trackQuery, rateLimit: { limit: 20, windowMs: 10 * 60000 },
    handler: ({ params, query }) => O.trackOrder(params.orderNumber, query.phone) },

  // ---- admin ----
  { method: 'GET', path: '/admin/list', permission: ['orders', 'view'], query: S.ordersQuery,
    handler: async ({ query, ctx, scopes }) => redact(await O.listOrders(query, scopes, ctx.user._id), ctx.perms.deniedFields) },
  { method: 'GET', path: '/admin/:id', permission: ['orders', 'view'],
    handler: async ({ params, ctx, scopes }) => redact(await O.getOrder(params.id, scopes, ctx.user._id), ctx.perms.deniedFields) },
  { method: 'PATCH', path: '/admin/:id/status', permission: ['orders', 'changeStatus'], body: S.statusBody,
    handler: async ({ params, body, ctx, scopes }) => { const o = await O.changeStatus(ctx, params.id, body.status, body.note, scopes); return { status: o.status }; } },
  { method: 'POST', path: '/admin/:id/notes', permission: ['orders', 'edit'], body: S.noteBody,
    handler: async ({ params, body, ctx, scopes }) => { await O.addNote(ctx, params.id, body.text, scopes); return {}; } },
  { method: 'PATCH', path: '/admin/:id/payment', permission: ['payments', 'changeStatus'], body: S.paymentBody,
    handler: async ({ params, body, ctx, scopes }) => { await O.setPayment(ctx, params.id, body, scopes); return {}; } },
];
exports.handler = createHandler('orders', routes);
