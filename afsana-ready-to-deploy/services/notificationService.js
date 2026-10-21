const { Notification } = require('../database/models');
const { E } = require('../middleware/errors');
const R = require('./notificationRules');

const ID = /^[a-f\d]{24}$/i;
const recent = () => Notification.find({}).sort({ createdAt: -1 }).limit(R.SCAN_LIMIT).lean();

// GET: the newest notifications THIS staff member may see + how many are unread.
async function list(ctx) {
  return R.build(await recent(), ctx.perms.can, ctx.user._id);
}
async function markRead(ctx, id) {
  if (!ID.test(String(id))) throw E.notFound('Notification not found.');
  const n = await Notification.findById(id).lean();
  if (!n || !R.isVisibleTo(n, ctx.perms.can)) throw E.notFound('Notification not found.'); // someone without the permission cannot even confirm it exists
  await Notification.updateOne({ _id: id }, { $addToSet: { readBy: ctx.user._id } });
  return {};
}
async function markAllRead(ctx) {
  const ids = (await recent()).filter((n) => R.isVisibleTo(n, ctx.perms.can) && !R.isReadBy(n, ctx.user._id)).map((n) => n._id);
  if (ids.length) await Notification.updateMany({ _id: { $in: ids } }, { $addToSet: { readBy: ctx.user._id } });
  return { marked: ids.length };
}
module.exports = { list, markRead, markAllRead };
