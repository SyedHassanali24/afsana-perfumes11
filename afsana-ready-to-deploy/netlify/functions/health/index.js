// GET /api/health : "is my live site set up correctly?" It only says yes/no per item; it never shows a secret or the connection string.
const { json } = require('../../../middleware/http');
const { connectDB } = require('../../../database/connection');
const { diagnoseDbError } = require('../../../services/healthDiagnose');

exports.handler = async () => {
  const env = process.env;
  const checks = {
    MONGODB_URI: Boolean(env.MONGODB_URI),
    MONGODB_DB_NAME: Boolean(env.MONGODB_DB_NAME),
    JWT_SECRET: Boolean(env.JWT_SECRET) && env.JWT_SECRET.length >= 32,
    SITE_URL: Boolean(env.SITE_URL),
  };
  const out = { success: true, env: checks, database: { connected: false } };
  const fixes = [];
  if (!checks.JWT_SECRET) fixes.push('JWT_SECRET missing hai ya 32 harf se chhota hai (login nahi chalega).');
  if (!checks.SITE_URL) fixes.push('SITE_URL missing hai (password reset links ke liye).');
  if (/[<>]/.test(env.MONGODB_URI || '')) fixes.push('MONGODB_URI mein < ya > nazar aa raha hai: <db_password> ko apne asli password se badlein (brackets samet).');
  try {
    const mongoose = await connectDB();
    await mongoose.connection.db.admin().ping();
    out.database = { connected: true, name: env.MONGODB_DB_NAME };
    const names = new Set((await mongoose.connection.db.listCollections().toArray()).map((c) => c.name));
    out.database.setupDone = names.has('users') && names.has('roles') && names.has('permissions');
    if (!out.database.setupDone) fixes.push('Database jura hai lekin khali hai: apne PC par "npm run db:setup" aur "npm run db:indexes" chalayein.');
  } catch (e) {
    const d = diagnoseDbError(e);
    out.database = { connected: false, cause: d.code };
    fixes.unshift(d.hint);
    console.error('[health] db check failed:', d.code); // log the category only
  }
  out.ok = checks.MONGODB_URI && checks.MONGODB_DB_NAME && checks.JWT_SECRET && out.database.connected === true;
  out.fix = fixes;
  return json(out.ok ? 200 : 503, out);
};
