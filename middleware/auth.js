const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, Session, Staff, Role } = require('../database/models');
const { E, ApiError } = require('./errors');
const { parseCookies, serializeCookie } = require('./http');
const { resolve, withinWorkingHours } = require('./permissions');

const COOKIE = 'afsana_staff';
const SESSION_DAYS = 7;
const MAX_FAILS = 3;
const LOCK_MINUTES = 3;
const OTP_TTL_MS = 10 * 60 * 1000;
const LOGIN_OTP_TTL_MS = 5 * 60 * 1000;
const RESET_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const TRUSTED_DEVICE_DAYS = 90;

async function ownerEmail() {
  const configured = String(process.env.OWNER_EMAIL || process.env.ADMIN_EMAIL || process.env.EASTWALA_EMAIL || '').trim().toLowerCase();
  if (configured) return configured;
  const ownerRole = await Role.findOne({ key: 'owner' });
  if (!ownerRole) throw new Error('Owner email is not configured.');
  const ownerStaff = await Staff.findOne({ roleId: ownerRole._id, isDeleted: false, status: 'Active' }).select('userId');
  if (!ownerStaff) throw new Error('Owner email is not configured.');
  const owner = await User.findById(ownerStaff.userId).select('email');
  if (!owner?.email) throw new Error('Owner email is not configured.');
  return String(owner.email).trim().toLowerCase();
}

