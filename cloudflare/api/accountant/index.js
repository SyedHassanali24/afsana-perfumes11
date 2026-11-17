const { createHandler } = require('../../../middleware/withApi');
const { res } = require('../../../middleware/http');
const S = require('../../../validation/schemas');
const A = require('../../../services/accountantService');

const routes = [
  { method: 'GET', path: '/admin/report', permission: ['finance', 'view'], query: S.financeQuery, handler: ({ query, scopes, ctx }) => A.report(query, scopes, ctx.perms.deniedFields) },
  { method: 'POST', path: '/admin/entries', permission: ['finance', 'create'], body: S.manualJournalEntryBody, handler: async ({ ctx, body, scopes }) => res(201, await A.createManualEntry(ctx, body, scopes)) },
];
exports.handler = createHandler('accountant', routes);
