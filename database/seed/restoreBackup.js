// Put a downloaded backup file back into a database.
//   1) point .env at the database you want to fill (MONGODB_URI, MONGODB_DB_NAME)
//   2) npm run db:setup          (creates the owner login + roles; login accounts are never part of a backup)
//   3) npm run db:restore -- C:\path\to\afsana-backup-2026-10-15.json
// It refuses to run if the database already has products or orders, unless you add --force (then existing records with the same id are skipped, never overwritten).
require('dotenv').config({ quiet: true });
const fs = require('fs');
const mongoose = require('mongoose');
const { isEncryptedBackup, decryptBackupBuffer } = require('./backupCrypto.cjs');
const { connectDB } = require('../connection');
const M = require('../models');
const { isBackupModel } = require('../../services/backupRules');

const BATCH = 100;
function askHidden(question) {
  return new Promise((resolve, reject) => {
    const input = process.stdin;
    const output = process.stdout;
    if (!input.isTTY || typeof input.setRawMode !== 'function') {
      reject(new Error('Encrypted backup requires a terminal prompt or AFSANA_BACKUP_PASSPHRASE environment variable.'));
      return;
    }
    let value = '';
    const cleanup = () => {
      input.removeListener('data', onData);
      try { input.setRawMode(false); } catch {}
      input.pause();
      output.write('\n');
    };
    const onData = (chunk) => {
      for (const char of chunk.toString('utf8')) {
        if (char === '\u0003') {
          cleanup();
          reject(new Error('Restore cancelled.'));
          return;
        }
        if (char === '\r' || char === '\n') {
          cleanup();
          resolve(value);
          return;
        }
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else if (char >= ' ' && char !== '\u007f') value += char;
      }
    };
    output.write(question);
    try { input.setRawMode(true); input.resume(); input.on('data', onData); }
    catch (error) { cleanup(); reject(error); }
  });
}

async function insertAll(Model, docs) {
  let ok = 0; let skipped = 0;
  for (let i = 0; i < docs.length; i += BATCH) {
    const part = docs.slice(i, i + BATCH);
    try { const r = await Model.insertMany(part, { ordered: false }); ok += r.length; }
    catch (e) {
      const bad = (e.writeErrors && e.writeErrors.length) || (e.results ? e.results.filter((x) => x instanceof Error).length : part.length);
      skipped += bad; ok += part.length - bad;
    }
  }
  return { ok, skipped };
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const file = args.find((a) => !a.startsWith('--'));
  if (!file || !fs.existsSync(file)) throw new Error('Give the backup file: npm run db:restore -- C:\\path\\to\\afsana-backup.json');
  const backupBytes = fs.readFileSync(file);
  let backup;
  if (isEncryptedBackup(backupBytes)) {
    const passphrase = process.env.AFSANA_BACKUP_PASSPHRASE || await askHidden('Backup passphrase (input hidden): ');
    backup = decryptBackupBuffer(backupBytes, passphrase);
  } else {
    // Keep compatibility with legacy plaintext exports created before encrypted backups were introduced.
    backup = JSON.parse(backupBytes.toString('utf8'));
  }
  if (backup.app !== 'afsana-perfumes' || !backup.collections) throw new Error('This is not an Afsana backup file.');
  await connectDB();
  const existing = (await M.Product.countDocuments({})) + (await M.Order.countDocuments({}));
  if (existing > 0 && !force) throw new Error(`This database already has ${existing} products/orders. Use an empty database, or add --force to only add what is missing.`);

  let total = 0; let skippedTotal = 0;
  for (const [name, docs] of Object.entries(backup.collections)) {
    if (!isBackupModel(name, M[name]) || !Array.isArray(docs) || !docs.length) continue;
    const r = await insertAll(M[name], docs);
    total += r.ok; skippedTotal += r.skipped;
    console.log(`  ${name}: ${r.ok} restored${r.skipped ? `, ${r.skipped} skipped (already there or invalid)` : ''}`);
  }
  let pics = 0;
  for (const p of backup.pictures || []) {
    if (!p || !/^[0-9a-f]{24}$/.test(p._id || '') || !p.data) continue;
    if (await M.Media.exists({ _id: p._id })) continue;
    await M.Media.create({ _id: p._id, contentType: p.contentType, size: Buffer.from(p.data, 'base64').length, data: Buffer.from(p.data, 'base64'), filename: p.filename });
    pics += 1;
  }
  console.log(`Done: ${total} records and ${pics} pictures restored${skippedTotal ? `, ${skippedTotal} skipped` : ''}.`);
  console.log('Staff accounts and customer logins are not in a backup: staff are added again in Staff & roles, shoppers use "Forgot password".');
}
main().then(() => mongoose.disconnect()).catch((e) => { console.error('restore failed:', e.message); process.exit(1); });
