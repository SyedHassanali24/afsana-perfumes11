// Forgot the owner password? Put the NEW password in .env as ADMIN_PASSWORD, then run:  npm run admin:reset
// Also unlocks the account and signs out all of its sessions.
require('dotenv').config({ quiet: true });
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { connectDB } = require('../connection');
const M = require('../models');

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const pw = process.env.ADMIN_PASSWORD || '';
  if (!email || pw.length < 12) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) in .env first.');
  await connectDB();
  const user = await M.User.findOne({ email });
  if (!user) throw new Error(`No user with email ${email}. Run: npm run db:setup`);
  await M.User.updateOne({ _id: user._id }, { $set: { passwordHash: await bcrypt.hash(pw, 12), failedLoginCount: 0, lockedUntil: null, mustChangePassword: false } });
  const r = await M.Session.deleteMany({ userId: user._id });
  console.log(`Password updated for ${email}. Signed out ${r.deletedCount || 0} session(s).`);
}
main().then(() => mongoose.disconnect()).catch((e) => { console.error('reset failed:', e.message); process.exit(1); });
