// Request pipeline: route -> rate limit -> CSRF guard -> DB -> authenticate -> authorize -> validate -> reauth -> handler -> safe errors
const { compile, match, stripPrefix } = require('./router');
const { toResponse, E, ApiError } = require('./errors');
const { json, lowerKeys, clientIp, parseBody } = require('./http');
const { hit } = require('./rateLimit');
const { connectDB } = require('../database/connection');
const { authenticate } = require('./auth');
const { authenticateCustomer } = require('./customerAuth');
const { cacheHeaders, invalidateForGroup } = require('./cache');
const { verifyTurnstile } = require('../services/turnstile');

const configuredOrigins = () => String(process.env.ALLOWED_ORIGINS || '').split(',').map((x) => x.trim()).filter(Boolean);

function allowedOrigin(origin, context) {
  if (!origin) return false;
  const origins = new Set(configuredOrigins());
  const siteUrl = process.env.SITE_URL || context?.site?.url;
  if (siteUrl) origins.add(String(siteUrl).replace(/\/$/, ''));
  return origins.has(origin);
}

function createHandler(group, routes) {
  const compiled = compile(routes);
  return async (event, context) => {
    const headers = lowerKeys(event.headers);
    const origin = headers.origin;
    const corsOrigin = allowedOrigin(origin, context);
    const cors = corsOrigin ? {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
      'Access-Control-Allow-Methods': 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS',
      'Vary': 'Origin',
    } : {};
    if ((event.httpMethod || 'GET').toUpperCase() === 'OPTIONS') return json(204, {}, cors);

    try {
      const req = { ...event, headers };
      const method = (event.httpMethod || 'GET').toUpperCase();
      const found = match(compiled, method, stripPrefix(event.path || '/', group));
      if (!found) throw E.notFound('Route not found.');
      const { route, params } = found;
      const ip = clientIp(headers);
      const rl = route.rateLimit || { limit: 120, windowMs: 60000 };
      if (!await hit(`${group}:${route.method}:${route.path}:${ip}`, rl.limit, rl.windowMs)) throw E.tooMany();
      if (!['GET', 'HEAD'].includes(method) && headers['x-requested-with'] !== 'afsana') throw E.forbidden('Invalid request.');
      // Parse once at the edge-facing API boundary. Turnstile must be verified before
      // database work or any authentication side effects.
      const rawBody = parseBody(req);
      if (route.turnstileAction) {
        const siteUrl = process.env.SITE_URL || context?.site?.url;
        let hostname = headers.host || '';
        try { if (siteUrl) hostname = new URL(siteUrl).hostname; } catch { /* invalid site URL will fail host validation */ }
        await verifyTurnstile({ token: rawBody?.turnstileToken, action: route.turnstileAction, hostname, remoteIp: ip });
      }
      // Public OAuth readiness/start routes are configuration-only and must not wait on MongoDB.
      if (!route.skipDatabase) await connectDB();
      let ctx = null; let scopes = null;
      if (route.public && route.optionalCustomer) {
        try { ctx = await authenticateCustomer(req); } catch { ctx = null; }
      }
      if (!route.public) {
        ctx = route.audience === 'customer' ? await authenticateCustomer(req) : await authenticate(req);
        if (route.audience !== 'customer' && ctx.user.mustChangePassword && !route.allowPasswordChange) throw new ApiError(403, 'PASSWORD_CHANGE_REQUIRED', 'Please change your password to continue.');
        if (route.permission) {
          scopes = ctx.perms.can(route.permission[0], route.permission[1]);
          if (!scopes) throw E.forbidden();
        }
      }
      const rawQuery = event.queryStringParameters || {};
      const query = route.query ? route.query.parse(rawQuery) : rawQuery;
      const body = route.body ? route.body.parse(rawBody === undefined ? {} : rawBody) : rawBody;
      if (route.reauth) await ctx.reauth(rawBody && rawBody.confirmPassword);
      const scheduleBackground = typeof context?.ctx?.waitUntil === 'function'
        ? (task) => context.ctx.waitUntil(Promise.resolve(task))
        : undefined;
      const out = await route.handler({ req, params, query, body, ctx, scopes, ip, scheduleBackground });
      const r = out && out.__res ? out : { status: 200, data: out || {}, headers: {} };
      const cacheable = route.cache && route.public && !route.optionalCustomer &&
        ['GET', 'HEAD'].includes(method) && r.status >= 200 && r.status < 300;
      const extra = cacheable ? cacheHeaders(route.cache, route.cacheSWR, route.cacheTags) : {};
      if (!cacheable && !['GET', 'HEAD'].includes(method) && r.status >= 200 && r.status < 300) {
        await invalidateForGroup(group, context, route.invalidateTags || []);
      }
      return json(r.status, { success: true, ...r.data }, { ...cors, ...extra, ...r.headers });
    } catch (err) {
      const r = toResponse(err);
      if (r.status >= 500) {
        // Never log request bodies, cookies, query values or customer details.
        console.error('[afsana-api] unhandled server error', {
          group,
          method: (event.httpMethod || 'GET').toUpperCase(),
          errorName: String(err && err.name || 'Error').slice(0, 80),
          errorCode: String(err && (err.code || err.codeName) || '').slice(0, 80),
        });
      }
      return json(r.status, r.body, cors);
    }
  };
}
module.exports = { createHandler };
