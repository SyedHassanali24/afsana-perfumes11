const mongoose = require('mongoose');
// Runs fn(session) in a MongoDB transaction (Atlas replica set). NOTE: fn may be retried -> all writes must use `session`.
async function withTx(fn) {
  const session = await mongoose.startSession();
  try { let out; await session.withTransaction(async () => { out = await fn(session); }); return out; }
  finally { session.endSession(); }
}
module.exports = { withTx };
