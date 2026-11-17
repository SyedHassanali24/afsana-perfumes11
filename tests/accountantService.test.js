'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const stub = (rel, exp) => {
  const p = require.resolve(path.join(ROOT, rel));
  require.cache[p] = { id: p, filename: p, loaded: true, exports: exp };
};
let saved;
let auditRows;
stub('database/models/index.js', {
  ManualJournalEntry: { create: async (doc) => { saved = doc; return { _id: 'manual-entry-123456', ...doc }; } },
});
stub('middleware/errors.js', {
  E: {
    forbidden: (message) => new Error(message),
    badRequest: (message) => new Error(message),
  },
});
stub('services/dashboardRules.js', {
  pktDateKey: (date) => new Date(date).toISOString().slice(0, 10),
});
stub('services/financeRules.js', {
  dayStart: (value) => new Date(value + 'T00:00:00.000+05:00'),
});
stub('services/audit.js', {
  audit: async (_ctx, event) => { auditRows.push(event); },
});
const Accountant = require('../services/accountantService');
const ALL = [{ kind: 'all', values: [] }];
const ctx = { user: { _id: 'owner-1' } };
const entry = {
  date: '2026-11-17',
  narration: 'Owner invested capital',
  lines: [
    { account: 'Cash / Bank', accountType: 'asset', debit: 25000, credit: 0 },
    { account: "Owner's Capital", accountType: 'equity', debit: 0, credit: 25000 },
  ],
};

test('manual accountant entry is persisted and audited after double-entry validation', async () => {
  saved = null; auditRows = [];
  const result = await Accountant.createManualEntry(ctx, entry, ALL);
  assert.equal(saved.narration, entry.narration);
  assert.equal(saved.totalDebit, 25000);
  assert.equal(saved.totalCredit, 25000);
  assert.equal(result.entry.totalDebit, 25000);
  assert.equal(auditRows[0].action, 'accountant.manual_entry.created');
});

test('manual accountant entry refuses unbalanced or limited-scope posting', async () => {
  const unbalanced = { ...entry, lines: entry.lines.map((line, i) => i === 1 ? { ...line, credit: 24000 } : line) };
  await assert.rejects(() => Accountant.createManualEntry(ctx, unbalanced, ALL), /equal total debits and credits/i);
  await assert.rejects(() => Accountant.createManualEntry(ctx, entry, [{ kind: 'cities', values: ['Karachi'] }]), /full finance access/i);
});
