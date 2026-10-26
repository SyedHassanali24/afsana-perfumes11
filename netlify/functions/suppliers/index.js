const { createHandler } = require('../../../middleware/withApi');
const { res } = require('../../../middleware/http');
const S = require('../../../validation/schemas');
const Su = require('../../../services/supplierService');

const routes = [
  { method: 'GET', path: '/', permission: ['suppliers', 'view'], query: S.supplierQuery, handler: ({ query }) => Su.list(query) },
  { method: 'POST', path: '/', permission: ['suppliers', 'create'], body: S.supplierBody, handler: async ({ ctx, body }) => res(201, await Su.create(ctx, body)) },
  { method: 'PATCH', path: '/:id', permission: ['suppliers', 'edit'], body: S.supplierPatch, handler: ({ ctx, params, body }) => Su.update(ctx, params.id, body) },
  { method: 'DELETE', path: '/:id', permission: ['suppliers', 'delete'], handler: ({ ctx, params }) => Su.remove(ctx, params.id) },
];
exports.handler = createHandler('suppliers', routes);
