const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { User, Session, Customer, Coupon, OfferLead } = require('../database/models');
const { E, ApiError } = require('../middleware/errors');
const { startSession, verifyLogin } = require('../middleware/customerAuth');
const { sha256, secret } = require('../middleware/auth');
const { normalizePhone } = require('./phone');
const { withTx } = require('./tx');
const { sendOtpWithFallback } = require('./otpMailer');
const { MAX_ADDRESSES, normalizeDefaults } = require('./addressRules');

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
  const clean = { ...patch };
  if (clean.email !== undefined) {
    const email = clean.email ? clean.email.toLowerCase() : undefined;
    if (email) {
      const exists = await User.findOne({ kind: 'customer', email, _id: { $ne: ctx.user._id } });
      if (exists) throw E.conflict('That email is already linked to another account.');
    }
    await User.updateOne({ _id: ctx.user._id }, email ? { $set: { email } } : { $unset: { email: 1 } });
    clean.email = email;
  }
  const c = await Customer.findByIdAndUpdate(ctx.customer._id, { $set: clean }, { new: true });
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

// Customer password recovery is email-only. A single-use reset token is issued only after a
// six-digit OTP sent to the account email has been verified.
const OTP_TTL_MS = 10 * 60 * 1000;
const RESET_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_COOLDOWN_MS = 60 * 1000;
const otpDigest = (value) => crypto.createHmac('sha256', secret()).update(String(value)).digest('hex');

async function forgotPassword({ email }) {
  const normalized = String(email || '').trim().toLowerCase();
  const generic = { message: 'If an account exists with this email, a verification code has been sent.' };
  const user = await User.findOne({ kind: 'customer', email: normalized, status: 'Active' }).select('_id email');
  if (!user) return generic;

  const now = new Date();
  const otp = String(crypto.randomInt(100000, 1000000));
  const digest = otpDigest(otp);
  const claimed = await User.findOneAndUpdate({
    _id: user._id,
    $or: [
      { resetOtpRequestedAt: { $exists: false } },
      { resetOtpRequestedAt: { $lte: new Date(now.getTime() - OTP_COOLDOWN_MS) } },
    ],
  }, {
    $set: {
      resetOtpHash: digest,
      resetOtpExpires: new Date(now.getTime() + OTP_TTL_MS),
      resetOtpAttempts: 0,
      resetOtpRequestedAt: now,
    },
    $unset: { resetOtpVerifiedHash: '', resetOtpVerifiedExpires: '' },
  }, { new: true }).select('+resetOtpHash');

  if (!claimed) return generic;
  try {
    await sendOtpWithFallback({
      to: normalized,
      subject: 'AFSANA customer password reset',
      purpose: 'customer password reset',
      otp,
    });
  } catch (error) {
    await User.updateOne({ _id: user._id, resetOtpHash: digest }, {
      $unset: { resetOtpHash: '', resetOtpExpires: '' },
    });
    console.error('[customer-password-reset] email delivery failed');
    throw E.serviceUnavailable('We could not send the verification email. Please try again later.');
  }
  return generic;
}

