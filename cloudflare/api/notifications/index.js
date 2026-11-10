const { createHandler } = require('../../../middleware/withApi');
const N = require('../../../services/notificationService');

// Any signed-in staff member may call these: what they SEE is filtered by each notification's `forPermission` (services/notificationRules.js).
const routes = [
  { method: 'GET', path: '/admin', handler: ({ ctx }) => N.list(ctx) },
  { method: 'POST', path: '/admin/read-all', handler: ({ ctx }) => N.markAllRead(ctx) },
  { method: 'POST', path: '/admin/:id/read', handler: ({ ctx, params }) => N.markRead(ctx, params.id) },
];
exports.handler = createHandler('notifications', routes);
