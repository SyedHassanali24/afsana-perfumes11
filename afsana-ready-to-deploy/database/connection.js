require('dotenv').config({ quiet: true });
// Cached connection: Netlify Functions reuse warm containers, so we must not reconnect per invocation.
// The cache lives on the mongoose instance itself (not on `global`): some runtimes (e.g. `netlify dev`) reload
// modules on every request, which creates a NEW mongoose instance whose models would otherwise wait forever
// on a connection that belongs to the old instance.
const mongoose = require('mongoose');

async function connectDB() {
  const { MONGODB_URI, MONGODB_DB_NAME } = process.env;
  if (!MONGODB_URI || !MONGODB_DB_NAME) throw new Error('MONGODB_URI / MONGODB_DB_NAME not set');
  if (mongoose.connection.readyState === 1) return mongoose;
  if (!mongoose.__afsanaConnecting) {
    mongoose.set('strictQuery', true);
    mongoose.__afsanaConnecting = mongoose.connect(MONGODB_URI, {
      dbName: MONGODB_DB_NAME, maxPoolSize: 5, serverSelectionTimeoutMS: 8000, autoIndex: false,
    }).catch((e) => { mongoose.__afsanaConnecting = null; throw e; });
  }
  await mongoose.__afsanaConnecting;
  return mongoose;
}
module.exports = { connectDB };
