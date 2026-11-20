import mongoose from "mongoose";

export async function connectMongo(env) {
  if (mongoose.connection.readyState === 1) return mongoose.connection.db;

  // Share the same in-flight connection promise used by database/connection.js.
  // This helper runs inside the MongoDB Durable Object, where socket reuse across
  // requests is supported and keeps the MongoDB client in one actor context.
  let connecting = mongoose.__afsanaConnecting;
  if (!connecting) {
    mongoose.__afsanaConnecting = mongoose.connect(env.MONGODB_URI, {
      dbName: env.MONGODB_DB_NAME || "afsana_live",
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 5,
      minPoolSize: 0,
      maxIdleTimeMS: 20000,
      family: 4,
      autoIndex: false
    });
    connecting = mongoose.__afsanaConnecting;
  }

  try {
    await connecting;
  } finally {
    if (mongoose.__afsanaConnecting === connecting) mongoose.__afsanaConnecting = null;
  }

  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    throw new Error("MongoDB connection was not ready after connect");
  }
  return mongoose.connection.db;
}

export async function dbHealth(env) {
  const db = await connectMongo(env);
  await db.command({ ping: 1 });
  return { connected: true, database: db.databaseName };
}
