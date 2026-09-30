const { createHandler } = require('../../../middleware/withApi');
const S = require('../../../validation/schemas');
const C = require('../../../services/cartService');

// /api/cart/quote works for guests AND shoppers (prices come from the DB). The saved-cart routes need a shopper session.
const customer = { audience: 'customer' };
const routes = [
  { method: 'POST', path: '/quote', public: true, optionalCustomer: true, body: S.quoteBody, rateLimit: { limit: 60, windowMs: 60000 }, handler: ({ body, ctx }) => C.quote(body, ctx) },
  { ...customer, method: 'GET', path: '/', handler: ({ ctx }) => C.getCart(ctx) },
  { ...customer, method: 'PUT', path: '/', body: S.cartBody, handler: ({ ctx, body }) => C.saveCart(ctx, body) },
  { ...customer, method: 'POST', path: '/merge', body: S.cartBody, handler: ({ ctx, body }) => C.mergeCart(ctx, body) },
];
exports.handler = createHandler('cart', routes);
