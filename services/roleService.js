const { Role, Staff, PermissionHistory } = require('../database/models');
const { E } = require('../middleware/errors');
const { paging, pageMeta } = require('../middleware/pagination');
const { withTx } = require('./tx');
const { audit } = require('./audit');
const R = require('./accessRules');

// Merge duplicate (module, scope) entries and de-duplicate actions.
function normalizeGrants(grants = []) {
  const map = new Map();
  for (const g of grants) {
    const scope = { kind: (g.scope && g.scope.kind) || 'all', values: (g.scope && g.scope.values) || [] };
    const key = `${g.module}|${scope.kind}|${[...scope.values].sort().join(',')}`;
    const cur = map.get(key) || { module: g.module, actions: [], scope };
    cur.actions = [...new Set([...cur.actions, ...g.actions])];
    map.set(key, cur);
  }
  return [...map.values()];
}

const editableBy = (ctx, r) => !r.isUnrestricted && String(r._id) !== String(ctx.role._id) && R.canManageLevel(ctx.role, r.level);
const shape = (ctx, r, staffCount) => ({
  id: r._id, key: r.key, name: r.name, description: r.description, isSystem: r.isSystem, isUnrestricted: r.isUnrestricted,
  level: r.level, grants: r.grants || [], deniedFields: r.deniedFields || [], staffCount, editable: editableBy(ctx, r),
});

async function counts() {
  const rows = await Staff.aggregate([{ $match: { isDeleted: false } }, { $group: { _id: '$roleId', n: { $sum: 1 } } }]);
  return new Map(rows.map((x) => [String(x._id), x.n]));
}

async function listRoles(ctx) {
  const [roles, c] = await Promise.all([Role.find({ isDeleted: false }).sort({ level: -1, name: 1 }).lean(), counts()]);
  return { roles: roles.map((r) => shape(ctx, r, c.get(String(r._id)) || 0)) };
}
async function getRole(ctx, id) {
  const r = await Role.findOne({ _id: id, isDeleted: false }).lean();
  if (!r) throw E.notFound('Role not found.');
  return { role: shape(ctx, r, await Staff.countDocuments({ roleId: id, isDeleted: false })) };
}

function checkLevel(ctx, level) {
  if (level >= 100 || !R.canManageLevel(ctx.role, level)) throw E.forbidden('A role level must be below your own level.');
}
function checkDeniedFields(ctx, next) {
  const lost = [...ctx.perms.deniedFields].filter((f) => !next.includes(f));
  if (lost.length && !ctx.perms.unrestricted) throw E.forbidden("You can't remove field restrictions that apply to you.");
}

async function createRole(ctx, body) {
  checkLevel(ctx, body.level);
  const grants = normalizeGrants(body.grants);
  if (R.missingGrants(ctx.perms, grants).length) throw E.forbidden("You can't give a role access that you don't have yourself.");
  const deniedFields = body.deniedFields || [];
  checkDeniedFields(ctx, deniedFields);
  const base = R.slugKey(body.name) || 'role';
  let key = base;
  for (let i = 2; await Role.exists({ key }); i += 1) key = `${base}_${i}`;
  const role = await withTx(async (session) => {
    const [r] = await Role.create([{ key, name: body.name, description: body.description, level: body.level, grants, deniedFields, isSystem: false }], { session });
    await PermissionHistory.create([{ roleId: r._id, changedBy: ctx.user._id, change: 'role_created', after: { name: r.name, level: r.level, grants } }], { session });
    await audit(ctx, { action: 'role.created', module: 'roles', recordId: r._id, newValue: { name: r.name, level: r.level } }, session);
    return r;
  });
  return getRole(ctx, role._id);
}

async function updateRole(ctx, id, body) {
  const role = await Role.findOne({ _id: id, isDeleted: false });
  if (!role) throw E.notFound('Role not found.');
  if (role.isUnrestricted) throw E.forbidden('The Owner role cannot be changed.');
  if (String(role._id) === String(ctx.role._id)) throw E.forbidden("You can't edit your own role. Ask a higher-level admin.");
  if (!R.canManageLevel(ctx.role, role.level)) throw E.forbidden('You can only edit roles below your own level.');
  if (role.isSystem && ((body.name && body.name !== role.name) || (body.level !== undefined && body.level !== role.level))) throw E.badRequest('The name and level of a system role cannot be changed.');
  if (body.level !== undefined && body.level !== role.level) checkLevel(ctx, body.level);

  const before = { name: role.name, level: role.level, grants: role.grants.map((g) => g.toObject()), deniedFields: [...role.deniedFields] };
  let grants;
  if (body.grants) {
    grants = normalizeGrants(body.grants);
    const added = R.addedGrants(before.grants, grants); // keeping existing access is fine; only NEW access is checked
    if (R.missingGrants(ctx.perms, added).length) throw E.forbidden("You can't give a role access that you don't have yourself.");
  }
  if (body.deniedFields) checkDeniedFields(ctx, body.deniedFields);

  await withTx(async (session) => {
    const r = await Role.findById(id).session(session);
    if (body.name !== undefined) r.name = body.name;
    if (body.description !== undefined) r.description = body.description;
    if (body.level !== undefined) r.level = body.level;
    if (grants) r.grants = grants;
    if (body.deniedFields) r.deniedFields = body.deniedFields;
    await r.save({ session });
    const after = { name: r.name, level: r.level, grants: r.grants.map((g) => g.toObject()), deniedFields: [...r.deniedFields] };
    await PermissionHistory.create([{ roleId: r._id, changedBy: ctx.user._id, change: 'role_updated', before, after }], { session });
    await audit(ctx, { action: 'role.updated', module: 'roles', recordId: r._id, oldValue: before, newValue: after }, session);
  });
  return getRole(ctx, id); // effective immediately: permissions are resolved from the DB on every request
}

async function deleteRole(ctx, id) {
  const role = await Role.findOne({ _id: id, isDeleted: false });
  if (!role) throw E.notFound('Role not found.');
  if (role.isSystem || role.isUnrestricted) throw E.forbidden('System roles cannot be deleted.');
  if (!R.canManageLevel(ctx.role, role.level)) throw E.forbidden('You can only delete roles below your own level.');
  const n = await Staff.countDocuments({ roleId: id, isDeleted: false });
  if (n) throw E.conflict(`${n} staff member${n === 1 ? ' is' : 's are'} still using this role. Reassign them first.`);
  await withTx(async (session) => {
    await Role.updateOne({ _id: id }, { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: ctx.user._id } }, { session });
    await audit(ctx, { action: 'role.deleted', module: 'roles', recordId: id, oldValue: { name: role.name } }, session);
  });
  return {};
}

async function history(q) {
  const PH = PermissionHistory;
  const { page, limit, skip } = paging(q);
  const filter = {};
  if (q.staffId) filter.staffId = q.staffId;
  if (q.roleId) filter.roleId = q.roleId;
  const [rows, total] = await Promise.all([
    PH.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('changedBy', 'email').lean(),
    PH.countDocuments(filter),
  ]);
  return { history: rows.map((h) => ({ id: h._id, change: h.change, staffId: h.staffId, roleId: h.roleId, by: h.changedBy && h.changedBy.email, before: h.before, after: h.after, at: h.createdAt })), pagination: pageMeta(total, page, limit) };
}

module.exports = { listRoles, getRole, createRole, updateRole, deleteRole, history, normalizeGrants };