async function verifyForgotPasswordOtp({ email, otp }) {
  const normalized = String(email || '').trim().toLowerCase();
  const now = new Date();
  const user = await User.findOne({
    kind: 'customer',
    email: normalized,
    status: 'Active',
    resetOtpExpires: { $gt: now },
  }).select('+resetOtpHash');

  const invalid = () => new ApiError(400, 'INVALID_OTP', 'The code is invalid or has expired.');
  if (!user || !user.resetOtpHash) throw invalid();
  if ((user.resetOtpAttempts || 0) >= OTP_MAX_ATTEMPTS) {
    throw new ApiError(429, 'OTP_LOCKED', 'Too many incorrect codes. Request a new code.');
  }

  const candidate = otpDigest(String(otp));
  if (candidate !== user.resetOtpHash) {
    const bumped = await User.findOneAndUpdate({
      _id: user._id,
      resetOtpHash: user.resetOtpHash,
      resetOtpExpires: { $gt: now },
      resetOtpAttempts: { $lt: OTP_MAX_ATTEMPTS },
    }, { $inc: { resetOtpAttempts: 1 } }, { new: true }).select('resetOtpAttempts');

    if (!bumped || bumped.resetOtpAttempts >= OTP_MAX_ATTEMPTS) {
      throw new ApiError(429, 'OTP_LOCKED', 'Too many incorrect codes. Request a new code.');
    }
    throw invalid();
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const verified = await User.findOneAndUpdate({
    _id: user._id,
    resetOtpHash: candidate,
    resetOtpExpires: { $gt: now },
    resetOtpAttempts: { $lt: OTP_MAX_ATTEMPTS },
  }, {
    $set: {
      resetOtpVerifiedHash: sha256(resetToken),
      resetOtpVerifiedExpires: new Date(now.getTime() + RESET_TTL_MS),
      resetOtpAttempts: 0,
    },
    $unset: { resetOtpHash: '', resetOtpExpires: '' },
  }, { new: true }).select('_id');

  if (!verified) throw invalid();
  return { resetToken };
}

async function resetPassword({ resetToken, newPassword }) {
  const now = new Date();
  const passwordHash = await hash(newPassword);
  const user = await User.findOneAndUpdate({
    kind: 'customer',
    status: 'Active',
    resetOtpVerifiedHash: sha256(String(resetToken)),
    resetOtpVerifiedExpires: { $gt: now },
  }, {
    $set: { passwordHash, passwordChangedAt: now, failedLoginCount: 0 },
    $inc: { authVersion: 1 },
    $unset: {
      resetOtpVerifiedHash: '', resetOtpVerifiedExpires: '',
      resetOtpHash: '', resetOtpExpires: '', lockedUntil: '',
    },
  }, { new: true }).select('_id');

  if (!user) throw new ApiError(400, 'INVALID_RESET', 'Verify your email first, then request a new reset if the link has expired.');
  await Session.updateMany(
    { userId: user._id, revokedAt: { $exists: false } },
    { $set: { revokedAt: now, revokedReason: 'password_reset' } },
  );
  return {};
}

// Capture a consented welcome-offer lead and issue a unique, one-use 10% coupon.
// Existing contacts can retrieve their still-valid code without creating duplicate records.
async function captureOfferLead(body) {
  const email = String(body.email || '').trim().toLowerCase();
  const phone = normalizePhone(body.phone);
  if (body.marketingConsent !== true) throw E.badRequest('Please agree to receive AFSANA offers before claiming this discount.');

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return withTx(async (session) => {
    const lead = await OfferLead.findOne({
      storeId: 'main',
      isDeleted: false,
      $or: [{ email }, { phone }],
    }).session(session);

    if (lead) {
      const currentCoupon = await Coupon.findOne({
        _id: lead.couponId,
        storeId: 'main',
        isDeleted: false,
        isActive: true,
        expiresAt: { $gt: now },
        usedCount: { $lt: 1 },
      }).session(session).lean();
      if (currentCoupon) {
        return { couponCode: currentCoupon.code, expiresAt: currentCoupon.expiresAt, reused: true };
      }
    }

    let code;
    do {
      code = 'AF10-' + crypto.randomBytes(5).toString('hex').toUpperCase();
    } while (await Coupon.exists({ storeId: 'main', code }).session(session));

    const [coupon] = await Coupon.create([{
      storeId: 'main',
      code,
      type: 'percentage',
      value: 10,
      minOrder: 0,
      firstOrderOnly: false,
      usageLimit: 1,
      perCustomerLimit: 0,
      usedCount: 0,
      startsAt: now,
      expiresAt,
      isActive: true,
      productIds: [],
      categoryIds: [],
    }], { session });

    if (lead) {
      lead.email = email;
      lead.phone = phone;
      lead.couponCode = code;
      lead.couponId = coupon._id;
      lead.source = String(body.source || 'welcome-offer-popup').slice(0, 80);
      lead.campaign = 'WELCOME10';
      lead.marketingConsent = true;
      lead.marketingConsentAt = now;
      lead.status = 'New';
      await lead.save({ session });
    } else {
      await OfferLead.create([{
        storeId: 'main',
        email,
        phone,
        source: String(body.source || 'welcome-offer-popup').slice(0, 80),
        campaign: 'WELCOME10',
        couponCode: code,
        couponId: coupon._id,
        marketingConsent: true,
        marketingConsentAt: now,
        status: 'New',
      }], { session });
    }
    return { couponCode: code, expiresAt, reused: false };
  });
}

// ---------- saved addresses (max 10, exactly one default) ----------
const shapeAddr = (a) => ({ id: a._id, type: a.type, fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2, city: a.city, postalCode: a.postalCode, isDefault: !!a.isDefault });
const addrList = (c) => ({ addresses: c.addresses.map(shapeAddr) });
const loadCustomer = (ctx) => Customer.findOne({ _id: ctx.customer._id, isDeleted: false });

async function listAddresses(ctx) { return addrList(await loadCustomer(ctx)); }
async function addAddress(ctx, body) {
  const c = await loadCustomer(ctx);
  if (c.addresses.length >= MAX_ADDRESSES) throw E.badRequest(`You can save up to ${MAX_ADDRESSES} addresses.`);
  c.addresses.push({ ...body, isDefault: false });
  normalizeDefaults(c.addresses, body.isDefault ? c.addresses[c.addresses.length - 1]._id : undefined);
  await c.save();
  return addrList(c);
}
async function updateAddress(ctx, id, patch) {
  const c = await loadCustomer(ctx);
  const a = c.addresses.id(id);
  if (!a) throw E.notFound('Address not found.');
  const { isDefault, ...rest } = patch;
  a.set(rest);
  normalizeDefaults(c.addresses, isDefault ? a._id : undefined);
  await c.save();
  return addrList(c);
}
async function removeAddress(ctx, id) {
  const c = await loadCustomer(ctx);
  if (!c.addresses.id(id)) throw E.notFound('Address not found.');
  c.addresses.pull({ _id: id });
  normalizeDefaults(c.addresses);
  await c.save();
  return addrList(c);
}

module.exports = { listAddresses, addAddress, updateAddress, removeAddress, register, login, updateProfile, changePassword, forgotPassword, verifyForgotPasswordOtp, resetPassword, captureOfferLead, shape };
