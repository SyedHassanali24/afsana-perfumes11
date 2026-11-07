const { createHandler } = require('../../../middleware/withApi');
const { res } = require('../../../middleware/http');
const S = require('../../../validation/schemas');
const Ro = require('../../../services/roleService');

const routes = [
  { method: 'GET', path: '/', permission: ['roles', 'view'], handler: ({ ctx }) => Ro.listRoles(ctx) },
  { method: 'GET', path: '/:id', permission: ['roles', 'view'], handler: ({ ctx, params }) => Ro.getRole(ctx, params.id) },
  { method: 'POST', path: '/', permission: ['roles', 'create'], body: S.roleCreate, reauth: true, handler: async ({ ctx, body }) => res(201, await Ro.createRole(ctx, body)) },
  { method: 'PATCH', path: '/:id', permission: ['roles', 'edit'], body: S.roleUpdate, reauth: true, handler: ({ ctx, params, body }) => Ro.updateRole(ctx, params.id, body) },
  { method: 'DELETE', path: '/:id', permission: ['roles', 'delete'], reauth: true, handler: ({ ctx, params }) => Ro.deleteRole(ctx, params.id) },
];
exports.handler = createHandler('roles', routes);
