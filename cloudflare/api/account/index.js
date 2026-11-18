const { createHandler } = require('../../../middleware/withApi');
const { res } = require('../../../middleware/http');
const { clearCustomerCookie } = require('../../../middleware/customerAuth');
const { Session } = require('../../../database/models');
const S = require('../../../validation/schemas');
const A = require('../../../services/accountService');
const O = require('../../../services/orderService');
const OAuth = require('../../../services/customerOAuthService');

const meta = (req, ip) => ({ ip, userAgent: req.headers['user-agent'] });
const customer = { audience: 'customer' };
function oauthLoginUrl(status, provider) {
  const url = new URL('/login', process.env.SITE_URL || 'https://afsanaperfumes.store');
  url.searchParams.set('oauth', status);
  url.searchParams.set('provider', provider);
  return url.toString();
}

function oauthRedirect(location, cookie) {
  return res(302, {}, {
    Location: location,
    'Cache-Control': 'no-store',
    ...(cookie ? { 'Set-Cookie': cookie } : {}),
  });
}

function startCustomerOAuth(provider, query) {
  try {
    const auth = OAuth.begin(provider, query?.returnTo);
    return oauthRedirect(auth.location, auth.cookie);
  } catch (error) {
    const status = error?.code === 'OAUTH_NOT_CONFIGURED' ? 'not_configured' : 'failed';
    return oauthRedirect(oauthLoginUrl(status, provider));
  }
}

async function finishCustomerOAuth(provider, { req, query, ip }) {
  try {
    const auth = await OAuth.complete(provider, query || {}, req.headers.cookie, meta(req, ip));
    const destination = new URL(auth.returnTo, process.env.SITE_URL || 'https://afsanaperfumes.store').toString();
    // OAuth state cookie is short-lived (10 minutes) and expires naturally. Set only the customer session cookie here.
    return oauthRedirect(destination, auth.cookie);
  } catch (error) {
    const status = error?.code === 'OAUTH_CANCELLED' ? 'cancelled'
      : error?.code === 'OAUTH_NOT_CONFIGURED' ? 'not_configured' : 'failed';
    console.warn('[customer-oauth] sign-in callback rejected:', status);
    return oauthRedirect(oauthLoginUrl(status, provider), OAuth.clearStateCookie(provider));
  }
}


// Storefront customer accounts (cookie: afsana_customer). Staff use /api/auth instead.
const routes = [
  { method: 'GET', path: '/oauth/providers', public: true, rateLimit: { limit: 30, windowMs: 60000 },
    handler() { return OAuth.getProviders(); } },
  { method: 'GET', path: '/oauth/google', public: true, rateLimit: { limit: 10, windowMs: 60000 },
    handler({ query }) { return startCustomerOAuth('google', query); } },
  { method: 'GET', path: '/oauth/google/callback', public: true, rateLimit: { limit: 20, windowMs: 60000 },
    handler(args) { return finishCustomerOAuth('google', args); } },
  { method: 'GET', path: '/oauth/facebook', public: true, rateLimit: { limit: 10, windowMs: 60000 },
    handler({ query }) { return startCustomerOAuth('facebook', query); } },
  { method: 'GET', path: '/oauth/facebook/callback', public: true, rateLimit: { limit: 20, windowMs: 60000 },
    handler(args) { return finishCustomerOAuth('facebook', args); } },
  { method: 'POST', path: '/register', public: true, body: S.registerBody, rateLimit: { limit: 5, windowMs: 60 * 60000 },
    async handler({ body, req, ip }) { const { cookie, customer: c } = await A.register(body, meta(req, ip)); return res(201, { customer: c }, { 'Set-Cookie': cookie }); } },
  { method: 'POST', path: '/login', public: true, body: S.customerLoginBody, rateLimit: { limit: 10, windowMs: 15 * 60000 },
    async handler({ body, req, ip }) { const { cookie, customer: c } = await A.login(body, meta(req, ip)); return res(200, { customer: c }, { 'Set-Cookie': cookie }); } },
  { method: 'POST', path: '/forgot-password', public: true, body: S.forgotBody, rateLimit: { limit: 5, windowMs: 60 * 60000 },
    async handler({ body }) { await A.forgotPassword(body); return { message: 'If an account exists with this email, a verification code has been sent.' }; } },
  { method: 'POST', path: '/forgot-password/verify', public: true, body: S.verifyForgotBody, rateLimit: { limit: 10, windowMs: 15 * 60000 },
    async handler({ body }) { return A.verifyForgotPasswordOtp(body); } },
  { method: 'POST', path: '/reset-password', public: true, body: S.resetBody, rateLimit: { limit: 5, windowMs: 15 * 60000 },
    async handler({ body }) { await A.resetPassword(body); return {}; } },
  { method: 'POST', path: '/offer-lead', public: true, body: S.offerLeadBody, rateLimit: { limit: 5, windowMs: 60 * 60000 },
    async handler({ body }) { return A.captureOfferLead(body); } },

  { ...customer, method: 'POST', path: '/logout',
    async handler({ ctx }) { await Session.updateOne({ _id: ctx.session._id }, { revokedAt: new Date(), revokedReason: 'logout' }); return res(200, {}, { 'Set-Cookie': clearCustomerCookie() }); } },
  { ...customer, method: 'GET', path: '/me', handler: ({ ctx }) => ({ customer: A.shape(ctx.customer) }) },
  { ...customer, method: 'PATCH', path: '/me', body: S.profilePatch, handler: ({ ctx, body }) => A.updateProfile(ctx, body) },
  { ...customer, method: 'GET', path: '/orders', query: S.myOrdersQuery, handler: ({ ctx, query }) => O.listMine(ctx.customer._id, query) },
  { ...customer, method: 'GET', path: '/orders/:orderNumber', handler: ({ ctx, params }) => O.getMine(ctx.customer._id, params.orderNumber) },
  { ...customer, method: 'POST', path: '/orders/:orderNumber/cancel', rateLimit: { limit: 10, windowMs: 15 * 60000 }, handler: ({ ctx, params }) => O.cancelMine(ctx.customer._id, params.orderNumber) },
  { ...customer, method: 'GET', path: '/addresses', handler: ({ ctx }) => A.listAddresses(ctx) },
  { ...customer, method: 'POST', path: '/addresses', body: S.addressBody, handler: async ({ ctx, body }) => res(201, await A.addAddress(ctx, body)) },
  { ...customer, method: 'PATCH', path: '/addresses/:id', body: S.addressPatch, handler: ({ ctx, params, body }) => A.updateAddress(ctx, params.id, body) },
  { ...customer, method: 'DELETE', path: '/addresses/:id', handler: ({ ctx, params }) => A.removeAddress(ctx, params.id) },
  { ...customer, method: 'POST', path: '/change-password', body: S.customerChangePassword, rateLimit: { limit: 10, windowMs: 15 * 60000 }, handler: ({ ctx, body }) => A.changePassword(ctx, body) },
];
exports.handler = createHandler('account', routes);
