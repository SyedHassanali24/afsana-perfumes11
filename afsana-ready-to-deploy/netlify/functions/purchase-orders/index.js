const { createHandler } = require('../../../middleware/withApi');
const { res } = require('../../../middleware/http');
const S = require('../../../validation/schemas');
const Po = require('../../../services/purchaseOrderService');

// Receiving changes real stock -> needs purchaseOrders.manageStock and the actor's password.
const routes = [
  { method: 'GET', path: '/', permission: ['purchaseOrders', 'view'], query: S.poQuery, handler: ({ ctx, query }) => Po.list(ctx, query) },
  { method: 'GET', path: '/:id', permission: ['purchaseOrders', 'view'], handler: ({ ctx, params }) => Po.get(ctx, params.id) },
  { method: 'POST', path: '/', permission: ['purchaseOrders', 'create'], body: S.poCreate, handler: async ({ ctx, body }) => res(201, await Po.create(ctx, body)) },
  { method: 'PATCH', path: '/:id', permission: ['purchaseOrders', 'edit'], body: S.poPatch, handler: ({ ctx, params, body }) => Po.update(ctx, params.id, body) },
  { method: 'POST', path: '/:id/order', permission: ['purchaseOrders', 'edit'], handler: ({ ctx, params }) => Po.markOrdered(ctx, params.id) },
  { method: 'POST', path: '/:id/receive', permission: ['purchaseOrders', 'manageStock'], body: S.poReceive, reauth: true, handler: ({ ctx, params, body }) => Po.receive(ctx, params.id, body) },
  { method: 'POST', path: '/:id/cancel', permission: ['purchaseOrders', 'edit'], handler: ({ ctx, params }) => Po.cancel(ctx, params.id) },
];
exports.handler = createHandler('purchase-orders', routes);
