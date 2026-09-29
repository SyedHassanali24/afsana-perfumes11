// Cached connection: Netlify Functions reuse warm containers, so we must not reconnect per invocation.
const mongoose = require('mongoose');

let cached = global.__mongoose;
if (!cached) cached = global.__mongoose = { conn: null, promise: null };

async function connectDB() {
  const { MONGODB_URI, MONGODB_DB_NAME } = process.env;
  if (!MONGODB_URI || !MONGODB_DB_NAME) throw new Error('MONGODB_URI / MONGODB_DB_NAME not set');
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    mongoose.set('strictQuery', true);
    cached.promise = mongoose.connect(MONGODB_URI, {
      dbName: MONGODB_DB_NAME, maxPoolSize: 5, serverSelectionTimeoutMS: 8000, autoIndex: false,
    });
  }
  try { cached.conn = await cached.promise; } catch (e) { cached.promise = null; throw e; }
  return cached.conn;
}
module.exports = { connectDB };
