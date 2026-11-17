'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildJournal, trialBalance, totals, manualEntriesToJournal, manualPeriodSummary, manualBalanceSheet } = require('../services/accountantRules');

test('automatic sales, costs, payments, refunds and expenses create balanced journal batches', () => {
  const order = { _id: 'order-1', orderNumber: 'AFS-0001', subtotal: 5000, discount: 500, shipping: 200, total: 4700, createdAt: new Date('2026-11-01T05:00:00Z') };
  const journal = buildJournal({
    orders: [order],
    itemsByOrder: new Map([['order-1', [{ costPrice: 1200, quantity: 2 }]]]),
    payments: [{ orderId: 'order-1', orderNumber: 'AFS-0001', method: 'COD', amount: 4700, status: 'Paid', receivedAt: new Date('2026-11-02T05:00:00Z') }],
    refunds: [{ orderId: 'order-1', orderNumber: 'AFS-0001', amount: 300, method: 'Cash', createdAt: new Date('2026-11-03T05:00:00Z') }],
    expenses: [{ _id: 'expense-1', category: 'Advertising', amount: 1000, date: new Date('2026-11-04T05:00:00Z'), description: 'Campaign' }],
  });
  assert.ok(journal.length >= 5);
  assert.ok(journal.every((entry) => entry.balanced));
  const sum = totals(journal);
  assert.equal(sum.debit, sum.credit);
  assert.ok(trialBalance(journal).length > 0);
});

test('missing product costs do not post partial inventory valuation', () => {
  const journal = buildJournal({
    orders: [{ _id: 'o2', orderNumber: 'AFS-0002', subtotal: 2000, discount: 0, shipping: 0, total: 2000, createdAt: new Date() }],
    itemsByOrder: new Map([['o2', [{ costPrice: 400, quantity: 1 }, { quantity: 1 }]]]),
  });
  assert.equal(journal.filter((entry) => entry.source === 'cost').length, 0);
  assert.ok(journal.every((entry) => entry.balanced));
});

test('roles that cannot see costs do not receive cost journal rows', () => {
  const journal = buildJournal({
    orders: [{ _id: 'o3', orderNumber: 'AFS-0003', subtotal: 1000, discount: 0, shipping: 0, total: 1000, createdAt: new Date() }],
    itemsByOrder: new Map([['o3', [{ costPrice: 500, quantity: 1 }]]]),
    hideProfit: true,
  });
  assert.equal(journal.filter((entry) => entry.source === 'cost').length, 0);
  assert.ok(journal.every((entry) => entry.balanced));
});


test('manual journal lines join the general journal and calculate investment, income, expenses and closing balances', () => {
  const entries = [
    { _id: 'manual-000001', date: new Date('2026-11-02T05:00:00Z'), narration: 'Owner investment', lines: [
      { account: 'Cash / Bank', accountType: 'asset', debit: 100000, credit: 0 },
      { account: "Owner's Capital", accountType: 'equity', debit: 0, credit: 100000 },
    ] },
    { _id: 'manual-000002', date: new Date('2026-11-03T05:00:00Z'), narration: 'Advertising', lines: [
      { account: 'Advertising expense', accountType: 'expense', debit: 10000, credit: 0 },
      { account: 'Cash / Bank', accountType: 'asset', debit: 0, credit: 10000 },
    ] },
    { _id: 'manual-000003', date: new Date('2026-11-04T05:00:00Z'), narration: 'Other revenue', lines: [
      { account: 'Cash / Bank', accountType: 'asset', debit: 5000, credit: 0 },
      { account: 'Other income', accountType: 'income', debit: 0, credit: 5000 },
    ] },
  ];
  const journal = manualEntriesToJournal(entries);
  assert.equal(journal.length, 3);
  assert.ok(journal.every((entry) => entry.source === 'manual' && entry.balanced));
  assert.equal(totals(journal).debit, 115000);
  assert.equal(totals(journal).credit, 115000);

  const summary = manualPeriodSummary(entries);
  assert.equal(summary.investment, 100000);
  assert.equal(summary.income, 5000);
  assert.equal(summary.expenses, 10000);

  const balances = manualBalanceSheet([
    { _id: { account: 'Cash / Bank', accountType: 'asset' }, debit: 105000, credit: 10000 },
    { _id: { account: "Owner's Capital", accountType: 'equity' }, debit: 0, credit: 100000 },
    { _id: { account: 'Advertising expense', accountType: 'expense' }, debit: 10000, credit: 0 },
    { _id: { account: 'Other income', accountType: 'income' }, debit: 0, credit: 5000 },
  ]);
  assert.equal(balances.assets.total, 95000);
  assert.equal(balances.equity.total, 95000);
  assert.equal(balances.liabilities.total, 0);
});
