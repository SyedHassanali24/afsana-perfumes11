const { createHandler } = require('../../../middleware/withApi');
const { paging, pageMeta, escapeRegex } = require('../../../middleware/pagination');
const { redact } = require('../../../middleware/redact');
const { AuditLog } = require('../../../database/models');
const S = require('../../../validation/schemas');

const routes = [
  { method: 'GET', path: '/', permission: ['auditLogs', 'view'], query: S.auditQuery,
    async handler({ query, ctx }) {
      const { page, limit, skip } = paging(query);
      const filter = {};
      if (query.module) filter.module = query.module;
      if (query.userId) filter.userId = query.userId;
      if (query.q) filter.action = new RegExp(`^${escapeRegex(query.q)}`, 'i');
      if (query.from || query.to) filter.timestamp = { ...(query.from ? { $gte: query.from } : {}), ...(query.to ? { $lte: query.to } : {}) };
      const [rows, total] = await Promise.all([
        AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).populate('userId', 'email').lean(),
        AuditLog.countDocuments(filter),
      ]);
      const logs = rows.map((l) => ({ id: l._id, at: l.timestamp, action: l.action, module: l.module, recordId: l.recordId, user: l.userId && { id: l.userId._id, email: l.userId.email }, ip: l.ip, oldValue: l.oldValue, newValue: l.newValue }));
      return { logs: redact(logs, ctx.perms.deniedFields), pagination: pageMeta(total, page, limit) };
    } },
];
exports.handler = createHandler('audit', routes);
