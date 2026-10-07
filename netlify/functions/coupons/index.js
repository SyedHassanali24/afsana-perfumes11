const { createHandler } = require('../../../middleware/withApi');
const { res } = require('../../../middleware/http');
const S = require('../../../validation/schemas');
const Cp = require('../../../services/couponService');

// All routes are staff-only (admin). Checkout/cart read coupons through services/cartService + orderService, not through this function.
const routes = [
  { method: 'GET', path: '/admin', permission: ['coupons', 'view'], query: S.couponQuery, handler: ({ query }) => Cp.list(query) },
  { method: 'POST', path: '/admin', permission: ['coupons', 'create'], body: S.couponBody, handler: async ({ ctx, body }) => res(201, await Cp.create(ctx, body)) },
  { method: 'GET', path: '/admin/:id', permission: ['coupons', 'view'], handler: ({ params }) => Cp.get(params.id) },
  { method: 'PATCH', path: '/admin/:id/active', permission: ['coupons', 'edit'], body: S.couponActiveBody, handler: ({ ctx, params, body }) => Cp.setActive(ctx, params.id, body.isActive) },
  { method: 'PATCH', path: '/admin/:id', permission: ['coupons', 'edit'], body: S.couponPatch, handler: ({ ctx, params, body }) => Cp.update(ctx, params.id, body) },
  { method: 'POST', path: '/admin/:id/restore', permission: ['coupons', 'delete'], handler: ({ ctx, params }) => Cp.restore(ctx, params.id) },
  { method: 'DELETE', path: '/admin/:id', permission: ['coupons', 'delete'], handler: ({ ctx, params }) => Cp.remove(ctx, params.id) },
];
exports.handler = createHandler('coupons', routes);
