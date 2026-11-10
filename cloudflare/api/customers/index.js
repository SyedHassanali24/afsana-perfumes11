const { createHandler } = require('../../../middleware/withApi');
const { redact } = require('../../../middleware/redact');
const S = require('../../../validation/schemas');
const C = require('../../../services/customerService');

// Staff-only. Shoppers manage their own profile through /api/account. Phone / address are removed server-side for roles that may not see them
// (the service already leaves them out; redact() is a second, fail-closed pass).
const routes = [
  { method: 'GET', path: '/admin', permission: ['customers', 'view'], query: S.customerQuery,
    handler: async ({ query, ctx, scopes }) => redact(await C.list(query, scopes, ctx.user._id, ctx.perms.deniedFields), ctx.perms.deniedFields) },
  { method: 'GET', path: '/admin/:id', permission: ['customers', 'view'],
    handler: async ({ params, ctx, scopes }) => redact(await C.get(params.id, scopes, ctx.user._id, ctx.perms.deniedFields), ctx.perms.deniedFields) },
  { method: 'PATCH', path: '/admin/:id', permission: ['customers', 'edit'], body: S.customerPatch,
    handler: async ({ params, body, ctx, scopes }) => redact(await C.update(ctx, params.id, body, scopes), ctx.perms.deniedFields) },
];
exports.handler = createHandler('customers', routes);
