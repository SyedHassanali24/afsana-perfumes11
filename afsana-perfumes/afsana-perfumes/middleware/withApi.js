// Request pipeline: route -> rate limit -> CSRF guard -> DB -> authenticate -> authorize -> validate -> reauth -> handler -> safe errors
const { compile, match, stripPrefix } = require('./router');
const { toResponse, E } = require('./errors');
const { json, lowerKeys, clientIp, parseBody } = require('./http');
const { hit } = require('./rateLimit');
const { connectDB } = require('../database/connection');
const { authenticate } = require('./auth');

function createHandler(group, routes) {
  const compiled = compile(routes);
  return async (event) => {
    try {
      const headers = lowerKeys(event.headers);
      const req = { ...event, headers };
      const method = (event.httpMethod || 'GET').toUpperCase();
      const found = match(compiled, method, stripPrefix(event.path || '/', group));
      if (!found) throw E.notFound('Route not found.');
      const { route, params } = found;

      const ip = clientIp(headers);
      const rl = route.rateLimit || { limit: 120, windowMs: 60000 };
      if (!hit(`${group}:${route.method}:${route.path}:${ip}`, rl.limit, rl.windowMs)) throw E.tooMany();
      // Cross-site request forgery guard: browsers cannot add this header cross-origin without a CORS preflight.
      if (!['GET', 'HEAD'].includes(method) && headers['x-requested-with'] !== 'afsana') throw E.forbidden('Invalid request.');

      await connectDB();
      let ctx = null; let scopes = null;
      if (!route.public) {
        ctx = await authenticate(req);
        if (route.permission) {
          scopes = ctx.perms.can(route.permission[0], route.permission[1]);
          if (!scopes) throw E.forbidden();
        }
      }
      const rawBody = parseBody(req);
      const rawQuery = event.queryStringParameters || {};
      const query = route.query ? route.query.parse(rawQuery) : rawQuery;
      const body = route.body ? route.body.parse(rawBody === undefined ? {} : rawBody) : rawBody;
      if (route.reauth) await ctx.reauth(rawBody && rawBody.confirmPassword);

      const out = await route.handler({ req, params, query, body, ctx, scopes, ip });
      const r = out && out.__res ? out : { status: 200, data: out || {}, headers: {} };
      const extra = route.cache ? { 'Cache-Control': `public, max-age=${route.cache}` } : {};
      return json(r.status, { success: true, ...r.data }, { ...extra, ...r.headers });
    } catch (err) {
      const r = toResponse(err);
      return json(r.status, r.body);
    }
  };
}
module.exports = { createHandler };