async function sendOtpEmail(to, subject, purpose, otp) {
  const text = `Your AFSANA ${purpose} code is ${otp}. It expires in ${purpose === 'admin login verification' ? '5' : '10'} minutes. If you did not request this code, ignore this email.`;
  const html = `<div style="font-family:Arial,sans-serif;color:#24183e;max-width:520px;margin:auto;padding:28px"><p style="font-size:11px;letter-spacing:3px;color:#7958c9;font-weight:bold">AFSANA · THE ART OF SCENT</p><h2 style="font-size:24px">Security verification</h2><p>Your ${purpose} code is:</p><div style="font-size:32px;letter-spacing:9px;font-weight:bold;background:#f3efff;padding:18px;text-align:center;border-radius:12px">${otp}</div><p style="color:#746b83;font-size:13px">${text}</p></div>`;

  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  if (clientId && clientSecret && refreshToken) {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
    });
    const tokenData = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || !tokenData.access_token) throw new Error('Gmail authorization could not be refreshed.');
    const sender = String(process.env.GMAIL_SENDER_EMAIL || to).trim();
    const mime = [
      `From: AFSANA Security <${sender}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      html,
    ].join(String.fromCharCode(13, 10));
    const raw = Buffer.from(mime, 'utf8').toString('base64url');
    const sent = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenData.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw }),
    });
    if (!sent.ok) throw new Error('Gmail could not deliver the security email.');
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (apiKey && from) {
    const sent = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, html, text }),
    });
    if (!sent.ok) throw new Error('Email provider could not deliver the security email.');
    return;
  }
  throw new Error('Email OTP is not configured. Add Gmail OAuth secrets or Resend email credentials to the Cloudflare Worker.');
}

async function sendOwnerOtp(otp, purpose) {
  const to = await ownerEmail();
  const subject = purpose === 'admin login verification' ? 'AFSANA admin login verification' : 'AFSANA staff password reset OTP';
  await sendOtpEmail(to, subject, purpose, otp);
}

async function requestPasswordReset(email) {
  const normalized = String(email || '').trim().toLowerCase();
  const user = await User.findOne({ email: normalized, kind: 'staff', status: 'Active' });
  if (!user) return { sent: true };
  const staff = await Staff.findOne({ userId: user._id, isDeleted: false, status: 'Active' });
  if (!staff) return { sent: true };

  const otp = String(crypto.randomInt(100000, 1000000));
  user.resetOtpHash = sha256(otp);
  user.resetOtpExpires = new Date(Date.now() + OTP_TTL_MS);
  user.resetOtpVerifiedHash = undefined; user.resetOtpVerifiedExpires = undefined;
  user.resetOtpAttempts = 0; user.resetOtpRequestedAt = new Date();
  await user.save();
  try {
    await sendOwnerOtp(otp, 'staff password reset');
  } catch (error) {
    user.resetOtpHash = undefined; user.resetOtpExpires = undefined;
    await user.save();
    throw error;
  }
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

function isPrivilegedRole(role) {
  return !!role && (role.isUnrestricted === true || ['owner', 'admin', 'super_admin'].includes(String(role.key || '').toLowerCase()));
}

async function createStaffSession(user, staff, { ip, userAgent }) {
  const jti = crypto.randomBytes(24).toString('hex');
  const session = await Session.create({
    userId: user._id, tokenHash: sha256(jti), device: { userAgent, ip },
    expiresAt: new Date(Date.now() + SESSION_DAYS * 86400000),
  });
  user.failedLoginCount = 0;
  user.lockedUntil = undefined;
  user.lastLoginAt = new Date();
  await user.save();
  const token = jwt.sign({ sid: String(session._id), jti }, secret(), { expiresIn: `${SESSION_DAYS}d` });
  return { cookie: sessionCookie(token), user, staff };
}

function clearLoginChallenge(user) {
  user.loginOtpChallengeHash = undefined;
  user.loginOtpHash = undefined;
  user.loginOtpDeviceHash = undefined;
  user.loginOtpExpires = undefined;
  user.loginOtpAttempts = 0;
}

async function login({ email, password, ip, userAgent, deviceId }) {
  const generic = new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  const user = await User.findOne({ email: String(email).toLowerCase(), kind: 'staff' }).select('+passwordHash');
  if (!user) {
    dummyHash = dummyHash || bcrypt.hashSync('not-a-real-password', 12);
    await bcrypt.compare(password, dummyHash);
    throw generic;
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw E.tooMany('Too many failed attempts. This account is locked for 3 minutes.');
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
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
  const role = await Role.findById(staff.roleId);
  if (!role) throw E.forbidden('This account is not active.');

  if (isPrivilegedRole(role)) {
    const id = String(deviceId || '');
    if (id.length < 20 || id.length > 128) throw new ApiError(400, 'DEVICE_ID_REQUIRED', 'Please refresh the sign-in page and try again.');
    const deviceHash = sha256(id);
    const now = new Date();
    const trusted = (user.trustedDevices || []).find((d) => d.tokenHash === deviceHash && d.expiresAt && d.expiresAt > now);
    if (trusted) {
      trusted.lastUsedAt = now;
      await user.save();
    } else {
      // Migration: allow the browser already holding a live session from this same
      // IP + User-Agent to enroll its persistent device token once, without locking
      // the owner out on the first release of 2FA.
      const existing = ip && userAgent ? await Session.findOne({
        userId: user._id, revokedAt: { $exists: false }, expiresAt: { $gt: now },
        'device.ip': ip, 'device.userAgent': userAgent,
      }) : null;
      if (existing) {
        user.trustedDevices = (user.trustedDevices || []).filter((d) => d.expiresAt && d.expiresAt > now);
        user.trustedDevices.push({ tokenHash: deviceHash, label: String(userAgent).slice(0, 120), lastUsedAt: now, expiresAt: new Date(now.getTime() + TRUSTED_DEVICE_DAYS * 86400000) });
        user.trustedDevices = user.trustedDevices.slice(-15);
        await user.save();
      } else {
        const otp = String(crypto.randomInt(100000, 1000000));
        const challengeId = crypto.randomBytes(32).toString('hex');
        user.loginOtpChallengeHash = sha256(challengeId);
        user.loginOtpHash = sha256(otp);
        user.loginOtpDeviceHash = deviceHash;
        user.loginOtpExpires = new Date(now.getTime() + LOGIN_OTP_TTL_MS);
        user.loginOtpAttempts = 0;
        await user.save();
        try {
          await sendOwnerOtp(otp, 'admin login verification');
        } catch (error) {
          clearLoginChallenge(user);
          await user.save();
          throw error;
        }
        return { requiresTwoFactor: true, challengeId };
      }
    }
  }

  return createStaffSession(user, staff, { ip, userAgent });
}

async function verifyAdminLoginOtp({ email, challengeId, otp, deviceId, ip, userAgent }) {
  const normalized = String(email || '').trim().toLowerCase();
  const user = await User.findOne({ email: normalized, kind: 'staff', status: 'Active' })
    .select('+loginOtpChallengeHash +loginOtpHash +loginOtpDeviceHash');
  if (!user || !user.loginOtpChallengeHash || !user.loginOtpHash || !user.loginOtpExpires || user.loginOtpExpires < new Date() ||
      sha256(String(challengeId || '')) !== user.loginOtpChallengeHash ||
      sha256(String(deviceId || '')) !== user.loginOtpDeviceHash) {
    throw new ApiError(400, 'INVALID_OTP', 'This verification request is invalid or expired. Sign in again.');
  }
  if ((user.loginOtpAttempts || 0) >= OTP_MAX_ATTEMPTS) {
    clearLoginChallenge(user); await user.save();
    throw new ApiError(429, 'OTP_LOCKED', 'Too many verification attempts. Sign in again.');
  }
  if (sha256(String(otp || '')) !== user.loginOtpHash) {
    user.loginOtpAttempts = (user.loginOtpAttempts || 0) + 1;
    if (user.loginOtpAttempts >= OTP_MAX_ATTEMPTS) clearLoginChallenge(user);
    await user.save();
    throw new ApiError(400, 'INVALID_OTP', 'Incorrect verification code.');
  }

  const staff = await Staff.findOne({ userId: user._id, isDeleted: false, status: 'Active' });
  const role = staff ? await Role.findById(staff.roleId) : null;
  if (!staff || !role || !isPrivilegedRole(role)) throw E.forbidden('This account is not active.');
  const now = new Date();
  user.trustedDevices = (user.trustedDevices || []).filter((d) => d.expiresAt && d.expiresAt > now && d.tokenHash !== user.loginOtpDeviceHash);
  user.trustedDevices.push({ tokenHash: user.loginOtpDeviceHash, label: String(userAgent || 'Trusted browser').slice(0, 120), lastUsedAt: now, expiresAt: new Date(now.getTime() + TRUSTED_DEVICE_DAYS * 86400000) });
  user.trustedDevices = user.trustedDevices.slice(-15);
  clearLoginChallenge(user);
  await user.save();
  return createStaffSession(user, staff, { ip, userAgent });
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
module.exports = { login, verifyAdminLoginOtp, authenticate, sessionCookie, clearCookie, COOKIE, sha256, secret, secure };
