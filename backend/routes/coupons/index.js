const { createHandler } = require('../../../middleware/withApi');
const { res } = require('../../../middleware/http');
const S = require('../../../validation/schemas');
const Cp = require('../../../services/couponService');

// All routes are staff-only (admin). Checkout/cart read coupons through services/cartService + orderService, not through this function.
const routes = [
  { method: 'GET', path: '/admin', permission: ['coupons', 'view'], query: S.couponQuery, handler: ({ query, scopes, ctx }) => Cp.list(query, scopes, ctx.user._id) },
  { method: 'POST', path: '/admin', permission: ['coupons', 'create'], body: S.couponBody, handler: async ({ ctx, body, scopes }) => res(201, await Cp.create(ctx, body, scopes)) },
  { method: 'GET', path: '/admin/:id', permission: ['coupons', 'view'], handler: ({ params, scopes, ctx }) => Cp.get(params.id, scopes, ctx.user._id) },
  { method: 'PATCH', path: '/admin/:id/active', permission: ['coupons', 'edit'], body: S.couponActiveBody, handler: ({ ctx, params, body, scopes }) => Cp.setActive(ctx, params.id, body.isActive, scopes) },
  { method: 'PATCH', path: '/admin/:id', permission: ['coupons', 'edit'], body: S.couponPatch, handler: ({ ctx, params, body, scopes }) => Cp.update(ctx, params.id, body, scopes) },
  { method: 'POST', path: '/admin/:id/restore', permission: ['coupons', 'delete'], handler: ({ ctx, params, scopes }) => Cp.restore(ctx, params.id, scopes) },
  { method: 'DELETE', path: '/admin/:id', permission: ['coupons', 'delete'], handler: ({ ctx, params, scopes }) => Cp.remove(ctx, params.id, scopes) },
];
exports.handler = createHandler('coupons', routes);
