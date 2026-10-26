const mongoose = require('mongoose');

// Runs fn(session) in a MongoDB transaction (Atlas replica set).
// Falls back to direct execution when running on a standalone single-node instance.
async function withTx(fn) {
  let session = null;
  try {
    session = await mongoose.startSession();
  } catch {
    return fn(null);
  }

  try {
    let out;
    try {
      await session.withTransaction(async () => {
        out = await fn(session);
      });
      return out;
    } catch (txErr) {
      if (txErr.message && /replica set|Transaction numbers|transactions are not supported/i.test(txErr.message)) {
        return await fn(null);
      }
      throw txErr;
    }
  } finally {
    if (session) session.endSession();
  }
}

module.exports = { withTx };
