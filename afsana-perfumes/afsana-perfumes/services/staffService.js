const bcrypt = require('bcryptjs');
const { User, Staff, Role, Session, PermissionHistory } = require('../database/models');
const { E, ApiError } = require('../middleware/errors');
const { paging, pageMeta, escapeRegex } = require('../middleware/pagination');
const { withTx } = require('./tx');
const { audit } = require('./audit');
const R = require('./accessRules');

const hash = (pw) => bcrypt.hash(pw, 12);
const revokeSessions = (userId, reason, session, exceptId) => Session.updateMany(
  { userId, revokedAt: { $exists: false }, ...(exceptId ? { _id: { $ne: exceptId } } : {}) },
  { $set: { revokedAt: new Date(), revokedReason: reason } }, session ? { session } : {});

const roleShape = (r) => r && ({ id: r._id, key: r.key, name: r.name, level: r.level, isUnrestricted: r.isUnrestricted });
const shape = (s) => {
  const u = s.userId && s.userId.email !== undefined ? s.userId : null; // populated user
  return {
    id: s._id, userId: u ? u._id : s.userId, name: s.name, email: u && u.email, status: s.status,
    role: roleShape(s.roleId && s.roleId.key ? s.roleId : null), workingHours: s.workingHours, deniedFields: s.deniedFields || [],
    lastLoginAt: u && u.lastLoginAt, mustChangePassword: !!(u && u.mustChangePassword), createdAt: s.createdAt,
  };
};
const populate = (q) => q.populate('userId', 'email lastLoginAt mustChangePassword').populate('roleId', 'key name level isUnrestricted');

async function listStaff(q) {
  const { page, limit, skip } = paging(q);
  const filter = { isDeleted: false };
  if (q.status) filter.status = q.status;
  if (q.roleId) filter.roleId = q.roleId;
  if (q.q) {
    const r = new RegExp(escapeRegex(q.q), 'i');
    const users = await User.find({ kind: 'staff', email: r }).select('_id').limit(200);
    filter.$or = [{ name: r }, { userId: { $in: users.map((u) => u._id) } }];
  }
  const [rows, total] = await Promise.all([populate(Staff.find(filter).sort({ createdAt: 1 }).skip(skip).limit(limit)).lean(), Staff.countDocuments(filter)]);
  return { staff: rows.map(shape), pagination: pageMeta(total, page, limit) };
}

async function getStaff(id) {
  const s = await populate(Staff.findOne({ _id: id, isDeleted: false })).lean();
  if (!s) throw E.notFound('Staff member not found.');
  const now = new Date();
  const overrides = (s.overrides || []).map((o) => ({
    id: o._id, effect: o.effect, grant: o.grant, startsAt: o.startsAt, expiresAt: o.expiresAt, reason: o.reason,
    active: (!o.startsAt || o.startsAt <= now) && (!o.expiresAt || o.expiresAt > now),
  }));
  return { staff: { ...shape(s), overrides } };
}

async function assignableRoles(ctx) {
  const level = ctx.role.isUnrestricted ? { $lt: 100 } : { $lt: ctx.role.level };
  const rows = await Role.find({ isDeleted: false, isUnrestricted: false, level }).sort({ level: -1 }).select('key name level').lean();
  return { roles: rows.map((r) => ({ id: r._id, key: r.key, name: r.name, level: r.level })) };
}

// The one guard every staff-changing action goes through.
async function loadManageable(ctx, id, { allowSelf = false } = {}) {
  const staff = await Staff.findOne({ _id: id, isDeleted: false });
  if (!staff) throw E.notFound('Staff member not found.');
  const role = await Role.findById(staff.roleId);
  if (!role) throw E.forbidden();
  const self = String(staff.userId) === String(ctx.user._id);
  if (self && !allowSelf) throw E.forbidden("You can't change your own access. Ask another admin.");
  if (!self) {
    if (role.isUnrestricted) throw E.forbidden('The Owner account cannot be changed here.');
    if (!R.canManageLevel(ctx.role, role.level)) throw E.forbidden('You can only manage staff below your own level.');
  }
  return { staff, role, self };
}
async function loadAssignableRole(ctx, roleId) {
  const role = await Role.findOne({ _id: roleId, isDeleted: false });
  if (!role) throw E.badRequest('Selected role no longer exists.');
  if (role.isUnrestricted) throw E.forbidden('The Owner role cannot be assigned.');
  if (!R.canManageLevel(ctx.role, role.level)) throw E.forbidden('You can only assign roles below your own level.');
  return role;
}

