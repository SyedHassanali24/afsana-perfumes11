const { createHandler } = require('../../../middleware/withApi');
const { res } = require('../../../middleware/http');
const { redact } = require('../../../middleware/redact');
const S = require('../../../validation/schemas');
const P = require('../../../services/productService');

// Order matters: static '/admin/...' routes before the public '/:slug'.
const routes = [
  { method: 'GET', path: '/', public: true, query: S.publicProductsQuery, cache: 60, handler: ({ query }) => P.listPublic(query) },

  { method: 'GET', path: '/admin/list', permission: ['products', 'view'], query: S.adminProductsQuery,
    handler: async ({ query, ctx, scopes }) => redact(await P.listAdmin(query, scopes, ctx.user._id), ctx.perms.deniedFields) },
  { method: 'GET', path: '/admin/trash', permission: ['products', 'restore'], query: S.adminProductsQuery,
    handler: async ({ query, ctx, scopes }) => P.listAdmin(query, scopes, ctx.user._id, { trash: true }) },
  { method: 'GET', path: '/admin/categories', permission: ['products', 'view'], handler: () => P.listCategories() },
  { method: 'GET', path: '/admin/:id', permission: ['products', 'view'],
    handler: async ({ params, ctx, scopes }) => redact(await P.getAdmin(params.id, scopes, ctx.user._id), ctx.perms.deniedFields) },
  { method: 'POST', path: '/admin', permission: ['products', 'create'], body: S.productCreate,
    handler: async ({ body, ctx }) => { const p = await P.createProduct(ctx, body); return res(201, { id: p._id, slug: p.slug }); } },
  { method: 'PATCH', path: '/admin/:id', permission: ['products', 'edit'], body: S.productPatch,
    handler: async ({ params, body, ctx, scopes }) => { const p = await P.updateProduct(ctx, params.id, body, scopes); return { id: p._id }; } },
  { method: 'POST', path: '/admin/:id/variants', permission: ['products', 'edit'], body: S.variantCreate,
    handler: async ({ params, body, ctx }) => { const v = await P.addVariant(ctx, params.id, body); return res(201, { id: v._id }); } },
  // permission checks for price fields happen inside the service (managePrice + password re-auth)
  { method: 'PATCH', path: '/admin/:id/variants/:variantId', permission: ['products', 'edit'], body: S.variantPatch,
    handler: async ({ params, body, ctx }) => { const v = await P.updateVariant(ctx, params.id, params.variantId, body); return { id: v._id }; } },
  { method: 'DELETE', path: '/admin/:id', permission: ['products', 'delete'], reauth: true,
    handler: async ({ params, ctx, scopes }) => { await P.setDeleted(ctx, params.id, true, scopes); return {}; } },
  { method: 'POST', path: '/admin/:id/restore', permission: ['products', 'restore'],
    handler: async ({ params, ctx, scopes }) => { await P.setDeleted(ctx, params.id, false, scopes); return {}; } },

  { method: 'GET', path: '/:slug', public: true, cache: 60, handler: ({ params }) => P.getPublicBySlug(params.slug) },
];
exports.handler = createHandler('products', routes);
