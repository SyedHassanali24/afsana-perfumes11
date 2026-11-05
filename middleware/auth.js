const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, Session, Staff, Role } = require('../database/models');
const { E, ApiError } = require('./errors');
const { parseCookies, serializeCookie } = require('./http');
const { resolve, withinWorkingHours } = require('./permissions');
const { getEmailJsConfig, sendEmailJsOtp } = require('../services/emailjs');
const { isSessionCurrent } = require('./sessionVersion');

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

  // Prefer EmailJS when fully configured. The private key remains server-side.
  const emailJsConfig = getEmailJsConfig();
  if (emailJsConfig) {
    await sendEmailJsOtp({ to, subject, purpose, otp }, { config: emailJsConfig });
    return;
  }

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
    const sender = String(process.env.GMAIL_SENDER_EMAIL || process.env.OWNER_EMAIL || process.env.ADMIN_EMAIL || process.env.EASTWALA_EMAIL || to).trim();
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
  throw new Error('Email OTP is not configured. Add EmailJS, Gmail OAuth, or Resend credentials to the Cloudflare Worker.');
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
  const now = new Date();
  const otpHash = otpDigest(otp);
  // Atomic per-staff cooldown prevents simultaneous requests from flooding the owner inbox.
  const claimed = await User.findOneAndUpdate(
    {
      _id: user._id,
      $or: [
        { resetOtpRequestedAt: { $exists: false } },
        { resetOtpRequestedAt: { $lte: new Date(now.getTime() - 60000) } },
      ],
    },
    {
      $set: {
        resetOtpHash: otpHash,
        resetOtpExpires: new Date(now.getTime() + OTP_TTL_MS),
        resetOtpAttempts: 0,
        resetOtpRequestedAt: now,
      },
      $unset: {
        resetOtpVerifiedHash: '',
        resetOtpVerifiedExpires: '',
      },
    },
    { new: true },
  );
  if (!claimed) return { sent: true };

  try {
    await sendOwnerOtp(otp, 'staff password reset');
  } catch (error) {
    await User.updateOne(
      { _id: user._id, resetOtpHash: otpHash },
      { $unset: { resetOtpHash: '', resetOtpExpires: '' } },
    );
    throw error;
  }
  return { sent: true };
}
async function verifyPasswordResetOtp(email, otp) {
  const normalized = String(email || '').trim().toLowerCase();
  const now = new Date();
  const user = await User.findOne({ email: normalized, kind: 'staff', status: 'Active' }).select('+resetOtpHash');
  if (!user || !user.resetOtpHash || !user.resetOtpExpires || user.resetOtpExpires < now) throw new ApiError(400, 'INVALID_OTP', 'Invalid or expired OTP.');
  if ((user.resetOtpAttempts || 0) >= OTP_MAX_ATTEMPTS) throw new ApiError(429, 'OTP_LOCKED', 'Too many OTP attempts. Request a new code.');

  const candidateHash = otpDigest(String(otp));
  if (candidateHash !== user.resetOtpHash) {
    // Atomic increment prevents parallel wrong-code requests from racing below the cap.
    const attempts = await User.findOneAndUpdate(
      {
        _id: user._id,
        resetOtpHash: user.resetOtpHash,
        resetOtpExpires: { $gt: now },
        $or: [{ resetOtpAttempts: { $exists: false } }, { resetOtpAttempts: { $lt: OTP_MAX_ATTEMPTS } }],
      },
      { $inc: { resetOtpAttempts: 1 } },
      { new: true },
    ).select('resetOtpAttempts');
    if (!attempts) throw new ApiError(429, 'OTP_LOCKED', 'Too many OTP attempts. Request a new code.');
    if (attempts.resetOtpAttempts >= OTP_MAX_ATTEMPTS) {
      await User.updateOne(
        { _id: user._id, resetOtpHash: user.resetOtpHash, resetOtpAttempts: { $gte: OTP_MAX_ATTEMPTS } },
        { $unset: { resetOtpHash: '', resetOtpExpires: '' } },
      );
      throw new ApiError(429, 'OTP_LOCKED', 'Too many OTP attempts. Request a new code.');
    }
    throw new ApiError(400, 'INVALID_OTP', 'Invalid or expired OTP.');
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  // The correct OTP is consumed atomically; two simultaneous verifications cannot
  // create separate reset tokens from the same six-digit code.
  const verified = await User.findOneAndUpdate(
    {
      _id: user._id,
      resetOtpHash: candidateHash,
      resetOtpExpires: { $gt: now },
      $or: [{ resetOtpAttempts: { $exists: false } }, { resetOtpAttempts: { $lt: OTP_MAX_ATTEMPTS } }],
    },
    {
      $set: {
        resetOtpVerifiedHash: sha256(resetToken),
        resetOtpVerifiedExpires: new Date(now.getTime() + RESET_TTL_MS),
        resetOtpAttempts: 0,
      },
      $unset: { resetOtpHash: '', resetOtpExpires: '' },
    },
    { new: true },
  ).select('_id');
  if (!verified) throw new ApiError(400, 'INVALID_OTP', 'Invalid or expired OTP.');
  return { resetToken };
}
async function resetPasswordWithToken(email, resetToken, newPassword) {
  const normalized = String(email || '').trim().toLowerCase();
  const now = new Date();
  const passwordHash = await bcrypt.hash(String(newPassword), 12);
  // Consume the reset token atomically: two concurrent requests cannot both reset
  // the same staff account with the same single-use token.
  const user = await User.findOneAndUpdate(
    {
      email: normalized,
      kind: 'staff',
      status: 'Active',
      resetOtpVerifiedHash: sha256(String(resetToken)),
      resetOtpVerifiedExpires: { $gt: now },
    },
    {
      $set: {
        passwordHash,
        passwordChangedAt: now,
        mustChangePassword: false,
        failedLoginCount: 0,
        trustedDevices: [],
      },
      $inc: { authVersion: 1 },
      $unset: {
        lockedUntil: '',
        resetOtpVerifiedHash: '',
        resetOtpVerifiedExpires: '',
        resetOtpHash: '',
        resetOtpExpires: '',
        loginOtpChallengeHash: '',
        loginOtpHash: '',
        loginOtpDeviceHash: '',
        loginOtpExpires: '',
      },
    },
    { new: true },
  ).select('_id');
  if (!user) throw new ApiError(400, 'INVALID_RESET', 'Reset session is invalid or expired.');
  await Session.updateMany(
    { userId: user._id, revokedAt: { $exists: false } },
    { revokedAt: now, revokedReason: 'password_reset' },
  );
  return { reset: true };
}

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
// Six-digit OTPs are easy to brute-force offline if stored as plain SHA-256.
// Pepper their digests with the server JWT secret, while random reset tokens keep SHA-256.
const otpDigest = (code) => crypto.createHmac('sha256', secret()).update(String(code)).digest('hex');
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
    userId: user._id, tokenHash: sha256(jti), authVersion: Number(user.authVersion || 0), device: { userAgent, ip },
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
    const lockState = await User.findById(user._id).select('lockedUntil');
    if (lockState?.lockedUntil && lockState.lockedUntil > new Date()) {
      throw E.tooMany('Three incorrect passwords. This account is locked for 3 minutes.');
    }
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
      if (user.loginOtpExpires && user.loginOtpExpires > now) {
        throw E.tooMany('A verification code is already active. Use the latest email code or wait for it to expire.');
      }
      const otp = String(crypto.randomInt(100000, 1000000));
      const challengeId = crypto.randomBytes(32).toString('hex');
      user.loginOtpChallengeHash = sha256(challengeId);
      user.loginOtpHash = otpDigest(otp);
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

  return createStaffSession(user, staff, { ip, userAgent });
}

