const { createHandler } = require('../../../middleware/withApi');
const R = require('../../../services/dashboardRules');
const { getDashboard } = require('../../../services/dashboardService');
const { getSecurityOverview } = require('../../../services/securityOverviewService');
const Traffic = require('../../../services/analyticsTrafficService');
const { z } = require('../../../validation/common');

const safePath = z.string().trim().max(220).refine((value) => value.startsWith('/') && !value.startsWith('//'), 'Invalid page path');
const pageViewBody = z.object({
  sessionRef: z.string().trim().min(8).max(100),
  landingPath: safePath,
  path: safePath,
  utmSource: z.string().trim().max(100).optional().default(''),
  utmMedium: z.string().trim().max(100).optional().default(''),
  utmCampaign: z.string().trim().max(100).optional().default(''),
  referrerHost: z.string().trim().max(255).optional().default(''),
  affiliateCode: z.string().trim().max(60).optional().default(''),
});
const sourcesQuery = z.object({ days: z.coerce.number().int().min(7).max(90).default(30) });

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
  { method: 'GET', path: '/security', permission: ['security', 'view'],
    handler: async () => ({ security: await getSecurityOverview() }) },
  { method: 'GET', path: '/sources', permission: ['dashboard', 'view'], query: sourcesQuery,
    handler: async ({ query }) => ({ traffic: await Traffic.getTrafficSources(query.days) }) },
  // Anonymous, random-session page views only. No IP, customer identity, or full referrer URL is stored.
  { method: 'POST', path: '/events', public: true, body: pageViewBody, rateLimit: { limit: 180, windowMs: 60000 },
    handler: ({ body }) => Traffic.recordPageView(body) },
];
exports.handler = createHandler('analytics', routes);
