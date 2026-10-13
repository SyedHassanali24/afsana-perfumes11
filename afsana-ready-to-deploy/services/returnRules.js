// Pure returns & refunds rules (Phase 7). No database, no npm packages -> unit-tested in tests/returns.test.js.
// The service layer (returnService.js) loads data, calls these, and writes the result inside a transaction.

const DEFAULT_WINDOW_DAYS = 7;
const DAY_MS = 86400000;

// Return status flow. `Refunded` is reached ONLY through the refund action (never by a plain status change).
const RETURN_TRANSITIONS = {
  Pending: ['Approved', 'Rejected', 'Cancelled'],
  Approved: ['Received', 'Rejected', 'Cancelled'],
  Received: [],            // -> Refunded via issueRefund only
  Rejected: [], Refunded: [], Cancelled: [],
};
const canTransition = (from, to) => (RETURN_TRANSITIONS[from] || []).includes(to);

// Which statuses use up units of an order line (a Rejected/Cancelled return gives its units back).
const COUNTED = ['Pending', 'Approved', 'Received', 'Refunded'];
const OPEN = ['Pending', 'Approved', 'Received']; // still being handled
// Only the shop's own mistake gets the delivery fee back automatically.
const FAULT_REASONS = ['Wrong Product', 'Damaged'];

const sum = (arr, f) => arr.reduce((n, x) => n + f(x), 0);
const idOf = (v) => String(v && v._id ? v._id : v);

// { orderItemId -> units still returnable } given the order lines and every return already made on the order.
function remainingByItem(orderItems, returns) {
  const used = new Map();
  for (const r of returns || []) {
    if (!COUNTED.includes(r.status)) continue;
    for (const it of r.items || []) used.set(idOf(it.orderItemId), (used.get(idOf(it.orderItemId)) || 0) + it.quantity);
  }
  const out = new Map();
  for (const oi of orderItems) out.set(idOf(oi._id), Math.max(0, oi.quantity - (used.get(idOf(oi._id)) || 0)));
  return out;
}

// Returns an error message, or null when the requested lines are valid.
function validateLines(lines, remaining) {
  if (!Array.isArray(lines) || !lines.length) return 'Choose at least one item to return.';
  const seen = new Set();
  for (const l of lines) {
    const id = idOf(l.orderItemId);
    if (seen.has(id)) return 'Each item can only appear once. Change the quantity instead.';
    seen.add(id);
    if (!remaining.has(id)) return 'One of the selected items is not part of this order.';
    if (!Number.isInteger(l.quantity) || l.quantity < 1) return 'Quantity must be at least 1.';
    if (l.quantity > remaining.get(id)) return remaining.get(id) === 0 ? 'An item you selected has already been returned.' : `You can return at most ${remaining.get(id)} of an item.`;
  }
  return null;
}

// Delivered date = the FIRST "Delivered" timeline entry (later "Return Closed" entries must not restart the clock).
function deliveredAt(order) {
  const t = (order.timeline || []).find((e) => e.event === 'Delivered');
  if (t && t.at) return new Date(t.at);
  const last = (order.timeline || [])[(order.timeline || []).length - 1];
  return new Date((last && last.at) || order.createdAt || Date.now());
}
function returnWindow(order, windowDays = DEFAULT_WINDOW_DAYS, now = new Date()) {
  const from = deliveredAt(order);
  const deadline = new Date(from.getTime() + windowDays * DAY_MS);
  return { deliveredAt: from, deadline, windowDays, open: now <= deadline };
}

