const { createHandler } = require('../../../middleware/withApi');
const { res } = require('../../../middleware/http');
const S = require('../../../validation/schemas');
const { E } = require('../../../middleware/errors');
const G = require('../../../services/affiliateService');
const W = require('../../../services/whatsappService');
const Settings = require('../../../services/settingsService');

const createBody = S.affiliateCreateBody;
const patchBody = S.affiliatePatchBody;
const payoutBody = S.affiliatePayoutBody;
const routes = [
  { method: 'GET', path: '/me', handler: ({ ctx }) => G.myDashboard(ctx) },
  { method: 'GET', path: '/admin/dashboard', permission: ['referrals', 'view'], handler: () => G.adminDashboard() },
  { method: 'GET', path: '/admin/partners', permission: ['referrals', 'view'], handler: () => G.adminDashboard() },
  { method: 'GET', path: '/admin/commissions', permission: ['commissions', 'view'], handler: ({ query }) => G.listCommissions(query) },
  { method: 'POST', path: '/admin/partners', permission: ['referrals', 'create'], body: createBody, reauth: true,
    handler: async ({ ctx, body }) => res(201, await G.createInfluencer(ctx, body)) },
  { method: 'PATCH', path: '/admin/partners/:id', permission: ['referrals', 'edit'], body: patchBody, reauth: true,
    handler: ({ ctx, params, body }) => G.updatePartner(ctx, params.id, body) },
  { method: 'POST', path: '/admin/commissions/:id/payout', permission: ['commissions', 'edit'], body: payoutBody, reauth: true,
    handler: ({ ctx, params, body }) => G.payCommission(ctx, params.id, body) },
  { method: 'GET', path: '/admin/whatsapp', permission: ['whatsapp', 'view'],
    handler: async () => {
      const { WhatsAppOutbox } = require('../../../database/models');
      const rows = await WhatsAppOutbox.find({ storeId: 'main' }).sort({ createdAt: -1 }).limit(100).populate('couponId', 'code expiresAt').lean();
      return { messages: rows.map((m) => ({ id: m._id, kind: m.kind, to: m.to ? '••••' + String(m.to).slice(-4) : '', status: m.status, attempts: m.attempts, lastError: m.lastError, couponCode: m.couponId?.code, createdAt: m.createdAt, acceptedAt: m.acceptedAt })) };
    } },
  { method: 'POST', path: '/admin/whatsapp/:id/retry', permission: ['whatsapp', 'edit'], body: S.affiliateRetryBody, reauth: true,
    handler: async ({ params }) => ({ delivery: await W.sendOutbox(params.id) }) },
  { method: 'GET', path: '/admin/config', permission: ['settings', 'view'],
    handler: async ({ ctx, scopes }) => ({ config: (await Settings.getAll(ctx, scopes)).settings.growth }) },
  { method: 'PUT', path: '/admin/config', permission: ['settings', 'edit'], body: S.settingsGrowth, reauth: true,
    handler: async ({ ctx, body, scopes }) => {
      const { confirmPassword, ...value } = body;
      return { config: (await Settings.update(ctx, 'growth', value, scopes)).value };
    } },
];
exports.handler = createHandler('growth', routes);
