// GET /api/settings/public  (anyone: shop name, contact, bank details when switched on, delivery fee, return days; cached 60 s)
// GET /api/settings/admin   (settings.view)
// PUT /api/settings/admin/{store|bank|shipping|returns}  (settings.edit + the user's password; audited)
const { createHandler } = require('../../../middleware/withApi');
const S = require('../../../validation/schemas');
const Settings = require('../../../services/settingsService');

const save = (key, schema) => ({ method: 'PUT', path: `/admin/${key}`, permission: ['settings', 'edit'], body: schema, reauth: true,
  handler: async ({ ctx, body, scopes }) => { const { confirmPassword, ...value } = body; return Settings.update(ctx, key, value, scopes); } });
exports.handler = createHandler('settings', [
  { method: 'GET', path: '/public', public: true, cache: 300, cacheTags: ['settings'], handler: () => Settings.getPublic() },
  { method: 'GET', path: '/admin', permission: ['settings', 'view'], handler: ({ ctx, scopes }) => Settings.getAll(ctx, scopes) },
  save('store', S.settingsStore), save('bank', S.settingsBank), save('shipping', S.settingsShipping), save('returns', S.settingsReturns),
]);
