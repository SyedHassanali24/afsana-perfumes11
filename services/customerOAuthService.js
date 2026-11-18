const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, Customer } = require('../database/models');
const { startSession, secure } = require('../middleware/customerAuth');
const { parseCookies, serializeCookie } = require('../middleware/http');
const { secret } = require('../middleware/auth');
const { ApiError, E } = require('../middleware/errors');
const { withTx } = require('./tx');

const FACEBOOK_GRAPH_VERSION = 'v27.0';
const OAUTH_COOKIE = (provider) => 'afsana_customer_oauth_' + provider;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function siteOrigin() {
  const raw = String(process.env.SITE_URL || 'https://afsanaperfumes.store').replace(/\/+$/, '');
  const url = new URL(raw);
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
    throw new Error('Customer OAuth requires an HTTPS SITE_URL.');
  }
  return url.origin;
}

function providerConfig(provider) {
  if (provider === 'google') {
    return {
      clientId: String(process.env.GOOGLE_OAUTH_CLIENT_ID || '').trim(),
      clientSecret: String(process.env.GOOGLE_OAUTH_CLIENT_SECRET || '').trim(),
    };
  }
  if (provider === 'facebook') {
    return {
      clientId: String(process.env.FACEBOOK_APP_ID || '').trim(),
      clientSecret: String(process.env.FACEBOOK_APP_SECRET || '').trim(),
    };
  }
  throw E.notFound('Social sign-in provider not found.');
}

function getProviders() {
  const google = providerConfig('google');
  const facebook = providerConfig('facebook');
  return {
    providers: {
      google: Boolean(google.clientId && google.clientSecret),
      facebook: Boolean(facebook.clientId && facebook.clientSecret),
    },
  };
}

function safeReturnTo(value) {
  const candidate = String(value || '/account');
  if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\') || /[\u0000-\u001f]/.test(candidate)) {
    return '/account';
  }
  try {
    const base = siteOrigin();
    const parsed = new URL(candidate, base);
    if (parsed.origin !== base || parsed.pathname === '/login' || parsed.pathname === '/register') return '/account';
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return '/account';
  }
}

function stateCookie(provider, token) {
  return serializeCookie(OAUTH_COOKIE(provider), token, { maxAge: 600, secure: secure() });
}

function clearStateCookie(provider) {
  return serializeCookie(OAUTH_COOKIE(provider), '', { maxAge: 0, secure: secure() });
}

function base64url(bytes) {
  return Buffer.from(bytes).toString('base64url');
}

function googleChallenge(verifier) {
  return base64url(crypto.createHash('sha256').update(verifier).digest());
}

function begin(provider, returnTo) {
  const config = providerConfig(provider);
  if (!config.clientId || !config.clientSecret) {
    throw new ApiError(503, 'OAUTH_NOT_CONFIGURED', 'This sign-in option is not configured yet.');
  }

  const state = base64url(crypto.randomBytes(32));
  const verifier = base64url(crypto.randomBytes(32));
  const token = jwt.sign({
    provider,
    state,
    verifier,
    returnTo: safeReturnTo(returnTo),
  }, secret(), { expiresIn: '10m', issuer: 'afsana-customer-oauth' });

  const redirectUri = siteOrigin() + '/api/account/oauth/' + provider + '/callback';
  const url = provider === 'google'
    ? new URL('https://accounts.google.com/o/oauth2/v2/auth')
    : new URL('https://www.facebook.com/' + FACEBOOK_GRAPH_VERSION + '/dialog/oauth');

  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', provider === 'google' ? 'openid email profile' : 'email,public_profile');
  url.searchParams.set('state', state);

  if (provider === 'google') {
    url.searchParams.set('code_challenge', googleChallenge(verifier));
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('prompt', 'select_account');
  }

  return { location: url.toString(), cookie: stateCookie(provider, token) };
}

