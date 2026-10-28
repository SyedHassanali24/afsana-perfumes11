const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, Session, Staff, Role } = require('../database/models');
const { E, ApiError } = require('./errors');
const { parseCookies, serializeCookie } = require('./http');
const { resolve, withinWorkingHours } = require('./permissions');

const COOKIE = 'afsana_staff';
const SESSION_DAYS = 7;
const MAX_FAILS = 5;
const LOCK_MINUTES = 15;
const OTP_TTL_MS = 10 * 60 * 1000;
const RESET_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

async function sendResetOtp(email, otp) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error('Password reset email service is not configured.');
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [email], subject: 'AFSANA staff password reset OTP', html: `<p>Your AFSANA password reset code is <strong>${otp}</strong>.</p><p>This code expires in 10 minutes. If you did not request it, ignore this email.</p>` }) });
  if (!r.ok) throw new Error('Unable to send reset email.');
}
async function requestPasswordReset(email) {
  const target = String(process.env.ADMIN_EMAIL || process.env.EASTWALA_EMAIL || '').trim().toLowerCase();
  const normalized = String(email || '').trim().toLowerCase();
  const user = target && normalized === target ? await User.findOne({ email: normalized, kind: 'staff', status: 'Active' }).select('+passwordHash') : null;
  if (!user) return { sent: true };
  const otp = String(crypto.randomInt(100000, 1000000));
  user.resetOtpHash = sha256(otp);
  user.resetOtpExpires = new Date(Date.now() + OTP_TTL_MS);
  user.resetOtpVerifiedHash = undefined; user.resetOtpVerifiedExpires = undefined;
  user.resetOtpAttempts = 0; user.resetOtpRequestedAt = new Date();
  await user.save();
  await sendResetOtp(normalized, otp);
  return { sent: true };
}
async function verifyPasswordResetOtp(email, otp) {
  const normalized = String(email || '').trim().toLowerCase();
  const user = await User.findOne({ email: normalized, kind: 'staff', status: 'Active' }).select('+resetOtpHash');
  if (!user || !user.resetOtpHash || !user.resetOtpExpires || user.resetOtpExpires < new Date()) throw new ApiError(400, 'INVALID_OTP', 'Invalid or expired OTP.');
  if ((user.resetOtpAttempts || 0) >= OTP_MAX_ATTEMPTS) throw new ApiError(429, 'OTP_LOCKED', 'Too many OTP attempts. Request a new code.');
  if (sha256(String(otp)) !== user.resetOtpHash) { user.resetOtpAttempts = (user.resetOtpAttempts || 0) + 1; await user.save(); throw new ApiError(400, 'INVALID_OTP', 'Invalid or expired OTP.'); }
  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetOtpVerifiedHash = sha256(resetToken); user.resetOtpVerifiedExpires = new Date(Date.now() + RESET_TTL_MS);
  user.resetOtpHash = undefined; user.resetOtpExpires = undefined; user.resetOtpAttempts = 0;
  await user.save();
  return { resetToken };
}
async function resetPasswordWithToken(email, resetToken, newPassword) {
  const normalized = String(email || '').trim().toLowerCase();
  const user = await User.findOne({ email: normalized, kind: 'staff', status: 'Active' }).select('+resetOtpVerifiedHash');
  if (!user || !user.resetOtpVerifiedHash || !user.resetOtpVerifiedExpires || user.resetOtpVerifiedExpires < new Date() || sha256(String(resetToken)) !== user.resetOtpVerifiedHash) throw new ApiError(400, 'INVALID_RESET', 'Reset session is invalid or expired.');
  user.passwordHash = await bcrypt.hash(String(newPassword), 12); user.passwordChangedAt = new Date(); user.mustChangePassword = false;
  user.resetOtpVerifiedHash = undefined; user.resetOtpVerifiedExpires = undefined; user.resetOtpHash = undefined; user.resetOtpExpires = undefined; user.resetOtpAttempts = 0;
  await user.save();
  await Session.updateMany({ userId: user._id, revokedAt: { $exists: false } }, { revokedAt: new Date(), revokedReason: 'password_reset' });
  return { reset: true };
}

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const secret = () => {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error('JWT_SECRET missing or shorter than 32 chars');
  return s;
};
const secure = () => !process.env.NETLIFY_DEV;
const sessionCookie = (token) => serializeCookie(COOKIE, token, { maxAge: SESSION_DAYS * 86400, secure: secure() });
const clearCookie = () => serializeCookie(COOKIE, '', { maxAge: 0, secure: secure() });

