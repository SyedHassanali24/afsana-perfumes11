const { createHandler } = require('../../../middleware/withApi');
const { res } = require('../../../middleware/http');
const S = require('../../../validation/schemas');
const T = require('../../../services/taxonomyService');

// /api/taxonomy/{categories|collections|brands|fragrance-families}  (+ /public/:type for the storefront)
const routes = [
  { method: 'GET', path: '/public/:type', public: true, cache: 300, cacheTags: ['taxonomy'], handler: ({ params }) => T.publicList(params.type) },
];
for (const [type, cfg] of Object.entries(T.TYPES)) {
  const m = cfg.module;
  routes.push(
    { method: 'GET', path: `/${type}`, permission: [m, 'view'], query: S.taxonomyQuery, handler: ({ query, scopes, ctx }) => T.list(type, query, scopes, ctx.user._id) },
    { method: 'POST', path: `/${type}`, permission: [m, 'create'], body: S.taxonomyBody, handler: async ({ ctx, body, scopes }) => res(201, await T.create(ctx, type, body, scopes)) },
    { method: 'PATCH', path: `/${type}/:id`, permission: [m, 'edit'], body: S.taxonomyPatch, handler: ({ ctx, params, body, scopes }) => T.update(ctx, type, params.id, body, scopes) },
    { method: 'DELETE', path: `/${type}/:id`, permission: [m, 'delete'], handler: ({ ctx, params, scopes }) => T.remove(ctx, type, params.id, scopes) },
  );
}
exports.handler = createHandler('taxonomy', routes);
