// Owner-only data export, read page by page (the browser builds the file, so there is no size/time limit on the server).
const M = require('../database/models');
const { Media } = M;
const { E } = require('../middleware/errors');
const { audit } = require('./audit');
const R = require('./backupRules');

const names = () => Object.keys(M).filter((n) => R.isBackupModel(n, M[n]));

async function overview(ctx) {
  const collections = [];
  for (const name of names()) collections.push({ name, count: await M[name].countDocuments({}) });
  const pictures = await Media.countDocuments({});
  await audit(ctx, { action: 'backup.export', module: 'backup', newValue: { collections: collections.length, pictures } });
  return { collections, pictures };
}

async function page(name, after, limit) {
  if (!names().includes(name)) throw E.badRequest('Unknown data set.');
  const n = R.pageSize(limit);
  let filter = {};
  if (after) {
    try { filter = { _id: { $gt: M[name].schema.path('_id').cast(after) } }; } catch { throw E.badRequest('Bad page marker.'); }
  }
  const rows = await M[name].find(filter).sort({ _id: 1 }).limit(n).lean();
  return { name, rows: rows.map(R.clean), next: rows.length === n ? String(rows[rows.length - 1]._id) : null };
}

// Picture list only (id, type, size); the browser downloads each picture from /api/media/<id>.
async function pictures(after, limit) {
  const n = R.pageSize(limit);
  let filter = {};
  if (after) { if (!/^[0-9a-f]{24}$/.test(after)) throw E.badRequest('Bad page marker.'); filter = { _id: { $gt: after } }; }
  const rows = await Media.find(filter).select('contentType size filename createdAt').sort({ _id: 1 }).limit(n).lean();
  return { rows: rows.map((r) => ({ _id: r._id, contentType: r.contentType, size: r.size, filename: r.filename, createdAt: r.createdAt })), next: rows.length === n ? String(rows[rows.length - 1]._id) : null };
}
module.exports = { names, overview, page, pictures };
