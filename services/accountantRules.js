'use strict';

// Auto-journal rules. Each source transaction becomes a balanced, read-only journal batch.
function line(account, debit = 0, credit = 0) {
  return { account, debit: Math.max(0, Number(debit) || 0), credit: Math.max(0, Number(credit) || 0) };
}
function batch({ date, reference, narration, source, lines }) {
  const debit = lines.reduce((sum, row) => sum + row.debit, 0);
  const credit = lines.reduce((sum, row) => sum + row.credit, 0);
  return { date, reference, narration, source, lines, debit, credit, balanced: Math.abs(debit - credit) < 0.005 };
}
function buildJournal({ orders = [], itemsByOrder = new Map(), payments = [], refunds = [], expenses = [], hideProfit = false }) {
  const rows = [];
  for (const order of orders) {
    const amount = Number(order.total) || 0;
    const discount = Number(order.discount) || 0;
    const lines = [
      line('Accounts receivable', amount),
      ...(discount > 0 ? [line('Sales discounts', discount)] : []),
      line('Product sales', 0, Number(order.subtotal) || 0),
      line('Delivery income', 0, Number(order.shipping) || 0),
    ];
    rows.push(batch({ date: order.createdAt, reference: order.orderNumber, narration: 'Sale booked', source: 'order', lines }));
    if (!hideProfit) {
      const items = itemsByOrder.get(String(order._id)) || [];
      const hasMissingCost = items.some((item) => !(Number(item.costPrice) > 0));
      if (items.length && !hasMissingCost) {
        const cogs = items.reduce((sum, item) => sum + Number(item.costPrice) * Number(item.quantity), 0);
        if (cogs > 0) rows.push(batch({ date: order.createdAt, reference: order.orderNumber, narration: 'Cost of goods sold', source: 'cost', lines: [line('Cost of goods sold', cogs), line('Inventory', 0, cogs)] }));
      }
    }
  }
  for (const payment of payments) {
    const method = String(payment.method || '').toLowerCase();
    const account = method.includes('cod') || method.includes('cash') ? 'Cash / COD collections' : 'Bank / payment clearing';
    const amount = Number(payment.amount) || 0;
    if (amount > 0) rows.push(batch({ date: payment.receivedAt || payment.updatedAt || payment.createdAt, reference: payment.orderNumber || String(payment.orderId), narration: 'Payment received', source: 'payment', lines: [line(account, amount), line('Accounts receivable', 0, amount)] }));
  }
  for (const refund of refunds) {
    const amount = Number(refund.amount) || 0;
    const method = String(refund.method || '').toLowerCase();
    const account = method.includes('cash') ? 'Cash refunds' : method.includes('bank') ? 'Bank refunds' : 'Refund clearing';
    if (amount > 0) rows.push(batch({ date: refund.createdAt, reference: refund.orderNumber || String(refund.orderId), narration: 'Customer refund', source: 'refund', lines: [line('Sales returns and refunds', amount), line(account, 0, amount)] }));
  }
  for (const expense of expenses) {
    const amount = Number(expense.amount) || 0;
    if (amount > 0) rows.push(batch({ date: expense.date, reference: String(expense._id), narration: expense.description || expense.category + ' expense', source: 'expense', lines: [line(expense.category + ' expense', amount), line('Expense clearing (payment method not recorded)', 0, amount)] }));
  }
  return rows.sort((a, b) => new Date(b.date) - new Date(a.date));
}
function trialBalance(journal) {
  const accounts = new Map();
  for (const entry of journal) for (const row of entry.lines) {
    const current = accounts.get(row.account) || { account: row.account, accountType: row.accountType || null, debit: 0, credit: 0 };
    if (!current.accountType && row.accountType) current.accountType = row.accountType;
    current.debit += row.debit;
    current.credit += row.credit;
    accounts.set(row.account, current);
  }
  return [...accounts.values()].map((row) => ({ ...row, balance: Math.round((row.debit - row.credit) * 100) / 100 })).sort((a, b) => a.account.localeCompare(b.account));
}
function totals(journal) {
  return journal.reduce((out, entry) => ({ debit: out.debit + entry.debit, credit: out.credit + entry.credit }), { debit: 0, credit: 0 });
}

function manualEntriesToJournal(entries = []) {
  return entries.map((entry) => {
    const lines = (entry.lines || []).map((row) => ({
      account: row.account, accountType: row.accountType,
      debit: Math.max(0, Number(row.debit) || 0),
      credit: Math.max(0, Number(row.credit) || 0),
      ...(row.note ? { note: row.note } : {}),
    }));
    const debit = lines.reduce((sum, row) => sum + row.debit, 0);
    const credit = lines.reduce((sum, row) => sum + row.credit, 0);
    const id = String(entry._id || entry.id || '').slice(-6).toUpperCase();
    return {
      date: entry.date, reference: entry.reference || ('MAN-' + id),
      narration: entry.narration || 'Manual journal entry', source: 'manual',
      lines, debit, credit, balanced: Math.abs(debit - credit) < 0.005,
    };
  }).sort((a, b) => new Date(b.date) - new Date(a.date));
}
function manualPeriodSummary(entries = []) {
  const result = { investment: 0, income: 0, expenses: 0 };
  for (const entry of entries) for (const row of entry.lines || []) {
    const debit = Number(row.debit) || 0;
    const credit = Number(row.credit) || 0;
    if (row.accountType === 'income') result.income += credit - debit;
    if (row.accountType === 'expense') result.expenses += debit - credit;
    if (row.accountType === 'equity' && /capital|investment/i.test(String(row.account || ''))) result.investment += credit - debit;
  }
  for (const key of Object.keys(result)) result[key] = Math.round(result[key] * 100) / 100;
  return result;
}
function manualBalanceSheet(rows = []) {
  const groups = { assets: [], liabilities: [], equity: [] };
  for (const row of rows) {
    const type = row.accountType || row._id?.accountType;
    const account = row.account || row._id?.account;
    const debit = Number(row.debit) || 0;
    const credit = Number(row.credit) || 0;
    const group = type === 'asset' ? 'assets' : type === 'liability' ? 'liabilities' : type === 'equity' ? 'equity' : null;
    if (!group || !account) continue;
    const balance = Math.round((type === 'asset' ? debit - credit : credit - debit) * 100) / 100;
    groups[group].push({ account, balance });
  }
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => a.account.localeCompare(b.account));
  }
  const total = (items) => Math.round(items.reduce((sum, row) => sum + row.balance, 0) * 100) / 100;
  return {
    assets: { total: total(groups.assets), accounts: groups.assets },
    liabilities: { total: total(groups.liabilities), accounts: groups.liabilities },
    equity: { total: total(groups.equity), accounts: groups.equity },
  };
}
module.exports = { line, batch, buildJournal, trialBalance, totals, manualEntriesToJournal, manualPeriodSummary, manualBalanceSheet };