async function verifyAdminLoginOtp({ email, challengeId, otp, deviceId, ip, userAgent }) {
  const normalized = String(email || '').trim().toLowerCase();
  const now = new Date();
  const user = await User.findOne({ email: normalized, kind: 'staff', status: 'Active' })
    .select('+loginOtpChallengeHash +loginOtpHash +loginOtpDeviceHash');
  if (!user || !user.loginOtpChallengeHash || !user.loginOtpHash || !user.loginOtpExpires || user.loginOtpExpires < now ||
      sha256(String(challengeId || '')) !== user.loginOtpChallengeHash ||
      sha256(String(deviceId || '')) !== user.loginOtpDeviceHash) {
    throw new ApiError(400, 'INVALID_OTP', 'This verification request is invalid or expired. Sign in again.');
  }
  if ((user.loginOtpAttempts || 0) >= OTP_MAX_ATTEMPTS) {
    await User.updateOne(
      { _id: user._id, loginOtpChallengeHash: user.loginOtpChallengeHash },
      { $unset: { loginOtpChallengeHash: '', loginOtpHash: '', loginOtpDeviceHash: '', loginOtpExpires: '' }, $set: { loginOtpAttempts: 0 } },
    );
    throw new ApiError(429, 'OTP_LOCKED', 'Too many verification attempts. Sign in again.');
  }

  const candidateHash = otpDigest(String(otp || ''));
  if (candidateHash !== user.loginOtpHash) {
    const attempts = await User.findOneAndUpdate(
      {
        _id: user._id,
        loginOtpChallengeHash: user.loginOtpChallengeHash,
        loginOtpHash: user.loginOtpHash,
        loginOtpExpires: { $gt: now },
        $or: [{ loginOtpAttempts: { $exists: false } }, { loginOtpAttempts: { $lt: OTP_MAX_ATTEMPTS } }],
      },
      { $inc: { loginOtpAttempts: 1 } },
      { new: true },
    ).select('loginOtpAttempts');
    if (!attempts) throw new ApiError(429, 'OTP_LOCKED', 'Too many verification attempts. Sign in again.');
    if (attempts.loginOtpAttempts >= OTP_MAX_ATTEMPTS) {
      await User.updateOne(
        { _id: user._id, loginOtpChallengeHash: user.loginOtpChallengeHash, loginOtpAttempts: { $gte: OTP_MAX_ATTEMPTS } },
        { $unset: { loginOtpChallengeHash: '', loginOtpHash: '', loginOtpDeviceHash: '', loginOtpExpires: '' }, $set: { loginOtpAttempts: 0 } },
      );
      throw new ApiError(429, 'OTP_LOCKED', 'Too many verification attempts. Sign in again.');
    }
    throw new ApiError(400, 'INVALID_OTP', 'Incorrect verification code.');
  }

  const staff = await Staff.findOne({ userId: user._id, isDeleted: false, status: 'Active' });
  const role = staff ? await Role.findById(staff.roleId) : null;
  if (!staff || !role || !isPrivilegedRole(role)) throw E.forbidden('This account is not active.');

  const trustedDevices = (user.trustedDevices || [])
    .filter((d) => d.expiresAt && d.expiresAt > now && d.tokenHash !== user.loginOtpDeviceHash);
  trustedDevices.push({
    tokenHash: user.loginOtpDeviceHash,
    label: String(userAgent || 'Trusted browser').slice(0, 120),
    lastUsedAt: now,
    expiresAt: new Date(now.getTime() + TRUSTED_DEVICE_DAYS * 86400000),
  });

  // Consume the challenge atomically. A replay or a parallel submit cannot create
  // another session from the same one-time admin login code.
  const verified = await User.findOneAndUpdate(
    {
      _id: user._id,
      loginOtpChallengeHash: sha256(String(challengeId || '')),
      loginOtpHash: candidateHash,
      loginOtpDeviceHash: sha256(String(deviceId || '')),
      loginOtpExpires: { $gt: now },
      $or: [{ loginOtpAttempts: { $exists: false } }, { loginOtpAttempts: { $lt: OTP_MAX_ATTEMPTS } }],
    },
    {
      $set: { trustedDevices: trustedDevices.slice(-15), loginOtpAttempts: 0 },
      $unset: { loginOtpChallengeHash: '', loginOtpHash: '', loginOtpDeviceHash: '', loginOtpExpires: '' },
    },
    { new: true },
  );
  if (!verified) throw new ApiError(400, 'INVALID_OTP', 'This verification request is invalid or expired. Sign in again.');
  return createStaffSession(verified, staff, { ip, userAgent });
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
  // Credential changes increment authVersion. Any old session becomes invalid even
  // if a separate session-revocation write fails during a partial outage.
  if (!isSessionCurrent(session, user)) throw E.unauthorized();
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
module.exports = { login, verifyAdminLoginOtp, requestPasswordReset, verifyPasswordResetOtp, resetPasswordWithToken, authenticate, sessionCookie, clearCookie, COOKIE, sha256, secret, secure };
