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
    user.failedLoginCount += 1;
    if (user.failedLoginCount >= MAX_FAILS) { user.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60000); user.failedLoginCount = 0; }
    await user.save();
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
module.exports = { login, authenticate, sessionCookie, clearCookie, COOKIE, sha256 };
