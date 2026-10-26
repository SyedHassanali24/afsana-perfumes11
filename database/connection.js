require('dotenv').config({ quiet: true });
// Cached connection: Netlify Functions reuse warm containers, so we must not reconnect per invocation.
// The cache lives on the mongoose instance itself (not on `global`): some runtimes (e.g. `netlify dev`) reload
// modules on every request, which creates a NEW mongoose instance whose models would otherwise wait forever
// on a connection that belongs to the old instance.
const mongoose = require('mongoose');

async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose;
  let uri = process.env.MONGODB_URI;
  let dbName = process.env.MONGODB_DB_NAME;

  if (!uri || !dbName) {
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      if (!global.__afsanaMongoMemoryServer) {
        global.__afsanaMongoMemoryServer = await MongoMemoryServer.create();
      }
      uri = global.__afsanaMongoMemoryServer.getUri();
      dbName = 'afsana_memory';
      process.env.MONGODB_URI = uri;
      process.env.MONGODB_DB_NAME = dbName;
      if (!process.env.JWT_SECRET) {
        process.env.JWT_SECRET = 'afsana-dev-secret-super-safe-random-key-2026-min-32-chars';
      }
      if (!process.env.ADMIN_EMAIL) process.env.ADMIN_EMAIL = 'admin@afsana.pk';
      if (!process.env.ADMIN_PASSWORD) process.env.ADMIN_PASSWORD = 'Admin@Afsana2026!';
    } catch {
      throw new Error('MONGODB_URI / MONGODB_DB_NAME not set');
    }
  }

  if (!mongoose.__afsanaConnecting) {
    mongoose.set('strictQuery', true);
    mongoose.__afsanaConnecting = mongoose.connect(uri, {
      dbName, maxPoolSize: 5, serverSelectionTimeoutMS: 8000, autoIndex: false,
    }).catch((e) => { mongoose.__afsanaConnecting = null; throw e; });
  }
  await mongoose.__afsanaConnecting;
  if (!global.__afsanaSeedChecked) {
    global.__afsanaSeedChecked = true;
    try {
      const M = require('./models');
      const count = await M.Product.countDocuments();
      if (count === 0) {
        const { seedEverything } = require('./seed/luxuryCatalog');
        await seedEverything();
      }
    } catch (err) {
      console.warn('[DB Seed Check]', err.message);
    }
  }
  return mongoose;
}
module.exports = { connectDB };
