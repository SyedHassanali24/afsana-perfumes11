const { createHandler } = require('../../../middleware/withApi');
const S = require('../../../validation/schemas');
const M = require('../../../services/emailMarketingService');

const routes = [
  { method: 'POST', path: '/subscribe', public: true, body: S.emailMarketingSubscribeBody,
    rateLimit: { limit: 5, windowMs: 15 * 60 * 1000 },
    handler: ({ body }) => M.subscribe(body) },

  { method: 'GET', path: '/admin/summary', permission: ['campaigns', 'view'],
    handler: () => M.summary() },
  { method: 'GET', path: '/admin/contacts', permission: ['campaigns', 'view'], query: S.emailContactsQuery,
    handler: ({ query }) => M.listContacts(query) },
  { method: 'GET', path: '/admin/contacts/export', permission: ['campaigns', 'view'],
    handler: () => M.exportContacts() },
  { method: 'GET', path: '/admin/campaigns', permission: ['campaigns', 'view'],
    handler: () => M.listCampaigns() },
  { method: 'GET', path: '/admin/campaigns/:id', permission: ['campaigns', 'view'],
    handler: ({ params }) => M.getCampaign(params.id) },
  { method: 'POST', path: '/admin/campaigns', permission: ['campaigns', 'create'], body: S.emailCampaignBody,
    handler: ({ body, ctx }) => M.createCampaign(ctx, body) },
  { method: 'POST', path: '/admin/campaigns/:id/start', permission: ['campaigns', 'create'],
    handler: ({ params }) => M.startCampaign(params.id) },
  { method: 'POST', path: '/admin/campaigns/:id/process', permission: ['campaigns', 'edit'],
    rateLimit: { limit: 12, windowMs: 60 * 1000 },
    handler: ({ params, ctx }) => M.processNext(ctx, params.id) },
];
exports.handler = createHandler('email-marketing', routes);
