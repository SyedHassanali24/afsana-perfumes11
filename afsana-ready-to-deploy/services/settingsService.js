const { Setting } = require('../database/models');
const { E } = require('../middleware/errors');
const { audit } = require('./audit');
const R = require('./settingsRules');

const load = async () => R.merge(await Setting.find({ key: { $in: R.KEYS } }).select('key value').lean());
const getAll = async () => ({ settings: await load() });
const getPublic = async () => R.publicView(await load());

async function update(ctx, key, value) {
  if (!R.KEYS.includes(key)) throw E.notFound('Unknown setting.');
  const before = (await load())[key];
  const next = R.withDefaults(key, value);
  await Setting.findOneAndUpdate({ key }, { $set: { value: next, updatedBy: ctx.user._id } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  await audit(ctx, { action: 'settings.updated', module: 'settings', recordId: key, oldValue: before, newValue: next });
  return { key, value: next };
}
module.exports = { getAll, getPublic, update };
