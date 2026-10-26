// Production runs with autoIndex:false (see connection.js). Run `npm run db:indexes` after schema changes.
require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../connection');
const models = require('../models');

(async () => {
  await connectDB();
  const { Customer } = models;
  const duplicates = await Customer.aggregate([
    { $match: { phone: { $exists: true, $type: 'string', $ne: '' } } },
    { $group: { _id: { storeId: '$storeId', phone: '$phone' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);
  if (duplicates.length) throw new Error(`Cannot sync indexes: ${duplicates.length} duplicate customer phone/store key(s) exist.`);
  for (const [name, mdl] of Object.entries(models)) {
    // createIndexes is intentionally used instead of syncIndexes: production must never drop an
    // existing index just because a schema/index definition changed in code. Stale indexes are
    // reviewed and removed explicitly in a separate migration.
    if (mdl && mdl.createIndexes) { await mdl.createIndexes(); console.log('indexes ensured:', name); }
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
