const { createHandler } = require('../../../middleware/withApi');
const { res } = require('../../../middleware/http');
const S = require('../../../validation/schemas');
const A = require('../../../services/affiliateService');

const routes = [
  { method: 'GET', path: '/admin/dashboard', permission: ['referrals', 'view'], handler: () => A.adminDashboard() },
  { method: 'GET', path: '/me', permission: ['dashboard', 'view'], handler: ({ ctx }) => A.myDashboard(ctx) },
  { method: 'POST', path: '/admin/partners', permission: ['referrals', 'create'], body: S.referralPartnerBody, reauth: true, handler: async ({ ctx, body }) => res(201, await A.createInfluencer(ctx, body)) },
  { method: 'PATCH', path: '/admin/partners/:id', permission: ['referrals', 'edit'], body: S.referralPartnerPatch, reauth: true, handler: ({ ctx, params, body }) => A.updatePartner(ctx, params.id, body) },
];
exports.handler = createHandler('growth', routes);
