const { createHandler } = require('../../../middleware/withApi');
const { res } = require('../../../middleware/http');
const S = require('../../../validation/schemas');
const Cms = require('../../../services/cmsService');
const { RESOURCES, MODULE_OF } = require('../../../services/cmsRules');

// One function, three sections (banners / faqs / announcements); permissions come from MODULE_OF (banners, faq, announcements). Staff-only.
// Storefront reads of this content are NOT here yet (next step: public GET for live banners / faqs / announcement).
const routes = RESOURCES.flatMap((r) => {
  const m = MODULE_OF[r];
  return [
    { method: 'GET', path: `/${r}`, permission: [m, 'view'], handler: () => Cms.list(r) },
    { method: 'POST', path: `/${r}`, permission: [m, 'create'], body: S.cmsBody[r], handler: async ({ ctx, body }) => res(201, await Cms.create(ctx, r, body)) },
    { method: 'PATCH', path: `/${r}/:id/active`, permission: [m, 'edit'], body: S.cmsActiveBody, handler: ({ ctx, params, body }) => Cms.setActive(ctx, r, params.id, body.isActive) },
    { method: 'PATCH', path: `/${r}/:id`, permission: [m, 'edit'], body: S.cmsPatch[r], handler: ({ ctx, params, body }) => Cms.update(ctx, r, params.id, body) },
    { method: 'DELETE', path: `/${r}/:id`, permission: [m, 'delete'], handler: ({ ctx, params }) => Cms.remove(ctx, r, params.id) },
  ];
});
exports.handler = createHandler('cms', routes);