async function fetchJson(url, init) {
  let response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(10000) });
  } catch {
    throw new ApiError(502, 'OAUTH_PROVIDER_UNAVAILABLE', 'The sign-in provider could not be reached. Please try again.');
  }
  let data;
  try { data = await response.json(); }
  catch { throw new ApiError(502, 'OAUTH_PROVIDER_RESPONSE', 'The sign-in provider returned an invalid response.'); }
  if (!response.ok || data?.error) {
    throw new ApiError(401, 'OAUTH_PROVIDER_REJECTED', 'The social sign-in could not be verified. Please try again.');
  }
  return data;
}

async function googleProfile(code, verifier) {
  const config = providerConfig('google');
  const redirectUri = siteOrigin() + '/api/account/oauth/google/callback';
  const form = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
    code_verifier: verifier,
  });
  const token = await fetchJson('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  if (!token.access_token) throw new ApiError(401, 'OAUTH_CODE_INVALID', 'Google sign-in could not be completed.');

  const profile = await fetchJson('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: 'Bearer ' + token.access_token },
  });
  if (!profile.sub || !profile.email || !(profile.email_verified === true || profile.email_verified === 'true')) {
    throw new ApiError(401, 'OAUTH_EMAIL_UNVERIFIED', 'Google did not provide a verified email address.');
  }
  return { id: String(profile.sub), email: profile.email, name: profile.name || '', emailVerified: true };
}

async function facebookProfile(code) {
  const config = providerConfig('facebook');
  const redirectUri = siteOrigin() + '/api/account/oauth/facebook/callback';
  const tokenUrl = new URL('https://graph.facebook.com/' + FACEBOOK_GRAPH_VERSION + '/oauth/access_token');
  tokenUrl.searchParams.set('client_id', config.clientId);
  tokenUrl.searchParams.set('client_secret', config.clientSecret);
  tokenUrl.searchParams.set('redirect_uri', redirectUri);
  tokenUrl.searchParams.set('code', code);
  const token = await fetchJson(tokenUrl.toString());
  if (!token.access_token) throw new ApiError(401, 'OAUTH_CODE_INVALID', 'Facebook sign-in could not be completed.');

  const debugUrl = new URL('https://graph.facebook.com/' + FACEBOOK_GRAPH_VERSION + '/debug_token');
  debugUrl.searchParams.set('input_token', token.access_token);
  debugUrl.searchParams.set('access_token', config.clientId + '|' + config.clientSecret);
  const debug = await fetchJson(debugUrl.toString());
  if (!debug.data?.is_valid || String(debug.data.app_id) !== config.clientId) {
    throw new ApiError(401, 'OAUTH_TOKEN_INVALID', 'Facebook sign-in could not be verified.');
  }

  const profileUrl = new URL('https://graph.facebook.com/' + FACEBOOK_GRAPH_VERSION + '/me');
  profileUrl.searchParams.set('fields', 'id,name,email');
  profileUrl.searchParams.set('access_token', token.access_token);
  const profile = await fetchJson(profileUrl.toString());
  if (!profile.id || !profile.email) {
    throw new ApiError(401, 'OAUTH_EMAIL_MISSING', 'Facebook did not share an email address. Use Google or email registration instead.');
  }
  if (debug.data.user_id && String(debug.data.user_id) !== String(profile.id)) {
    throw new ApiError(401, 'OAUTH_IDENTITY_MISMATCH', 'Facebook sign-in could not be verified.');
  }
  return { id: String(profile.id), email: profile.email, name: profile.name || '', emailVerified: true };
}

async function ensureCustomerProfile(user, profile) {
  let customer = await Customer.findOne({ userId: user._id, isDeleted: false });
  if (!customer) {
    customer = await Customer.create({
      userId: user._id,
      name: String(profile.name || profile.email.split('@')[0]).trim().slice(0, 100) || 'AFSANA Customer',
      email: user.email,
      ...(user.phone ? { phone: user.phone } : {}),
    });
  }
  return customer;
}

