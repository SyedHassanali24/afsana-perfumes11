const { createHandler } = require('../../../middleware/withApi');
const S = require('../../../validation/schemas');
const Rv = require('../../../services/reviewService');

// public: approved reviews of a product. customer: my review of a product (only after the perfume was delivered). staff: moderation.
const customer = { audience: 'customer' };
const routes = [
  { method: 'GET', path: '/product/:slug', public: true, query: S.publicReviewsQuery, cache: 60, cacheTags: ['reviews'], handler: ({ params, query }) => Rv.listPublic(params.slug, query) },

  { ...customer, method: 'GET', path: '/mine/:slug', handler: ({ ctx, params }) => Rv.mine(ctx, params.slug) },
  { ...customer, method: 'PUT', path: '/mine/:slug', body: S.reviewBody, rateLimit: { limit: 10, windowMs: 10 * 60000 }, handler: ({ ctx, params, body }) => Rv.saveMine(ctx, params.slug, body) },
  { ...customer, method: 'DELETE', path: '/mine/:slug', handler: ({ ctx, params }) => Rv.removeMine(ctx, params.slug) },

  { method: 'GET', path: '/admin', permission: ['reviews', 'view'], query: S.adminReviewsQuery, handler: ({ query, scopes, ctx }) => Rv.listAdmin(query, scopes, ctx.user._id) },
  { method: 'PATCH', path: '/admin/:id/status', permission: ['reviews', 'approve'], body: S.reviewStatusBody, handler: ({ ctx, params, body, scopes }) => Rv.moderate(ctx, params.id, body.status, scopes) },
];
exports.handler = createHandler('reviews', routes);
