const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { User, Session, Customer } = require('../database/models');
const { E, ApiError } = require('../middleware/errors');
const { startSession, verifyLogin } = require('../middleware/customerAuth');
const { sha256 } = require('../middleware/auth');
const { normalizePhone } = require('./phone');
const { withTx } = require('./tx');
const { sendPasswordReset } = require('./mailer');

const RESET_MINUTES = 30;
const hash = (pw) => bcrypt.hash(pw, 12);

const shape = (c) => ({
  id: c._id, name: c.name, phone: c.phone, email: c.email, city: c.city, segment: c.segment,
  addresses: c.addresses || [], loyaltyPoints: c.loyaltyPoints || 0, stats: c.stats, // `notes` is staff-only and never returned
});

// NOTE: no automatic merge with guest customers who ordered with the same phone: the phone is not verified yet,
// so linking would let anyone claim someone else's order history. Do this after OTP/email verification exists.
async function register(body, meta) {
  const or = [{ phone: body.phone }, ...(body.email ? [{ email: body.email.toLowerCase() }] : [])];
  if (await User.exists({ $or: or })) throw E.conflict('An account with this phone number or email already exists. Try signing in.');
  const passwordHash = await hash(body.password);
  const user = await withTx(async (session) => {
    const [u] = await User.create([{ kind: 'customer', phone: body.phone, email: body.email, passwordHash, passwordChangedAt: new Date() }], { session });
    await Customer.create([{ userId: u._id, name: body.name, phone: body.phone, email: body.email }], { session });
    return u;
  });
  const customer = await Customer.findOne({ userId: user._id });
  return { cookie: await startSession(user, meta), customer: shape(customer) };
}

async function login(body, meta) {
  const identifier = body.identifier.includes('@') ? body.identifier : normalizePhone(body.identifier);
  const user = await verifyLogin({ identifier, password: body.password });
  const customer = await Customer.findOne({ userId: user._id, isDeleted: false });
  if (!customer) throw E.forbidden('This account is not active.');
  return { cookie: await startSession(user, meta), customer: shape(customer) };
}

async function updateProfile(ctx, patch) {
  const c = await Customer.findByIdAndUpdate(ctx.customer._id, { $set: patch }, { new: true });
  return { customer: shape(c) };
}

async function changePassword(ctx, { currentPassword, newPassword }) {
  const u = await User.findById(ctx.user._id).select('+passwordHash');
  if (!(await bcrypt.compare(currentPassword, u.passwordHash))) throw new ApiError(400, 'WRONG_PASSWORD', 'Current password is incorrect.');
  if (currentPassword === newPassword) throw E.badRequest('Choose a password different from the current one.');
  u.passwordHash = await hash(newPassword); u.passwordChangedAt = new Date();
  await u.save();
  await Session.updateMany({ userId: u._id, _id: { $ne: ctx.session._id }, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date(), revokedReason: 'password_changed' } });
  return {};
}

// Always answers the same way so it cannot be used to discover which emails/phones have accounts.
async function forgotPassword({ identifier }) {
  const isEmail = identifier.includes('@');
  const user = await User.findOne({ kind: 'customer', ...(isEmail ? { email: identifier.toLowerCase() } : { phone: normalizePhone(identifier) }) });
  if (user && user.email && user.status === 'Active') {
    const token = crypto.randomBytes(32).toString('hex');
    await User.updateOne({ _id: user._id }, { $set: { resetTokenHash: sha256(token), resetTokenExpires: new Date(Date.now() + RESET_MINUTES * 60000) } });
    const base = process.env.SITE_URL || 'http://localhost:8888';
    await sendPasswordReset({ to: user.email, url: `${base}/reset-password?token=${token}` });
  }
  return {};
}

async function resetPassword({ token, newPassword }) {
  const bad = new ApiError(400, 'INVALID_RESET_LINK', 'This reset link is invalid or has expired.');
  const user = await User.findOne({ kind: 'customer', resetTokenHash: sha256(token), resetTokenExpires: { $gt: new Date() } }).select('+resetTokenHash');
  if (!user) throw bad;
  const passwordHash = await hash(newPassword);
  await withTx(async (session) => {
    await User.updateOne({ _id: user._id }, { $set: { passwordHash, passwordChangedAt: new Date(), failedLoginCount: 0 }, $unset: { resetTokenHash: 1, resetTokenExpires: 1, lockedUntil: 1 } }, { session });
    await Session.updateMany({ userId: user._id, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date(), revokedReason: 'password_reset' } }, { session });
  });
  return {};
}

module.exports = { register, login, updateProfile, changePassword, forgotPassword, resetPassword, shape };
