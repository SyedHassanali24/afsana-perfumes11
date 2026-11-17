'use strict';

const { Order, OrderItem, Payment, Refund, Expense, ManualJournalEntry } = require('../database/models');
const { E } = require('../middleware/errors');
const D = require('./dashboardRules');
const FR = require('./financeRules');
const R = require('./accountantRules');
const { audit } = require('./audit');

const needAll = (scopes) => { if (!scopes || !scopes.some((s) => s.kind === 'all')) throw E.forbidden('Virtual Accountant needs full finance access.'); };
const isDate = (value) => value instanceof Date && Number.isFinite(value.getTime());
const round = (value) => Math.round((Number(value) || 0) * 100) / 100;

function summarize({ orders, refunds, items, expenses, hideProfit }) {
  const productSales = orders.reduce((sum, order) => sum + (Number(order.subtotal) || 0), 0);
  const discounts = orders.reduce((sum, order) => sum + (Number(order.discount) || 0), 0);
  const deliveryIncome = orders.reduce((sum, order) => sum + (Number(order.shipping) || 0), 0);
  const refundTotal = refunds.reduce((sum, refund) => sum + (Number(refund.amount) || 0), 0);
  const grossRevenue = productSales - discounts + deliveryIncome;
  const netRevenue = grossRevenue - refundTotal;
  const cogs = items.reduce((sum, item) => sum + (Number(item.costPrice) > 0 ? Number(item.costPrice) * Number(item.quantity) : 0), 0);
  const missingCost = items.filter((item) => !(Number(item.costPrice) > 0)).length;
  const operatingExpenses = expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  const grossProfit = netRevenue - cogs;
  const netProfit = grossProfit - operatingExpenses;
  const paymentsReceived = orders.reduce((sum, order) => sum + (Number(order.paidAmount) || 0), 0);
  return {
    sales: { productSales, discounts, deliveryIncome, grossRevenue, refunds: refundTotal, netRevenue, orderCount: orders.length },
    costOfGoodsSold: hideProfit ? null : cogs,
    grossProfit: hideProfit ? null : grossProfit,
    operatingExpenses,
    netProfit: hideProfit ? null : netProfit,
    profitMargin: hideProfit ? null : (netRevenue > 0 ? round((netProfit / netRevenue) * 100) : null),
    paymentsReceived, receivables: Math.max(0, orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0) - paymentsReceived),
    missingCost: hideProfit ? null : missingCost,
    profitEstimate: !hideProfit && missingCost > 0,
  };
}

async function monthlyTrend(now = new Date()) {
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const from = D.pktMonthStart(now, i);
    const to = i === 0 ? new Date(now.getTime() + 1) : D.pktMonthStart(now, i - 1);
    months.push({ key: D.pktDateKey(from).slice(0, 7), label: new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'Asia/Karachi' }).format(from), from, to });
  }
  const from = months[0].from;
  const to = months[months.length - 1].to;
  const [orderRows, expenseRows] = await Promise.all([
    Order.aggregate([
      { $match: { storeId: 'main', status: { $nin: D.EXCLUDED_STATUSES }, createdAt: { $gte: from, $lt: to } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: 'Asia/Karachi' } }, orders: { $sum: 1 }, sales: { $sum: '$subtotal' }, discounts: { $sum: '$discount' }, delivery: { $sum: '$shipping' }, bookedRevenue: { $sum: '$total' } } },
    ]),
    Expense.aggregate([
      { $match: { storeId: 'main', date: { $gte: from, $lt: to } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date', timezone: 'Asia/Karachi' } }, expenses: { $sum: '$amount' } } },
    ]),
  ]);
  const byOrder = new Map(orderRows.map((row) => [row._id, row]));
  const byExpense = new Map(expenseRows.map((row) => [row._id, row.expenses || 0]));
  return months.map((month) => {
    const order = byOrder.get(month.key) || {};
    return { month: month.key, label: month.label, orders: order.orders || 0, productSales: order.sales || 0, discounts: order.discounts || 0, deliveryIncome: order.delivery || 0, bookedRevenue: order.bookedRevenue || 0, expenses: byExpense.get(month.key) || 0 };
  });
}

