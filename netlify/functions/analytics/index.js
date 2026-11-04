const { createHandler } = require('../../../middleware/withApi');
const { E } = require('../../../middleware/errors');
const R = require('../../../services/dashboardRules');
const { getDashboard } = require('../../../services/dashboardService');
const traffic = require('../../../services/trafficService');

const routes = [
  // Public, anonymous page-view ingest. Only source labels, campaign tags, a host and a safe route are retained.
  { method: 'POST', path: '/events', public: true, rateLimit: { limit: 90, windowMs: 60000 },
    handler: async ({ body }) => {
      if (!await traffic.recordPageView(body || {})) throw E.badRequest('Invalid traffic event.');
      return { tracked: true };
    } },

  // Traffic overview is private to dashboard users; no customer identity or IP address is exposed.
  { method: 'GET', path: '/traffic', permission: ['dashboard', 'view'],
    handler: async ({ query }) => ({ traffic: await traffic.getTraffic(query) }) },

  // Needs dashboard.view. Sections inside are ALSO checked: orders.view -> sales numbers / recent orders / top products, inventory.view -> low stock.
  // A section the role may not see comes back as null (the Dashboard shows "hidden"). Cost/profit/phone-type fields go through redact().
  { method: 'GET', path: '/dashboard', permission: ['dashboard', 'view'],
    handler: async ({ ctx }) => ({ dashboard: await getDashboard({ access: R.sectionAccess(ctx.perms.can), uid: ctx.user._id, denied: ctx.perms.deniedFields }) }) },
];
exports.handler = createHandler('analytics', routes);
