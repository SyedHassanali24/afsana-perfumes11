const { createHandler } = require('../../../middleware/withApi');
const C = require('../../../database/constants');
const S = require('../../../validation/schemas');
const Ro = require('../../../services/roleService');
const GROUPS = require('../../../services/permissionGroups');

const routes = [
  { method: 'GET', path: '/catalog', // static labels only (not sensitive) -> any signed-in staff, so forms can render even without permissions.view
    handler: () => ({
      groups: GROUPS.map(([label, modules]) => ({ label, modules })),
      actions: C.ACTIONS, highRisk: C.HIGH_RISK, scopes: C.SCOPES, restrictableFields: C.RESTRICTABLE_FIELDS,
    }) },
  { method: 'GET', path: '/history', permission: ['permissions', 'view'], query: S.historyQuery2, handler: ({ query }) => Ro.history(query) },
];
exports.handler = createHandler('permissions', routes);
