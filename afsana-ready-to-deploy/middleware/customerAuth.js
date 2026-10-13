// Storefront (customer) sessions. Same Session collection as staff but a separate cookie and kind === 'customer',
// so a customer cookie can never open the admin API and vice versa.
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, Session, Customer } = require('../database/models');
const { E, ApiError } = require('./errors');
const { parseCookies, serializeCookie } = require('./http');
const { sha256, secret, secure } = require('./auth');

const COOKIE = 'afsana_customer';
const SESSION_DAYS = 30;
const MAX_FAILS = 5;
const LOCK_MINUTES = 15;

const cookie = (token) => serializeCookie(COOKIE, token, { maxAge: SESSION_DAYS * 86400, secure: secure() });
const clearCustomerCookie = () => serializeCookie(COOKIE, '', { maxAge: 0, secure: secure() });

async function startSession(user, { ip, userAgent }) {
  const jti = crypto.randomBytes(24).toString('hex');
  const session = await Session.create({ userId: user._id, tokenHash: sha256(jti), device: { userAgent, ip }, expiresAt: new Date(Date.now() + SESSION_DAYS * 86400000) });
  return cookie(jwt.sign({ sid: String(session._id), jti }, secret(), { expiresIn: `${SESSION_DAYS}d` }));
}

let dummyHash;
// identifier = email or (normalised) phone
async function verifyLogin({ identifier, password }) {
  const generic = new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email/phone or password.');
  const isEmail = identifier.includes('@');
  const user = await User.findOne({ kind: 'customer', ...(isEmail ? { email: identifier.toLowerCase() } : { phone: identifier }) }).select('+passwordHash');
  if (!user) { dummyHash = dummyHash || bcrypt.hashSync('not-a-real-password', 12); await bcrypt.compare(password, dummyHash); throw generic; }
  if (user.lockedUntil && user.lockedUntil > new Date()) throw E.tooMany('Too many failed attempts. Try again later.');
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    user.failedLoginCount += 1;
    if (user.failedLoginCount >= MAX_FAILS) { user.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60000); user.failedLoginCount = 0; }
    await user.save();
    throw generic;
  }
  if (user.status !== 'Active') throw E.forbidden('This account is not active.');
  user.failedLoginCount = 0; user.lockedUntil = undefined; user.lastLoginAt = new Date();
  await user.save();
  return user;
}

async function authenticateCustomer(req) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (!token) throw E.unauthorized();
  let payload;
  try { payload = jwt.verify(token, secret()); } catch { throw E.unauthorized(); }
  const session = await Session.findById(payload.sid);
  if (!session || session.revokedAt || session.expiresAt < new Date() || session.tokenHash !== sha256(payload.jti)) throw E.unauthorized();
  const user = await User.findById(session.userId);
  if (!user || user.kind !== 'customer' || user.status !== 'Active') throw E.unauthorized();
  const customer = await Customer.findOne({ userId: user._id, isDeleted: false });
  if (!customer) throw E.unauthorized();
  if (Date.now() - session.lastActiveAt.getTime() > 60000) await Session.updateOne({ _id: session._id }, { lastActiveAt: new Date() });
  return { user, customer, session, ip: req.headers['x-nf-client-connection-ip'] || undefined };
}

module.exports = { COOKIE, startSession, verifyLogin, authenticateCustomer, clearCustomerCookie };
