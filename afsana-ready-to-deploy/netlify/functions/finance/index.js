const { createHandler } = require('../../../middleware/withApi');
const { res } = require('../../../middleware/http');
const S = require('../../../validation/schemas');
const F = require('../../../services/financeService');

// Staff only, store-wide. Profit / cost figures are left out of the summary for roles denied 'order.profit' or 'product.costPrice'.
const routes = [
  { method: 'GET', path: '/admin/summary', permission: ['finance', 'view'], query: S.financeQuery, handler: ({ query, scopes, ctx }) => F.summary(query, scopes, ctx.perms.deniedFields) },
  { method: 'GET', path: '/admin/expenses', permission: ['expenses', 'view'], query: S.expenseQuery, handler: ({ query, scopes }) => F.listExpenses(query, scopes) },
  { method: 'POST', path: '/admin/expenses', permission: ['expenses', 'create'], body: S.expenseBody, handler: async ({ ctx, body, scopes }) => res(201, await F.createExpense(ctx, body, scopes)) },
  { method: 'PATCH', path: '/admin/expenses/:id', permission: ['expenses', 'edit'], body: S.expensePatch, handler: ({ ctx, params, body, scopes }) => F.updateExpense(ctx, params.id, body, scopes) },
  { method: 'DELETE', path: '/admin/expenses/:id', permission: ['expenses', 'delete'], handler: ({ ctx, params, scopes }) => F.deleteExpense(ctx, params.id, scopes) },
];
exports.handler = createHandler('finance', routes);
