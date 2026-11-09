require('dotenv').config({ quiet: true });
// Reuse the Mongoose connection across requests in long-lived server runtimes.
// Store the in-flight connection on the Mongoose instance to prevent duplicate concurrent connects.
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
  if (!mongoose.__afsanaConnecting) {
    mongoose.set('strictQuery', true);
    mongoose.__afsanaConnecting = mongoose.connect(MONGODB_URI, {
      dbName: MONGODB_DB_NAME,
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 8000,
      family: 4,
      autoIndex: false,
    }).catch((e) => { mongoose.__afsanaConnecting = null; throw e; });
  }
  await mongoose.__afsanaConnecting;
  return mongoose;
}
module.exports = { connectDB };
