// Pure purchase-order rules (unit-tested).
const TRANSITIONS = {
  Draft: ['Ordered', 'Cancelled'],
  Ordered: ['Partially Received', 'Received', 'Cancelled'],
  'Partially Received': ['Partially Received', 'Received', 'Cancelled'],
  Received: [], Cancelled: [],
};
const canTransition = (from, to) => (TRANSITIONS[from] || []).includes(to);
const remainingQty = (item) => Math.max(0, item.quantity - (item.receivedQuantity || 0));
// After a delivery: every line complete -> Received, otherwise Partially Received.
const poStatusAfterReceive = (items) => (items.every((i) => remainingQty(i) === 0) ? 'Received' : 'Partially Received');
const poTotal = (items) => items.reduce((n, i) => n + i.quantity * i.costPerUnit, 0);
module.exports = { TRANSITIONS, canTransition, remainingQty, poStatusAfterReceive, poTotal };
