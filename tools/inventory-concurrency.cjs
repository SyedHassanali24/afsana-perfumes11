#!/usr/bin/env node
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const { Inventory } = require('../database/models');

const uri = process.env.MONGODB_TEST_URI;
const dbName = process.env.MONGODB_TEST_DB_NAME;
if (!uri || !dbName) {
  console.error('Missing MONGODB_TEST_URI and/or MONGODB_TEST_DB_NAME.');
  console.error('This test intentionally refuses to use the normal MONGODB_URI database.');
  process.exit(2);
}

async function main() {
  const variantId = new mongoose.Types.ObjectId();
  const productId = new mongoose.Types.ObjectId();

  await mongoose.connect(uri, {
    dbName,
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 8000,
  });

  await Inventory.create({
    variantId,
    productId,
    current: 1,
    reserved: 0,
    damaged: 0,
    incoming: 0,
    lowStockThreshold: 0,
    storeId: 'main',
  });

  const reserveOnce = async () => {
    const session = await mongoose.startSession();
    try {
      let result = null;
      await session.withTransaction(async () => {
        result = await Inventory.reserve(variantId, 1, { session });
      });
      return Boolean(result);
    } finally {
      await session.endSession();
    }
  };

  try {
    const results = await Promise.all([reserveOnce(), reserveOnce()]);
    const wins = results.filter(Boolean).length;
    const final = await Inventory.findOne({ variantId }).lean();

    if (wins !== 1) {
      throw new Error(`Expected exactly 1 successful reservation; got ${wins}.`);
    }
    if (!final || final.current !== 1 || final.reserved !== 1 || final.current - final.reserved !== 0) {
      throw new Error(`Unexpected final stock state: ${JSON.stringify(final)}`);
    }

    console.log('PASS: two concurrent buyers competed for stock=1.');
    console.log('Result:', JSON.stringify({
      attempts: 2,
      successfulReservations: wins,
      current: final.current,
      reserved: final.reserved,
      available: final.current - final.reserved,
    }));
  } finally {
    await Inventory.deleteOne({ variantId });
    await mongoose.disconnect();
  }
}

main().catch(async (err) => {
  console.error('FAIL:', err.message);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