async function createStaff(ctx, body) {
  const role = await loadAssignableRole(ctx, body.roleId);
  const email = body.email.toLowerCase();
  if (await User.exists({ email })) throw E.conflict('A user with this email already exists.');
  const generated = body.password ? null : R.generatePassword();
  const passwordHash = await hash(body.password || generated);
  const staffId = await withTx(async (session) => {
    const [user] = await User.create([{ kind: 'staff', email, passwordHash, mustChangePassword: true, passwordChangedAt: new Date() }], { session });
    const [staff] = await Staff.create([{ userId: user._id, name: body.name, roleId: role._id, workingHours: body.workingHours, deniedFields: body.deniedFields || [], createdBy: ctx.user._id }], { session });
    await PermissionHistory.create([{ staffId: staff._id, roleId: role._id, changedBy: ctx.user._id, change: 'role_assigned', after: { role: role.key } }], { session });
    await audit(ctx, { action: 'staff.created', module: 'staff', recordId: staff._id, newValue: { email, name: body.name, role: role.key } }, session);
    return staff._id;
  });
  return { ...(await getStaff(staffId)), tempPassword: generated }; // shown once by the UI
}

async function updateStaff(ctx, id, body) {
  const { staff, role, self } = await loadManageable(ctx, id, { allowSelf: true });
  const touchesAccess = ['roleId', 'status', 'workingHours', 'deniedFields'].some((k) => body[k] !== undefined);
  if (self && touchesAccess) throw E.forbidden("You can't change your own access. Ask another admin.");
  const before = { name: staff.name, role: role.key, status: staff.status, workingHours: staff.toObject().workingHours, deniedFields: [...staff.deniedFields] };
  let newRole = null;
  if (body.roleId && String(body.roleId) !== String(staff.roleId)) newRole = await loadAssignableRole(ctx, body.roleId);

  await withTx(async (session) => {
    const s = await Staff.findById(id).session(session);
    if (body.name !== undefined) s.name = body.name;
    if (newRole) s.roleId = newRole._id;
    if (body.status !== undefined) s.status = body.status;
    if (body.workingHours !== undefined) s.workingHours = body.workingHours;
    if (body.deniedFields !== undefined) s.deniedFields = body.deniedFields;
    await s.save({ session });
    if (body.status !== undefined && body.status !== 'Active') {
      await User.updateOne({ _id: s.userId }, { $set: { status: body.status } }, { session });
      await revokeSessions(s.userId, `staff_${body.status.toLowerCase()}`, session);
    } else if (body.status === 'Active') {
      await User.updateOne({ _id: s.userId }, { $set: { status: 'Active' } }, { session });
    }
    const after = { name: s.name, role: newRole ? newRole.key : role.key, status: s.status, workingHours: s.toObject().workingHours, deniedFields: [...s.deniedFields] };
    if (touchesAccess) await PermissionHistory.create([{ staffId: s._id, roleId: s.roleId, changedBy: ctx.user._id, change: newRole ? 'role_changed' : 'access_updated', before, after }], { session });
    await audit(ctx, { action: 'staff.updated', module: 'staff', recordId: s._id, oldValue: before, newValue: after }, session);
  });
  return getStaff(id);
}

async function resetPassword(ctx, id, { password } = {}) {
  const { staff } = await loadManageable(ctx, id);
  const generated = password ? null : R.generatePassword();
  const passwordHash = await hash(password || generated);
  await withTx(async (session) => {
    await User.updateOne({ _id: staff.userId }, { $set: { passwordHash, mustChangePassword: true, passwordChangedAt: new Date(), failedLoginCount: 0 }, $unset: { lockedUntil: 1 } }, { session });
    await revokeSessions(staff.userId, 'password_reset', session);
    await audit(ctx, { action: 'staff.password_reset', module: 'staff', recordId: staff._id }, session);
  });
  return { tempPassword: generated };
}

