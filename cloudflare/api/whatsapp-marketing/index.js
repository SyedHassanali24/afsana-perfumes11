const { createHandler } = require('../../../middleware/withApi');
const S = require('../../../validation/schemas');
const M = require('../../../services/whatsappMarketingService');

const routes = [
  { method: 'GET', path: '/admin/summary', permission: ['campaigns', 'view'],
    handler: () => M.summary() },
  { method: 'GET', path: '/admin/campaigns', permission: ['campaigns', 'view'],
    handler: () => M.listCampaigns() },
  { method: 'GET', path: '/admin/campaigns/:id', permission: ['campaigns', 'view'],
    handler: ({ params }) => M.getCampaign(params.id) },
  { method: 'POST', path: '/admin/campaigns', permission: ['campaigns', 'create'], body: S.whatsappCampaignBody,
    handler: ({ body, ctx }) => M.createCampaign(ctx, body) },
  { method: 'POST', path: '/admin/campaigns/:id/start', permission: ['campaigns', 'create'],
    handler: ({ params }) => M.startCampaign(params.id) },
  { method: 'POST', path: '/admin/campaigns/:id/process', permission: ['campaigns', 'edit'],
    rateLimit: { limit: 12, windowMs: 60 * 1000 },
    handler: ({ params, ctx }) => M.processBatch(ctx, params.id) },
];
exports.handler = createHandler('whatsapp-marketing', routes);
