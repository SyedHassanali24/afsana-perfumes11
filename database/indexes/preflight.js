require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../connection');
const { Customer } = require('../models');

async function main() {
  await connectDB();

  const phoneDuplicates = await Customer.aggregate([
    { $match: { phone: { $exists: true, $type: 'string', $ne: '' } } },
    { $group: {
      _id: { storeId: '$storeId', phone: '$phone' },
      count: { $sum: 1 },
      active: { $sum: { $cond: [{ $eq: ['$isDeleted', false] }, 1, 0] } },
      deleted: { $sum: { $cond: [{ $eq: ['$isDeleted', true] }, 1, 0] } },
    } },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
  ]);

  if (phoneDuplicates.length) {
    console.error('Customer phone/index conflicts detected:');
    for (const row of phoneDuplicates) {
      console.error(JSON.stringify({
        storeId: row._id.storeId,
        phone: row._id.phone,
        count: row.count,
        active: row.active,
        deleted: row.deleted,
      }));
    }
    throw new Error('Resolve customer phone duplicates before running npm run db:indexes.');
  }

  console.log('Index preflight OK: no duplicate customer phone/store keys.');
}

main()
  .catch((err) => { console.error(err.message || err); process.exitCode = 1; })
  .finally(async () => { await mongoose.disconnect().catch(() => {}); });