// Can a return be started on this order at all? -> { ok, code, message }
function returnability(order, remaining, { windowDays = DEFAULT_WINDOW_DAYS, now = new Date(), ignoreWindow = false } = {}) {
  if (['Returned', 'Refunded'].includes(order.status)) return { ok: false, code: 'NOTHING_LEFT', message: 'Every item on this order has already been returned.' };
  if (!['Delivered', 'Return Requested'].includes(order.status)) return { ok: false, code: 'NOT_DELIVERED', message: 'Returns can only be requested after an order has been delivered.' };
  if (!['Paid', 'Partially Refunded'].includes(order.paymentStatus)) return { ok: false, code: 'NOT_PAID', message: 'This order has no confirmed payment to return.' };
  if (![...remaining.values()].some((n) => n > 0)) return { ok: false, code: 'NOTHING_LEFT', message: 'Every item on this order has already been returned.' };
  const w = returnWindow(order, windowDays, now);
  if (!ignoreWindow && !w.open) return { ok: false, code: 'WINDOW_CLOSED', message: `The ${windowDays}-day return period for this order has ended.`, window: w };
  return { ok: true, window: w };
}

// Money ----------------------------------------------------------------------------------------------------------
const round = (n) => Math.round(n);
// Value of the returned lines after the order's discount is shared out in proportion to price.
function returnLinesValue(order, orderItems, lines) {
  const by = new Map(orderItems.map((oi) => [idOf(oi._id), oi]));
  const gross = sum(lines, (l) => (by.get(idOf(l.orderItemId)) || { unitPrice: 0 }).unitPrice * l.quantity);
  const discountShare = order.subtotal > 0 && order.discount > 0 ? round((order.discount * gross) / order.subtotal) : 0;
  return Math.max(0, gross - discountShare);
}
// Most that can still be paid back on the order (never more than the customer paid).
const refundCap = (order, alreadyRefunded = 0) => Math.max(0, (order.total || 0) - alreadyRefunded);

// Suggested amount shown to staff (they may lower it, never raise it above the cap).
function suggestedRefund(order, orderItems, lines, reason, remaining, alreadyRefunded = 0) {
  const items = returnLinesValue(order, orderItems, lines);
  const leftAfter = sum([...remaining.values()], (n) => n) - sum(lines, (l) => l.quantity);
  const shipping = FAULT_REASONS.includes(reason) && leftAfter <= 0 ? (order.shipping || 0) : 0;
  return Math.min(items + shipping, refundCap(order, alreadyRefunded));
}

// Payment status after money has gone back. `current` is kept when nothing has been refunded.
function paymentStatusAfterRefund(orderTotal, totalRefunded, current) {
  if (!(totalRefunded > 0)) return current;
  return totalRefunded >= orderTotal ? 'Refunded' : 'Partially Refunded';
}

// Order status implied by its returns. Keeps the order in step with return records so the two can never disagree.
//   Pending/Approved return exists            -> Return Requested
//   all units back and refunded               -> Refunded
//   all units back, refund still to do        -> Returned
//   returns finished but goods partly kept    -> Delivered
function deriveOrderStatus(current, orderQty, returns) {
  if (!['Delivered', 'Return Requested', 'Returned', 'Refunded'].includes(current)) return current;
  const live = (returns || []).filter((r) => COUNTED.includes(r.status));
  const inFlight = live.filter((r) => r.status !== 'Refunded');
  const back = live.filter((r) => r.status === 'Received' || r.status === 'Refunded');
  const fullyBack = orderQty > 0 && sum(back, (r) => sum(r.items || [], (i) => i.quantity)) >= orderQty;
  if (!inFlight.length) return fullyBack ? 'Refunded' : 'Delivered';
  if (fullyBack && inFlight.every((r) => r.status === 'Received')) return 'Returned';
  return 'Return Requested';
}
// What the customer sees on the order timeline for a status the flow moved the order into.
const ORDER_EVENT = { 'Return Requested': 'Return Requested', Returned: 'Return Received', Refunded: 'Refunded', Delivered: 'Return Closed' };

module.exports = {
  DEFAULT_WINDOW_DAYS, RETURN_TRANSITIONS, canTransition, COUNTED, OPEN, FAULT_REASONS,
  remainingByItem, validateLines, deliveredAt, returnWindow, returnability,
  returnLinesValue, refundCap, suggestedRefund, paymentStatusAfterRefund, deriveOrderStatus, ORDER_EVENT,
};
