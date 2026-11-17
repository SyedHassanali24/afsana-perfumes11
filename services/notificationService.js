const { Notification } = require('../database/models');
const { E } = require('../middleware/errors');
const R = require('./notificationRules');
const { getEmailJsConfig, sendEmailJsTemplate } = require('./emailjs');

const ID = /^[a-f\d]{24}$/i;
const recent = () => Notification.find({}).sort({ createdAt: -1 }).limit(R.SCAN_LIMIT).lean();

// GET: the newest notifications THIS staff member may see + how many are unread.
async function list(ctx) {
  return R.build(await recent(), ctx.perms.can, ctx.user._id, ctx);
}
async function markRead(ctx, id) {
  if (!ID.test(String(id))) throw E.notFound('Notification not found.');
  const n = await Notification.findById(id).lean();
  if (!n || !R.isVisibleTo(n, ctx.perms.can, ctx)) throw E.notFound('Notification not found.'); // someone without the permission cannot even confirm it exists
  await Notification.updateOne({ _id: id }, { $addToSet: { readBy: ctx.user._id } });
  return {};
}
async function markAllRead(ctx) {
  const ids = (await recent()).filter((n) => R.isVisibleTo(n, ctx.perms.can, ctx) && !R.isReadBy(n, ctx.user._id)).map((n) => n._id);
  if (ids.length) await Notification.updateMany({ _id: { $in: ids } }, { $addToSet: { readBy: ctx.user._id } });
  return { marked: ids.length };
}
async function notifyAdmin({ type = 'security_alert', title, body = '', link = '/admin', forPermission }) {
  let notification = null;
  try {
    notification = await Notification.create({ type, title, body, link: R.safeLink(link), ...(forPermission ? { forPermission } : {}) });
  } catch (err) {
    console.error('Admin notification failed:', err?.message || err);
  }
  // Email is best-effort: never block the dashboard bell or the business action.
  const to = String(process.env.ADMIN_EMAIL || process.env.OWNER_EMAIL || '').trim();
  const templateId = String(process.env.EMAILJS_NOTIFICATION_TEMPLATE_ID || '').trim();
  if (to && templateId) {
    try {
      const config = getEmailJsConfig();
      if (config) await sendEmailJsTemplate({
        to, subject: 'AFSANA alert: ' + String(title || 'Dashboard notification'),
        templateId,
        params: { notification_type: String(type), email_title: String(title || 'AFSANA notification'), email_body: String(body || ''), dashboard_url: 'https://afsanaperfumes.store/admin', notification_link: 'https://afsanaperfumes.store' + R.safeLink(link) },
      }, { config });
    } catch (err) {
      console.error('[admin-email] notification delivery failed:', err?.message || err);
    }
  }
  return notification;
}
module.exports = { list, markRead, markAllRead, notifyAdmin };
