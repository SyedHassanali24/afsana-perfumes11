const { createHandler } = require('../../../middleware/withApi');
const { res } = require('../../../middleware/http');
const S = require('../../../validation/schemas');
const Su = require('../../../services/supplierService');

const routes = [
  { method: 'GET', path: '/', permission: ['suppliers', 'view'], query: S.supplierQuery, handler: ({ ctx, query, scopes }) => Su.list(ctx, query, scopes) },
  { method: 'POST', path: '/', permission: ['suppliers', 'create'], body: S.supplierBody, handler: async ({ ctx, body, scopes }) => res(201, await Su.create(ctx, body, scopes)) },
  { method: 'PATCH', path: '/:id', permission: ['suppliers', 'edit'], body: S.supplierPatch, handler: ({ ctx, params, body, scopes }) => Su.update(ctx, params.id, body, scopes) },
  { method: 'DELETE', path: '/:id', permission: ['suppliers', 'delete'], handler: ({ ctx, params, scopes }) => Su.remove(ctx, params.id, scopes) },
];
exports.handler = createHandler('suppliers', routes);
