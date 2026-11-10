const { createHandler } = require('../../../middleware/withApi');
const R = require('../../../services/dashboardRules');
const { getDashboard } = require('../../../services/dashboardService');

const routes = [
  // Needs dashboard.view. Sections inside are ALSO checked: orders.view -> sales numbers / recent orders / top products, inventory.view -> low stock.
  // A section the role may not see comes back as null (the Dashboard shows "hidden"). Cost/profit/phone-type fields go through redact().
  { method: 'GET', path: '/dashboard', permission: ['dashboard', 'view'],
    handler: async ({ ctx }) => {
      const access = R.sectionAccess(ctx.perms.can);
      access.products = ctx.perms.can('products', 'view');
      access.customers = ctx.perms.can('customers', 'view');
      return { dashboard: await getDashboard({ access, uid: ctx.user._id, denied: ctx.perms.deniedFields }) };
    } },
];
exports.handler = createHandler('analytics', routes);
