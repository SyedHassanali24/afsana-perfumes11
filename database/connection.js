require('dotenv').config({ quiet: true });
// Cached connection: Cloudflare Worker isolates may be reused, so we must not reconnect per invocation.
// The cache lives on the mongoose instance itself (not on global): some runtimes (e.g. Wrangler local development) reload
// modules on every request, which creates a NEW mongoose instance whose models would otherwise wait forever
// on a connection that belongs to the old instance.
const mongoose = require('mongoose');

function cleanEnvValue(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1).trim();
    }
  }
  return trimmed;
}

async function connectDB() {
  const MONGODB_URI = cleanEnvValue(process.env.MONGODB_URI);
  const MONGODB_DB_NAME = cleanEnvValue(process.env.MONGODB_DB_NAME);

  if (!MONGODB_URI || !MONGODB_DB_NAME) {
    throw new Error('MONGODB_URI / MONGODB_DB_NAME not set');
  }

  if (!/^mongodb(?:\+srv)?:\/\//i.test(MONGODB_URI)) {
    throw new Error('MONGODB_URI must start with mongodb:// or mongodb+srv://');
  }

  if (mongoose.connection.readyState === 1) return mongoose;

  // Share only an in-flight connection attempt. Keeping a resolved promise forever
  // prevents a Worker isolate from reconnecting after MongoDB drops its socket.
  let connecting = mongoose.__afsanaConnecting;
  if (!connecting) {
    mongoose.set('strictQuery', true);
    connecting = mongoose.connect(MONGODB_URI, {
      dbName: MONGODB_DB_NAME,
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 8000,
      family: 4,
      autoIndex: false,
    });
    mongoose.__afsanaConnecting = connecting;
  }

  try {
    await connecting;
  } finally {
    if (mongoose.__afsanaConnecting === connecting) mongoose.__afsanaConnecting = null;
  }
  if (mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB connection was not ready after connect');
  }
  return mongoose;
}
module.exports = { connectDB };
