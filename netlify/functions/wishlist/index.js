const { createHandler } = require('../../../middleware/withApi');
const { objectId } = require('../../../validation/common');
const C = require('../../../services/cartService');

const customer = { audience: 'customer' };
const routes = [
  { ...customer, method: 'GET', path: '/', handler: ({ ctx }) => C.getWishlist(ctx) },
  { ...customer, method: 'PUT', path: '/:productId', handler: ({ ctx, params }) => C.addToWishlist(ctx, objectId.parse(params.productId)) },
  { ...customer, method: 'DELETE', path: '/:productId', handler: ({ ctx, params }) => C.removeFromWishlist(ctx, objectId.parse(params.productId)) },
];
exports.handler = createHandler('wishlist', routes);
