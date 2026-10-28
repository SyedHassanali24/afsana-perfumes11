import mongoose from "mongoose";
let connecting = null;
export async function getDb(env) {
  if (mongoose.connection.readyState === 1) return mongoose.connection.db;
  if (!connecting) connecting = mongoose.connect(env.MONGODB_URI, { dbName: env.MONGODB_DB_NAME || "afsana_live", serverSelectionTimeoutMS: 8000, maxPoolSize: 5, minPoolSize: 0, family: 4, autoIndex: false });
  try { await connecting; } catch (error) { connecting = null; throw error; }
  return mongoose.connection.db;
}
export async function dbHealth(env) {
  const db = await getDb(env);
  await db.command({ ping: 1 });
  return { connected: true, database: db.databaseName };
}