async function findOrCreateCustomer(provider, profile) {
  const email = String(profile.email || '').trim().toLowerCase();
  const providerUserId = String(profile.id || '').trim();
  if (!EMAIL_RE.test(email) || !providerUserId) {
    throw new ApiError(401, 'OAUTH_PROFILE_INVALID', 'The social account did not provide the details required to sign in.');
  }

  let user = await User.findOne({
    kind: 'customer',
    oauthProviders: { $elemMatch: { provider, providerUserId } },
  });

  if (!user) {
    user = await User.findOne({ email });
    if (user && user.kind !== 'customer') {
      throw E.conflict('This email is already used by an AFSANA staff account. Use a different customer email.');
    }
    if (user) {
      const linked = (user.oauthProviders || []).find((item) => item.provider === provider);
      if (linked && String(linked.providerUserId) !== providerUserId) {
        throw E.conflict('Another social account is already linked to this email.');
      }
      user.oauthProviders = user.oauthProviders || [];
      if (!linked) user.oauthProviders.push({ provider, providerUserId, email, linkedAt: new Date() });
      if (profile.emailVerified && !user.emailVerifiedAt) user.emailVerifiedAt = new Date();
      await user.save();
    } else {
      const passwordHash = await bcrypt.hash(crypto.randomBytes(48).toString('hex'), 12);
      try {
        user = await withTx(async (session) => {
          const [created] = await User.create([{
            kind: 'customer',
            email,
            passwordHash,
            emailVerifiedAt: profile.emailVerified ? new Date() : undefined,
            oauthProviders: [{ provider, providerUserId, email, linkedAt: new Date() }],
          }], { session });
          await Customer.create([{
            userId: created._id,
            name: String(profile.name || email.split('@')[0]).trim().slice(0, 100) || 'AFSANA Customer',
            email,
          }], { session });
          return created;
        });
      } catch (error) {
        if (error?.code !== 11000) throw error;
        user = await User.findOne({ email });
        if (!user || user.kind !== 'customer') throw E.conflict('An account already uses this email. Sign in with that account first.');
        const linked = (user.oauthProviders || []).find((item) => item.provider === provider);
        if (linked && String(linked.providerUserId) !== providerUserId) throw E.conflict('Another social account is already linked to this email.');
        user.oauthProviders = user.oauthProviders || [];
        if (!linked) user.oauthProviders.push({ provider, providerUserId, email, linkedAt: new Date() });
        if (profile.emailVerified && !user.emailVerifiedAt) user.emailVerifiedAt = new Date();
        await user.save();
      }
    }
  }

  if (!user || user.status !== 'Active') throw E.forbidden('This customer account is not active.');
  await ensureCustomerProfile(user, profile);
  user.failedLoginCount = 0;
  user.lockedUntil = undefined;
  user.lastLoginAt = new Date();
  await user.save();
  return user;
}

async function complete(provider, query, cookieHeader, meta) {
  if (!['google', 'facebook'].includes(provider)) throw E.notFound('Social sign-in provider not found.');
  const cookie = parseCookies(cookieHeader || '')[OAUTH_COOKIE(provider)];
  if (!cookie) throw new ApiError(400, 'OAUTH_STATE_MISSING', 'The sign-in session expired. Please try again.');

  let state;
  try {
    state = jwt.verify(cookie, secret(), { issuer: 'afsana-customer-oauth' });
  } catch {
    throw new ApiError(400, 'OAUTH_STATE_INVALID', 'The sign-in session expired. Please try again.');
  }
  if (state.provider !== provider || !query.state || state.state !== String(query.state)) {
    throw new ApiError(400, 'OAUTH_STATE_INVALID', 'The sign-in request could not be verified. Please try again.');
  }
  if (query.error) {
    throw new ApiError(400, 'OAUTH_CANCELLED', 'Social sign-in was cancelled.');
  }
  const code = String(query.code || '');
  if (!code || code.length > 4096) throw new ApiError(400, 'OAUTH_CODE_MISSING', 'The sign-in provider did not return an authorization code.');

  const profile = provider === 'google'
    ? await googleProfile(code, state.verifier)
    : await facebookProfile(code);
  const user = await findOrCreateCustomer(provider, profile);
  return {
    cookie: await startSession(user, meta),
    clearCookie: clearStateCookie(provider),
    returnTo: safeReturnTo(state.returnTo),
  };
}

module.exports = {
  getProviders,
  begin,
  complete,
  clearStateCookie,
  safeReturnTo,
};
