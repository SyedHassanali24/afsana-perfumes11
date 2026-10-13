// Production runs with autoIndex:false (see connection.js). Run `npm run db:indexes` after schema changes.
require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../connection');
const models = require('../models');

(async () => {
  await connectDB();
  for (const [name, mdl] of Object.entries(models)) {
    if (mdl && mdl.syncIndexes) { await mdl.syncIndexes(); console.log('indexes synced:', name); }
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