async function report(query, scopes, denied, now = new Date()) {
  needAll(scopes);
  const range = FR.periodRange(query, now);
  if (!range) throw E.badRequest('Choose a valid date range (up to 366 days).');
  const hideProfit = FR.hidesProfit(denied);
  const orderFilter = { storeId: 'main', status: { $nin: D.EXCLUDED_STATUSES }, createdAt: { $gte: range.from, $lt: range.to } };
  const orders = await Order.find(orderFilter)
    .select('_id orderNumber subtotal shipping discount total couponCode paymentMethod paymentStatus status createdAt')
    .sort({ createdAt: -1 }).limit(3000).lean();
  const orderIds = orders.map((order) => order._id);
  const [refunds, items, expenses, payments, manualEntries, manualBalances] = await Promise.all([
    orderIds.length ? Refund.find({ storeId: 'main', orderId: { $in: orderIds } }).select('_id orderId orderNumber amount method createdAt').lean() : [],
    orderIds.length && !hideProfit ? OrderItem.find({ orderId: { $in: orderIds } }).select('orderId costPrice quantity').lean() : [],
    Expense.find({ storeId: 'main', date: { $gte: range.from, $lt: range.to } }).select('_id category amount date description').lean(),
    orderIds.length ? Payment.find({ orderId: { $in: orderIds }, status: { $in: ['Paid', 'Partially Refunded'] } }).select('orderId orderNumber method amount status receivedAt createdAt updatedAt').lean() : [],
    ManualJournalEntry.find({ storeId: 'main', date: { $gte: range.from, $lt: range.to } }).sort({ date: -1, createdAt: -1 }).lean(),
    ManualJournalEntry.aggregate([
      { $match: { storeId: 'main', date: { $lt: range.to } } },
      { $unwind: '$lines' },
      { $group: { _id: { account: '$lines.account', accountType: '$lines.accountType' }, debit: { $sum: '$lines.debit' }, credit: { $sum: '$lines.credit' } } },
    ]),
  ]);
  const orderNumberById = new Map(orders.map((order) => [String(order._id), order.orderNumber]));
  const journalPayments = payments.map((payment) => ({ ...payment, orderNumber: orderNumberById.get(String(payment.orderId)) || String(payment.orderId) }));
  const paidByOrder = new Map();
  for (const payment of journalPayments) paidByOrder.set(String(payment.orderId), (paidByOrder.get(String(payment.orderId)) || 0) + (Number(payment.amount) || 0));
  const preparedOrders = orders.map((order) => ({ ...order, paidAmount: Math.min(Number(order.total) || 0, paidByOrder.get(String(order._id)) || 0) }));
  const itemsByOrder = new Map();
  for (const item of items) {
    const key = String(item.orderId);
    const list = itemsByOrder.get(key) || [];
    list.push(item);
    itemsByOrder.set(key, list);
  }
  const automaticJournal = R.buildJournal({ orders, itemsByOrder, payments: journalPayments, refunds, expenses, hideProfit });
  const manualJournal = R.manualEntriesToJournal(manualEntries);
  const journal = [...automaticJournal, ...manualJournal].sort((a, b) => new Date(b.date) - new Date(a.date));
  const journalTotals = R.totals(journal);
  const trial = R.trialBalance(journal);
  const baseStatement = summarize({ orders: preparedOrders, refunds, items, expenses, hideProfit });
  const manualSummary = R.manualPeriodSummary(manualEntries);
  const statement = {
    ...baseStatement,
    otherIncome: manualSummary.income,
    manualExpenses: manualSummary.expenses,
    operatingExpenses: round(baseStatement.operatingExpenses + manualSummary.expenses),
    netProfit: hideProfit || baseStatement.netProfit == null ? null : round(baseStatement.netProfit + manualSummary.income - manualSummary.expenses),
  };
  const balanceSheet = R.manualBalanceSheet(manualBalances);
  const cumulativeInvestment = Math.round(manualBalances
    .filter((row) => (row._id?.accountType === 'equity') && /capital|investment/i.test(String(row._id?.account || '')))
    .reduce((sum, row) => sum + (Number(row.credit) || 0) - (Number(row.debit) || 0), 0) * 100) / 100;
  const trend = await monthlyTrend(now);
  const allBalanced = journal.every((entry) => entry.balanced);
  return {
    range: { key: range.key, from: D.pktDateKey(range.from), to: D.pktDateKey(new Date(range.to.getTime() - 1)) },
    incomeStatement: statement,
    manualSummary: { ...manualSummary, investmentToDate: cumulativeInvestment },
    balanceSheet,
    manualJournalCount: manualJournal.length,
    monthlyTrend: trend,
    journal: journal.slice(0, 4000),
    journalCount: journal.length,
    journalBalanced: allBalanced && Math.abs(journalTotals.debit - journalTotals.credit) < 0.005,
    journalTotals: { debit: round(journalTotals.debit), credit: round(journalTotals.credit) },
    trialBalance: trial,
    missingCost: statement.missingCost,
    truncated: orders.length >= 3000,
    accountingNotes: [
      'Journal is generated from recorded orders, confirmed payments, refunds and entered expenses; it does not post or alter financial records.',
      'Expense payment account is shown as clearing because the current expense form does not record whether it was paid by cash or bank.',
      'Net profit is an estimate when product cost snapshots are missing. Add cost prices to product variants to improve accuracy.',
    ],
  };
}

async function createManualEntry(ctx, body, scopes) {
  needAll(scopes);
  const lines = body.lines.map((row) => ({
    account: String(row.account).trim(),
    accountType: row.accountType,
    debit: round(row.debit),
    credit: round(row.credit),
    note: String(row.note || '').trim(),
  }));
  const totalDebit = round(lines.reduce((sum, row) => sum + row.debit, 0));
  const totalCredit = round(lines.reduce((sum, row) => sum + row.credit, 0));
  if (lines.length < 2 || Math.abs(totalDebit - totalCredit) >= 0.005) {
    throw E.badRequest('Manual journal must have at least two lines and equal total debits and credits.');
  }
  if (lines.some((row) => !row.account || ((row.debit > 0) === (row.credit > 0)))) {
    throw E.badRequest('Each journal line needs an account and an amount on either Debit or Credit.');
  }
  const entry = await ManualJournalEntry.create({
    date: FR.dayStart(body.date), narration: body.narration.trim(), lines,
    totalDebit, totalCredit, createdBy: ctx.user._id,
  });
  const shaped = {
    _id: String(entry._id), date: D.pktDateKey(new Date(entry.date)),
    narration: entry.narration, lines, totalDebit, totalCredit,
  };
  await audit(ctx, { action: 'accountant.manual_entry.created', module: 'finance', recordId: entry._id, newValue: shaped });
  return { entry: shaped };
}

module.exports = { report, monthlyTrend, summarize, createManualEntry };
