const { Notification } = require('../database/models');
const { E } = require('../middleware/errors');
const R = require('./notificationRules');
const { sendTransactionalEmail } = require('./otpMailer');
const escapeHtml = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const emailShell = (title, body) => '<div style="max-width:620px;margin:24px auto;background:#0b0a08;color:#f6edda;font-family:Arial,sans-serif;padding:32px;border:1px solid #b99552"><div style="text-align:center"><img src="https://afsanaperfumes.store/afsana-email-logo.jpg" alt="AFSANA Perfumes" width="150" style="max-width:150px;height:auto"></div><p style="text-align:center;letter-spacing:3px;color:#d8b66f">AFSANA · THE ART OF SCENT</p><h2 style="color:#e6c77e">'+escapeHtml(title)+'</h2><div style="line-height:1.7">'+body+'</div><p style="margin-top:32px;color:#d8c8a5">Regards,<br><strong>AFSANA Perfumes Team</strong></p><a style="color:#e6c77e" href="https://afsanaperfumes.store/admin">Open dashboard</a></div>';

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
  const to = String(process.env.ADMIN_EMAIL || process.env.EASTWALA_EMAIL || process.env.OWNER_EMAIL || 'eastwala@gmail.com').trim();
  if (to) {
    try {
      const safeLink = R.safeLink(link);
      await sendTransactionalEmail({
        to, subject: 'AFSANA alert: ' + String(title || 'Dashboard notification'),
        text: String(title || 'AFSANA notification') + '\n' + String(body || '') + '\nhttps://afsanaperfumes.store' + safeLink,
        html: emailShell(title || 'AFSANA notification', '<p>'+escapeHtml(body || '').replace(/\n/g, '<br>')+'</p><p><a style="color:#e6c77e" href="https://afsanaperfumes.store'+safeLink+'">View notification</a></p>'),
      });
    } catch (err) { console.error('[admin-email] notification delivery failed:', err?.message || err); }
  }
  return notification;
}
module.exports = { list, markRead, markAllRead, notifyAdmin };
