const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../services/returnRules');

const items = [
  { _id: 'a1', quantity: 2, unitPrice: 4000 },
  { _id: 'b2', quantity: 1, unitPrice: 6000 },
];
const order = { status: 'Delivered', paymentStatus: 'Paid', subtotal: 14000, discount: 1400, shipping: 250, total: 12850, createdAt: '2026-09-01T00:00:00Z',
  timeline: [{ event: 'Order Placed', at: '2026-09-01T10:00:00Z' }, { event: 'Delivered', at: '2026-09-10T10:00:00Z' }] };
const ret = (status, lines) => ({ status, items: lines.map(([orderItemId, quantity]) => ({ orderItemId, quantity })) });
const day = (n) => new Date(Date.parse('2026-09-10T10:00:00Z') + n * 86400000);

test('remainingByItem: pending/approved/received/refunded use up units; rejected/cancelled give them back', () => {
  const m = R.remainingByItem(items, [ret('Pending', [['a1', 1]]), ret('Rejected', [['b2', 1]]), ret('Cancelled', [['a1', 1]])]);
  assert.equal(m.get('a1'), 1);
  assert.equal(m.get('b2'), 1);
  const all = R.remainingByItem(items, [ret('Refunded', [['a1', 2]]), ret('Approved', [['b2', 1]])]);
  assert.deepEqual([...all.values()], [0, 0]);
});

test('validateLines: rejects empty, unknown, duplicate, too many and zero quantities', () => {
  const rem = R.remainingByItem(items, []);
  assert.equal(R.validateLines([{ orderItemId: 'a1', quantity: 2 }, { orderItemId: 'b2', quantity: 1 }], rem), null);
  assert.match(R.validateLines([], rem), /at least one/);
  assert.match(R.validateLines([{ orderItemId: 'zzz', quantity: 1 }], rem), /not part of this order/);
  assert.match(R.validateLines([{ orderItemId: 'a1', quantity: 1 }, { orderItemId: 'a1', quantity: 1 }], rem), /only appear once/);
  assert.match(R.validateLines([{ orderItemId: 'a1', quantity: 3 }], rem), /at most 2/);
  assert.match(R.validateLines([{ orderItemId: 'a1', quantity: 0 }], rem), /at least 1/);
  const used = R.remainingByItem(items, [ret('Pending', [['b2', 1]])]);
  assert.match(R.validateLines([{ orderItemId: 'b2', quantity: 1 }], used), /already been returned/);
});

test('return window counts from the FIRST Delivered entry, not a later "Return Closed" one', () => {
  const o = { ...order, timeline: [...order.timeline, { event: 'Return Closed', status: 'Delivered', at: '2026-09-20T10:00:00Z' }] };
  assert.equal(R.deliveredAt(o).toISOString(), '2026-09-10T10:00:00.000Z');
  assert.equal(R.returnWindow(o, 7, day(6)).open, true);
  assert.equal(R.returnWindow(o, 7, day(8)).open, false);
  assert.equal(R.returnWindow(o, 14, day(8)).open, true);
});

test('returnability: status, payment, nothing left, window; staff may ignore the window', () => {
  const rem = R.remainingByItem(items, []);
  assert.equal(R.returnability(order, rem, { now: day(2) }).ok, true);
  assert.equal(R.returnability({ ...order, status: 'Shipped' }, rem, { now: day(2) }).code, 'NOT_DELIVERED');
  assert.equal(R.returnability({ ...order, paymentStatus: 'Pending' }, rem, { now: day(2) }).code, 'NOT_PAID');
  assert.equal(R.returnability(order, rem, { now: day(9) }).code, 'WINDOW_CLOSED');
  assert.equal(R.returnability(order, rem, { now: day(9), ignoreWindow: true }).ok, true);
  const none = R.remainingByItem(items, [ret('Refunded', [['a1', 2], ['b2', 1]])]);
  assert.equal(R.returnability({ ...order, status: 'Return Requested' }, none, { now: day(2) }).code, 'NOTHING_LEFT');
  assert.equal(R.returnability({ ...order, status: 'Return Requested', paymentStatus: 'Partially Refunded' }, rem, { now: day(2) }).ok, true);
  assert.equal(R.returnability({ ...order, status: 'Refunded' }, rem, { now: day(2) }).code, 'NOTHING_LEFT', 'a fully refunded order says so, not "not delivered"');
});