let dummyHash;
async function login({ email, password, ip, userAgent }) {
  const generic = new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  const user = await User.findOne({ email: String(email).toLowerCase(), kind: 'staff' }).select('+passwordHash');
  if (!user) { // equalise timing so unknown emails are not detectable
    dummyHash = dummyHash || bcrypt.hashSync('not-a-real-password', 12);
    await bcrypt.compare(password, dummyHash); throw generic;
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) throw E.tooMany('Too many failed attempts. Try again later.');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    // Atomically increment the failure counter so concurrent login attempts cannot
    // race past the lock threshold or overwrite each other's failed-attempt count.
    const lockUntil = new Date(Date.now() + LOCK_MINUTES * 60000);
    await User.updateOne(
      { _id: user._id },
      [
        { $set: { failedLoginCount: { $add: [{ $ifNull: ['$failedLoginCount', 0] }, 1] } } },
        { $set: {
          lockedUntil: { $cond: [{ $gte: ['$failedLoginCount', MAX_FAILS] }, lockUntil, '$lockedUntil'] },
          failedLoginCount: { $cond: [{ $gte: ['$failedLoginCount', MAX_FAILS] }, 0, '$failedLoginCount'] },
        } },
      ],
    );
    throw generic;
  }
  if (user.status !== 'Active') throw E.forbidden('This account is not active.');
  const staff = await Staff.findOne({ userId: user._id, isDeleted: false });
  if (!staff || staff.status !== 'Active') throw E.forbidden('This account is not active.');

  const jti = crypto.randomBytes(24).toString('hex');
  const session = await Session.create({
    userId: user._id, tokenHash: sha256(jti), device: { userAgent, ip },
    expiresAt: new Date(Date.now() + SESSION_DAYS * 86400000),
  });
  user.failedLoginCount = 0; user.lockedUntil = undefined; user.lastLoginAt = new Date();
  await user.save();
  const token = jwt.sign({ sid: String(session._id), jti }, secret(), { expiresIn: `${SESSION_DAYS}d` });
  return { cookie: sessionCookie(token), user, staff };
}

async function authenticate(req) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (!token) throw E.unauthorized();
  let payload;
  try { payload = jwt.verify(token, secret()); } catch { throw E.unauthorized(); }
  const session = await Session.findById(payload.sid);
  if (!session || session.revokedAt || session.expiresAt < new Date() || session.tokenHash !== sha256(payload.jti)) throw E.unauthorized();
  const user = await User.findById(session.userId);
  if (!user || user.kind !== 'staff' || user.status !== 'Active') throw E.unauthorized();
  const staff = await Staff.findOne({ userId: user._id, isDeleted: false });
  if (!staff || staff.status !== 'Active') throw E.forbidden('This account is not active.');
  const role = await Role.findById(staff.roleId);
  if (!role) throw E.forbidden();
  if (!role.isUnrestricted && !withinWorkingHours(staff.workingHours)) throw E.forbidden('Access is not allowed outside your working hours.');
  if (Date.now() - session.lastActiveAt.getTime() > 60000) await Session.updateOne({ _id: session._id }, { lastActiveAt: new Date() });

  const perms = resolve({ role, staff });
  return {
    user, staff, role, session, perms,
    ip: req.headers['x-nf-client-connection-ip'] || (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || undefined,
    // high-risk actions: re-verify the password
    async reauth(password) {
      if (!password) throw new ApiError(403, 'REAUTH_REQUIRED', 'Please confirm your password to continue.');
      const u = await User.findById(user._id).select('+passwordHash');
      if (!(await bcrypt.compare(String(password), u.passwordHash))) throw new ApiError(403, 'REAUTH_FAILED', 'Incorrect password.');
    },
  };
}
module.exports = { login, authenticate, sessionCookie, clearCookie, COOKIE, sha256, secret, secure };