async function removeStaff(ctx, id) {
  const { staff } = await loadManageable(ctx, id);
  await withTx(async (session) => {
    await Staff.updateOne({ _id: id }, { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: ctx.user._id, status: 'Disabled' } }, { session });
    await User.updateOne({ _id: staff.userId }, { $set: { status: 'Disabled' } }, { session });
    await revokeSessions(staff.userId, 'staff_deleted', session);
    await audit(ctx, { action: 'staff.deleted', module: 'staff', recordId: id, oldValue: { name: staff.name } }, session);
  });
  return {};
}

// ---- temporary access / per-staff overrides ----
async function addOverride(ctx, id, body) {
  const { staff, role } = await loadManageable(ctx, id);
  const problem = R.validateWindow(body);
  if (problem) throw E.badRequest(problem);
  if ((staff.overrides || []).length >= 20) throw E.badRequest('Too many overrides on this account. Remove old ones first.');
  const grant = { module: body.module, actions: [...new Set(body.actions)], scope: body.scope || { kind: 'all', values: [] } };
  if (body.effect === 'allow' && R.missingGrants(ctx.perms, [grant]).length) throw E.forbidden("You can't grant access that you don't have yourself.");
  await withTx(async (session) => {
    const s = await Staff.findById(id).session(session);
    s.overrides.push({ effect: body.effect, grant, startsAt: body.startsAt, expiresAt: body.expiresAt, reason: body.reason, grantedBy: ctx.user._id });
    await s.save({ session });
    const entry = { effect: body.effect, grant, startsAt: body.startsAt, expiresAt: body.expiresAt, reason: body.reason };
    await PermissionHistory.create([{ staffId: s._id, roleId: role._id, changedBy: ctx.user._id, change: 'override_added', after: entry }], { session });
    await audit(ctx, { action: 'staff.override_added', module: 'temporaryAccess', recordId: s._id, newValue: entry }, session);
  });
  return getStaff(id);
}
async function removeOverride(ctx, id, overrideId) {
  const { role } = await loadManageable(ctx, id);
  await withTx(async (session) => {
    const s = await Staff.findById(id).session(session);
    const o = s.overrides.id(overrideId);
    if (!o) throw E.notFound('Override not found.');
    const before = o.toObject();
    s.overrides.pull(overrideId);
    await s.save({ session });
    await PermissionHistory.create([{ staffId: s._id, roleId: role._id, changedBy: ctx.user._id, change: 'override_removed', before }], { session });
    await audit(ctx, { action: 'staff.override_removed', module: 'temporaryAccess', recordId: s._id, oldValue: before }, session);
  });
  return getStaff(id);
}

// ---- sessions ----
async function listSessions(id) {
  const s = await Staff.findOne({ _id: id, isDeleted: false }).select('userId');
  if (!s) throw E.notFound('Staff member not found.');
  const rows = await Session.find({ userId: s.userId, revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } }).sort({ lastActiveAt: -1 }).lean();
  return { sessions: rows.map((x) => ({ id: x._id, device: x.device, lastActiveAt: x.lastActiveAt, createdAt: x.createdAt })) };
}
async function revokeAllSessions(ctx, id) {
  const { staff } = await loadManageable(ctx, id);
  await revokeSessions(staff.userId, 'revoked_by_admin');
  await audit(ctx, { action: 'staff.sessions_revoked', module: 'sessions', recordId: staff._id });
  return {};
}

// ---- own password ----
async function changeOwnPassword(ctx, { currentPassword, newPassword }) {
  const u = await User.findById(ctx.user._id).select('+passwordHash');
  if (!(await bcrypt.compare(currentPassword, u.passwordHash))) throw new ApiError(400, 'WRONG_PASSWORD', 'Current password is incorrect.');
  if (currentPassword === newPassword) throw E.badRequest('Choose a password different from the current one.');
  u.passwordHash = await hash(newPassword);
  u.passwordChangedAt = new Date();
  u.mustChangePassword = false;
  await u.save();
  await revokeSessions(u._id, 'password_changed', null, ctx.session._id); // keep this device signed in
  await audit(ctx, { action: 'auth.password_changed', module: 'security' });
  return {};
}

module.exports = { listStaff, getStaff, assignableRoles, createStaff, updateStaff, resetPassword, removeStaff, addOverride, removeOverride, listSessions, revokeAllSessions, changeOwnPassword };