test('return status flow: Refunded only through the refund action; terminal states are final', () => {
  assert.equal(R.canTransition('Pending', 'Approved'), true);
  assert.equal(R.canTransition('Approved', 'Received'), true);
  assert.equal(R.canTransition('Pending', 'Received'), false, 'cannot receive goods that were never approved');
  assert.equal(R.canTransition('Received', 'Refunded'), false);
  assert.equal(R.canTransition('Rejected', 'Approved'), false);
  assert.equal(R.canTransition('Cancelled', 'Pending'), false);
});

test('refund value: discount is shared out in proportion; shipping only when the shop was at fault and all units are back', () => {
  const rem = R.remainingByItem(items, []);
  // 1 x 4000 -> discount share 10% = 400 -> 3600
  assert.equal(R.returnLinesValue(order, items, [{ orderItemId: 'a1', quantity: 1 }]), 3600);
  assert.equal(R.suggestedRefund(order, items, [{ orderItemId: 'a1', quantity: 1 }], 'Damaged', rem), 3600, 'partial return: no shipping yet');
  const all = [{ orderItemId: 'a1', quantity: 2 }, { orderItemId: 'b2', quantity: 1 }];
  assert.equal(R.suggestedRefund(order, items, all, 'Damaged', rem), 12850, '12600 items + 250 shipping = the full total');
  assert.equal(R.suggestedRefund(order, items, all, 'Not Satisfied', rem), 12600, 'customer changed mind: delivery fee stays');
});

test('refund cap: never more than was paid, counting earlier refunds', () => {
  assert.equal(R.refundCap(order, 0), 12850);
  assert.equal(R.refundCap(order, 3600), 9250);
  assert.equal(R.refundCap(order, 99999), 0);
  const rem = R.remainingByItem(items, []);
  assert.equal(R.suggestedRefund(order, items, [{ orderItemId: 'b2', quantity: 1 }], 'Other', rem, 12000), 850, 'suggestion is clamped to what is left');
});

test('payment status after refund', () => {
  assert.equal(R.paymentStatusAfterRefund(12850, 0, 'Paid'), 'Paid');
  assert.equal(R.paymentStatusAfterRefund(12850, 3600, 'Paid'), 'Partially Refunded');
  assert.equal(R.paymentStatusAfterRefund(12850, 12850, 'Partially Refunded'), 'Refunded');
});

test('deriveOrderStatus keeps the order in step with its returns', () => {
  const qty = 3;
  assert.equal(R.deriveOrderStatus('Delivered', qty, [ret('Pending', [['a1', 1]])]), 'Return Requested');
  assert.equal(R.deriveOrderStatus('Return Requested', qty, [ret('Rejected', [['a1', 1]])]), 'Delivered', 'declined -> back to Delivered');
  assert.equal(R.deriveOrderStatus('Return Requested', qty, [ret('Cancelled', [['a1', 1]])]), 'Delivered');
  // partial return received but not yet refunded: still open
  assert.equal(R.deriveOrderStatus('Return Requested', qty, [ret('Received', [['a1', 1]])]), 'Return Requested');
  // partial return finished: customer keeps the rest
  assert.equal(R.deriveOrderStatus('Return Requested', qty, [ret('Refunded', [['a1', 1]])]), 'Delivered');
  // everything back, refund still to do
  assert.equal(R.deriveOrderStatus('Return Requested', qty, [ret('Received', [['a1', 2], ['b2', 1]])]), 'Returned');
  // everything back and refunded
  assert.equal(R.deriveOrderStatus('Returned', qty, [ret('Refunded', [['a1', 2], ['b2', 1]])]), 'Refunded');
  // two-step full return: first refunded, second received
  assert.equal(R.deriveOrderStatus('Return Requested', qty, [ret('Refunded', [['a1', 2]]), ret('Received', [['b2', 1]])]), 'Returned');
  // orders outside the delivery flow are never touched
  assert.equal(R.deriveOrderStatus('Shipped', qty, [ret('Pending', [['a1', 1]])]), 'Shipped');
  assert.equal(R.deriveOrderStatus('Cancelled', qty, []), 'Cancelled');
});
