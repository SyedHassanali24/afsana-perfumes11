const { createHandler } = require('../../../middleware/withApi');
const S = require('../../../validation/schemas');
const A = require('../../../services/accountantService');

const routes = [
  { method: 'GET', path: '/admin/report', permission: ['finance', 'view'], query: S.financeQuery, handler: ({ query, scopes, ctx }) => A.report(query, scopes, ctx.perms.deniedFields) },
];
exports.handler = createHandler('accountant', routes);
