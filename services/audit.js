const { AuditLog } = require('../database/models');
// Mandatory for: price/stock/permission/role/refund/export/staff-status/security changes.
async function audit(ctx, { action, module, recordId, oldValue, newValue }, session) {
  await AuditLog.create([{
    userId: ctx.user._id, action, module, recordId: recordId ? String(recordId) : undefined,
    oldValue, newValue, ip: ctx.ip, sessionId: ctx.session && ctx.session._id,
  }], session ? { session } : {});
}
module.exports = { audit };
