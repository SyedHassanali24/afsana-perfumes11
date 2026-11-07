const { createHandler } = require('../../../middleware/withApi');
const { res } = require('../../../middleware/http');
const S = require('../../../validation/schemas');
const Cms = require('../../../services/cmsService');
const { RESOURCES, MODULE_OF } = require('../../../services/cmsRules');

// One function, CMS resources including the visual homepage builder; permissions come from MODULE_OF (banners, faq, announcements). Staff-only.
// Storefront reads: GET /api/cms/public (live banners / faqs / announcement).
const routes = RESOURCES.flatMap((r) => {
  const m = MODULE_OF[r];
  return [
    { method: 'GET', path: `/${r}`, permission: [m, 'view'], handler: ({ scopes, ctx }) => Cms.list(r, scopes, ctx.user._id) },
    { method: 'POST', path: `/${r}`, invalidateTags: ['cms'], permission: [m, 'create'], body: S.cmsBody[r], handler: async ({ ctx, body, scopes }) => res(201, await Cms.create(ctx, r, body, scopes)) },
    { method: 'PATCH', path: `/${r}/:id/active`, invalidateTags: ['cms'], permission: [m, 'edit'], body: S.cmsActiveBody, handler: ({ ctx, params, body, scopes }) => Cms.setActive(ctx, r, params.id, body.isActive, scopes) },
    { method: 'PATCH', path: `/${r}/:id`, invalidateTags: ['cms'], permission: [m, 'edit'], body: S.cmsPatch[r], handler: ({ ctx, params, body, scopes }) => Cms.update(ctx, r, params.id, body, scopes) },
    { method: 'DELETE', path: `/${r}/:id`, invalidateTags: ['cms'], permission: [m, 'delete'], handler: ({ ctx, params, scopes }) => Cms.remove(ctx, r, params.id, scopes) },
  ];
});
// Public read for the shop (live banners, FAQs, announcement bar). Static path, listed first.
routes.unshift({ method: 'GET', path: '/public', public: true, cache: 120, cacheTags: ['cms'], handler: () => Cms.publicContent() });
exports.handler = createHandler('cms', routes);
