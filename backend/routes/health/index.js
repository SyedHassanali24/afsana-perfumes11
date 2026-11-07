// GET /api/health : "is my live site set up correctly?" Shows only yes/no facts and the SHAPE of settings.
// It never prints a secret, a password, the connection string or the cluster address.
const { json } = require('../../../middleware/http');
const { connectDB } = require('../../../database/connection');
const { diagnoseDbError } = require('../../../services/healthDiagnose');

// Describes the connection string without revealing it.
function inspectUri(uri) {
  const u = String(uri || '');
  const m = u.match(/^(mongodb(?:\+srv)?):\/\/([\s\S]*)$/);
  const rest = m ? m[2] : '';
  const at = rest.lastIndexOf('@');
  const cred = at >= 0 ? rest.slice(0, at) : '';
  const host = (at >= 0 ? rest.slice(at + 1) : rest).split(/[/?]/)[0];
  const colon = cred.indexOf(':');
  const pw = colon >= 0 ? cred.slice(colon + 1) : '';
  return {
    scheme: m ? m[1] : 'MISSING (must start with mongodb+srv://)',
    atSigns: (u.match(/@/g) || []).length,                       // must be exactly 1
    hasSpaceOrNewline: /\s/.test(u),                             // must be false
    hasQuotes: /["']/.test(u),                                   // must be false
    hasAngleBrackets: /[<>]/.test(u),                            // must be false (<db_password> not replaced)
    passwordOnlyLettersAndNumbers: pw ? /^[A-Za-z0-9]+$/.test(pw) : null, // should be true
    hostEndsWithMongodbNet: /\.mongodb\.net$/i.test(host),       // should be true
    hostParts: host ? host.split('.').length : 0,                // Atlas hosts have 4 parts, e.g. cluster0.abc123.mongodb.net
  };
}

exports.inspectUri = inspectUri;
exports.handler = async () => {
  const env = process.env;
  const production = env.NODE_ENV === 'production' || env.CONTEXT === 'production';
  const jwt = !env.JWT_SECRET ? 'missing' : env.JWT_SECRET.length < 32 ? 'too_short' : 'ok';
  const emailConfigured = Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);
  const redisConfigured = Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
  const checks = {
    MONGODB_URI: Boolean(env.MONGODB_URI),
    MONGODB_DB_NAME: Boolean(env.MONGODB_DB_NAME),
    JWT_SECRET: jwt === 'ok',
    passwordResetEmail: !production || emailConfigured,
    distributedRateLimit: !production || redisConfigured || env.RATE_LIMIT_FAIL_OPEN === 'true',
  };
  const out = {
    success: true, version: 'health-v2',                      // if you do not see "health-v2", Netlify is still running OLD code
    runningOn: { site: env.SITE_NAME || null, context: env.CONTEXT || null },
    env: checks, jwtSecret: jwt, uriShape: inspectUri(env.MONGODB_URI), database: { connected: false },
  };
  const fixes = [];
  if (production && !emailConfigured) fixes.push('Production mein RESEND_API_KEY aur EMAIL_FROM required hain password reset emails ke liye.');
  if (production && !redisConfigured && env.RATE_LIMIT_FAIL_OPEN !== 'true') fixes.push('Production mein UPSTASH_REDIS_REST_URL aur UPSTASH_REDIS_REST_TOKEN required hain distributed rate limiting ke liye.');
  if (jwt !== 'ok') fixes.push(jwt === 'missing' ? 'JWT_SECRET khali hai ya Netlify ko mila hi nahi.' : 'JWT_SECRET 32 harf se chhota hai.');
  if (/[<>]/.test(env.MONGODB_URI || '')) fixes.push('MONGODB_URI mein < ya > hai: <db_password> ko asli password se badlein (brackets samet).');
  try {
    const mongoose = await connectDB();
    await mongoose.connection.db.admin().ping();
    out.database = { connected: true, name: env.MONGODB_DB_NAME };
    const names = new Set((await mongoose.connection.db.listCollections().toArray()).map((c) => c.name));
    out.database.setupDone = names.has('users') && names.has('roles') && names.has('permissions');
    if (!out.database.setupDone) fixes.push('Database jura hai lekin khali hai: apne PC par "npm run db:setup" aur "npm run db:indexes" chalayein.');
  } catch (e) {
    const d = diagnoseDbError(e);
    out.database = { connected: false, cause: d.code, errorName: String(e && e.name || '').slice(0, 60), errorCode: String(e && e.code || '').slice(0, 40), errorSyscall: String(e && e.syscall || '').slice(0, 40) };
    fixes.unshift(d.hint);
    console.error('[health] db check failed:', d.code, out.database.errorName, out.database.errorCode);
  }
  out.ok = Object.values(checks).every(Boolean) && out.database.connected === true;
  out.fix = fixes;
  return json(out.ok ? 200 : 503, out);
};
