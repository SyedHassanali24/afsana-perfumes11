// Pure rules for the staff notification bell (no DB) -> tests/notifications.test.js.
// A notification may carry `forPermission: "orders.view"`: only staff who hold that permission see it. Malformed values fail CLOSED (hidden).
const LIST_LIMIT = 30;   // shown in the dropdown
const SCAN_LIMIT = 100;  // newest rows looked at when counting unread

function parsePermission(s) {
  const m = /^([A-Za-z]+)\.([A-Za-z]+)$/.exec(String(s || ''));
  return m ? [m[1], m[2]] : null;
}
// can = ctx.perms.can -> (module, action) => scopes | null
function isVisibleTo(n, can) {
  if (!n.forPermission) return true;
  const p = parsePermission(n.forPermission);
  return p ? Boolean(can(p[0], p[1])) : false;
}
const isReadBy = (n, uid) => (n.readBy || []).some((id) => String(id) === String(uid));
const shape = (n, uid) => ({ id: n._id, type: n.type, title: n.title || '', body: n.body || '', link: n.link || '', createdAt: n.createdAt, read: isReadBy(n, uid) });
// rows: newest first. -> { notifications (first LIST_LIMIT visible), unread (visible + unread among all rows given) }
function build(rows, can, uid) {
  const visible = (rows || []).filter((n) => isVisibleTo(n, can));
  return { notifications: visible.slice(0, LIST_LIMIT).map((n) => shape(n, uid)), unread: visible.filter((n) => !isReadBy(n, uid)).length };
}
// Only links inside the admin are followed from the bell.
const safeLink = (l) => (typeof l === 'string' && /^\/admin(\/|$)/.test(l) ? l : '/admin');
module.exports = { LIST_LIMIT, SCAN_LIMIT, parsePermission, isVisibleTo, isReadBy, shape, build, safeLink };
