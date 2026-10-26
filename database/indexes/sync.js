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
    if (mdl && mdl.syncIndexes) { await mdl.syncIndexes(); console.log('indexes synced:', name); }
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
