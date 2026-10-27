const { Order, OrderItem, Refund, Expense } = require('../database/models');
const { E } = require('../middleware/errors');
const { paging, pageMeta } = require('../middleware/pagination');
const { audit } = require('./audit');
const D = require('./dashboardRules');
const R = require('./financeRules');

const ID = /^[a-f\d]{24}$/i;
// Finance is store-wide (expenses are not tied to a city / store), so a role limited to some cities may not use it.
const needAll = (scopes) => { if (!scopes || !scopes.some((s) => s.kind === 'all')) throw E.forbidden('Finance needs full access.'); };

// GET summary for a period. Definitions: services/financeRules.js.
async function summary(q, scopes, denied, now = new Date()) {
  needAll(scopes);
  const range = R.periodRange(q, now);
  if (!range) throw E.badRequest('Choose a valid date range (up to 366 days).');
  const orders = await Order.find({ status: { $nin: D.EXCLUDED_STATUSES }, createdAt: { $gte: range.from, $lt: range.to } }).select('_id total').lean();
  const ids = orders.map((o) => o._id);
  const hide = R.hidesProfit(denied);
  const [refunds, items, expenses] = await Promise.all([
    ids.length ? Refund.find({ orderId: { $in: ids } }).select('amount').lean() : [],
    ids.length && !hide ? OrderItem.find({ orderId: { $in: ids } }).select('costPrice quantity').lean() : [],
    Expense.find({ date: { $gte: range.from, $lt: range.to } }).select('category amount').lean(),
  ]);
  return { range: { key: range.key, from: D.pktDateKey(range.from), to: D.pktDateKey(new Date(range.to.getTime() - 1)) }, ...R.summarize({ orders, refunds, items, expenses, hideProfit: hide }) };
}

const shape = (e) => ({ _id: e._id, category: e.category, amount: e.amount, date: D.pktDateKey(new Date(e.date)), description: e.description || '' });
function expenseFilter(q) {
  const f = {};
  if (q.category) f.category = q.category;
  if (q.from || q.to) {
    f.date = {};
    if (q.from) f.date.$gte = R.dayStart(q.from);
    if (q.to) f.date.$lt = new Date(R.dayStart(q.to).getTime() + 24 * 3600 * 1000);
  }
  return f;
}
async function listExpenses(q, scopes) {
  needAll(scopes);
  const { page, limit, skip } = paging(q);
  const filter = expenseFilter(q);
  // Keep the paginated read small: the displayed total is an aggregate and should not
  // require loading every matching expense document into the serverless function.
  const [rows, total, sums] = await Promise.all([
    Expense.find(filter).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    Expense.countDocuments(filter),
    Expense.aggregate([{ $match: filter }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
  ]);
  return { expenses: rows.map(shape), total: Number(sums[0]?.total || 0), pagination: pageMeta(total, page, limit) };
}
async function createExpense(ctx, body, scopes) {
  needAll(scopes);
  const e = await Expense.create({ category: body.category, amount: body.amount, date: R.dayStart(body.date), description: body.description || '', createdBy: ctx.user._id });
  await audit(ctx, { action: 'expense.created', module: 'expenses', recordId: e._id, newValue: shape(e.toObject()) });
  return { expense: shape(e.toObject()) };
}
async function findExpense(id) {
  if (!ID.test(String(id))) throw E.notFound('Expense not found.');
  const e = await Expense.findById(id).lean();
  if (!e) throw E.notFound('Expense not found.');
  return e;
}
async function updateExpense(ctx, id, body, scopes) {
  needAll(scopes);
  const before = await findExpense(id);
  const set = {};
  for (const k of ['category', 'amount', 'description']) if (body[k] !== undefined) set[k] = body[k];
  if (body.date !== undefined) set.date = R.dayStart(body.date);
  const after = await Expense.findByIdAndUpdate(id, { $set: set }, { new: true, runValidators: true }).lean();
  await audit(ctx, { action: 'expense.updated', module: 'expenses', recordId: id, oldValue: shape(before), newValue: shape(after) });
  return { expense: shape(after) };
}
async function deleteExpense(ctx, id, scopes) {
  needAll(scopes);
  const before = await findExpense(id);
  await Expense.deleteOne({ _id: id });
  await audit(ctx, { action: 'expense.deleted', module: 'expenses', recordId: id, oldValue: shape(before) });
  return {};
}
module.exports = { summary, listExpenses, createExpense, updateExpense, deleteExpense };
