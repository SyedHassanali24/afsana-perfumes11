const { Setting } = require('../database/models');
const { E } = require('../middleware/errors');
const { audit } = require('./audit');
const R = require('./settingsRules');
const { scopeFilter } = require('../middleware/permissions');
const SCOPE_MAP = { stores: 'storeId' };
const storeFilter = (scopes, uid) => scopeFilter(scopes, uid, SCOPE_MAP);
const storeIdFor = (scopes) => {
  if (scopes?.some((s) => s.kind === 'all')) return 'main';
  const stores = [...new Set((scopes || []).filter((s) => s.kind === 'stores').flatMap((s) => s.values || []))];
  if (stores.length !== 1) throw E.forbidden('Settings are available only within a single store scope.');
  return stores[0];
};
const load = async (storeId = 'main') => R.merge(await Setting.find({ key: { $in: R.KEYS }, storeId }).select('key value').lean());
const getAll = async (ctx, scopes) => ({ settings: await load(storeIdFor(scopes)) });
const getPublic = async () => R.publicView(await load('main'));

async function update(ctx, key, value, scopes) {
  if (!R.KEYS.includes(key)) throw E.notFound('Unknown setting.');
  const storeId = storeIdFor(scopes);
  const before = (await load(storeId))[key];
  const next = R.withDefaults(key, value);
  await Setting.findOneAndUpdate({ key, storeId }, { $set: { value: next, updatedBy: ctx.user._id }, $setOnInsert: { storeId } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  await audit(ctx, { action: 'settings.updated', module: 'settings', recordId: key, oldValue: before, newValue: next });
  return { key, value: next };
}
module.exports = { getAll, getPublic, update };
