import mongoose from "mongoose";

export async function connectMongo(env) {
  if (mongoose.connection.readyState === 1) return mongoose.connection.db;
  await mongoose.connect(env.MONGODB_URI, {
    dbName: env.MONGODB_DB_NAME || "afsana_live",
    serverSelectionTimeoutMS: 8000,
    maxPoolSize: 5,
    minPoolSize: 0,
    family: 4,
    autoIndex: false
  });
  return mongoose.connection.db;
}

export async function dbHealth(env) {
  const db = await connectMongo(env);
  await db.command({ ping: 1 });
  return { connected: true, database: db.databaseName };
}
