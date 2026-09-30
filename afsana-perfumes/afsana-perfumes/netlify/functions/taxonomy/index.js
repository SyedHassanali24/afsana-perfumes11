const { createHandler } = require('../../../middleware/withApi');
const { res } = require('../../../middleware/http');
const S = require('../../../validation/schemas');
const T = require('../../../services/taxonomyService');

// /api/taxonomy/{categories|collections|brands|fragrance-families}  (+ /public/:type for the storefront)
const routes = [
  { method: 'GET', path: '/public/:type', public: true, cache: 60, handler: ({ params }) => T.publicList(params.type) },
];
for (const [type, cfg] of Object.entries(T.TYPES)) {
  const m = cfg.module;
  routes.push(
    { method: 'GET', path: `/${type}`, permission: [m, 'view'], query: S.taxonomyQuery, handler: ({ query }) => T.list(type, query) },
    { method: 'POST', path: `/${type}`, permission: [m, 'create'], body: S.taxonomyBody, handler: async ({ ctx, body }) => res(201, await T.create(ctx, type, body)) },
    { method: 'PATCH', path: `/${type}/:id`, permission: [m, 'edit'], body: S.taxonomyPatch, handler: ({ ctx, params, body }) => T.update(ctx, type, params.id, body) },
    { method: 'DELETE', path: `/${type}/:id`, permission: [m, 'delete'], handler: ({ ctx, params }) => T.remove(ctx, type, params.id) },
  );
}
exports.handler = createHandler('taxonomy', routes);
