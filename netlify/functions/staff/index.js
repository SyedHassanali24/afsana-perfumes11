const { createHandler } = require('../../../middleware/withApi');
const { res } = require('../../../middleware/http');
const S = require('../../../validation/schemas');
const T = require('../../../services/staffService');

// Static paths first. Every write asks for the actor's password (reauth) and is audited inside the service.
const routes = [
  { method: 'GET', path: '/assignable-roles', permission: ['staff', 'view'], handler: ({ ctx }) => T.assignableRoles(ctx) },
  { method: 'GET', path: '/', permission: ['staff', 'view'], query: S.staffQuery, handler: ({ query }) => T.listStaff(query) },
  { method: 'GET', path: '/:id', permission: ['staff', 'view'], handler: ({ params }) => T.getStaff(params.id) },
  { method: 'POST', path: '/', permission: ['staff', 'create'], body: S.staffCreate, reauth: true, rateLimit: { limit: 20, windowMs: 10 * 60000 },
    handler: async ({ ctx, body }) => res(201, await T.createStaff(ctx, body)) },
  { method: 'PATCH', path: '/:id', permission: ['staff', 'edit'], body: S.staffPatch, reauth: true, handler: ({ ctx, params, body }) => T.updateStaff(ctx, params.id, body) },
  { method: 'POST', path: '/:id/reset-password', permission: ['staff', 'edit'], body: S.staffPasswordBody, reauth: true, rateLimit: { limit: 20, windowMs: 10 * 60000 },
    handler: ({ ctx, params, body }) => T.resetPassword(ctx, params.id, body) },
  { method: 'DELETE', path: '/:id', permission: ['staff', 'delete'], reauth: true, handler: ({ ctx, params }) => T.removeStaff(ctx, params.id) },
  { method: 'POST', path: '/:id/overrides', permission: ['temporaryAccess', 'create'], body: S.overrideBody, reauth: true, handler: async ({ ctx, params, body }) => res(201, await T.addOverride(ctx, params.id, body)) },
  { method: 'DELETE', path: '/:id/overrides/:overrideId', permission: ['temporaryAccess', 'delete'], reauth: true, handler: ({ ctx, params }) => T.removeOverride(ctx, params.id, params.overrideId) },
  { method: 'GET', path: '/:id/sessions', permission: ['sessions', 'view'], handler: ({ params }) => T.listSessions(params.id) },
  { method: 'DELETE', path: '/:id/sessions', permission: ['sessions', 'delete'], reauth: true, handler: ({ ctx, params }) => T.revokeAllSessions(ctx, params.id) },
];
exports.handler = createHandler('staff', routes);
