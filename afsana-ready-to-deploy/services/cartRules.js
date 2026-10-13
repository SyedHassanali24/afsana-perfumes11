// Pure cart helpers (no DB). The server is the source of truth for prices: the client only ever sends { variantId, quantity }.
const { calcShipping, DEFAULT_SHIPPING } = require('./pricing');

const MAX_QTY = 20;
const MAX_LINES = 30;
const clampQty = (n) => Math.min(MAX_QTY, Math.max(1, Math.floor(Number(n) || 1)));

// Merge any number of item lists; same variant => quantities add up (capped). Order = first appearance.
function mergeItems(...lists) {
  const m = new Map();
  for (const list of lists) {
    for (const it of list || []) {
      const id = it && it.variantId ? String(it.variantId) : '';
      if (!id) continue;
      m.set(id, clampQty((m.get(id) || 0) + clampQty(it.quantity)));
    }
  }
  return [...m].slice(0, MAX_LINES).map(([variantId, quantity]) => ({ variantId, quantity }));
}

// available = units on the shelf that are not reserved.
function lineStatus({ found, available, quantity }) {
  if (!found) return 'unavailable';
  if (available <= 0) return 'out_of_stock';
  return quantity > available ? 'limited' : 'ok';
}
const counts = (s) => s === 'ok' || s === 'limited';

// lines: [{ status, lineTotal, quantity }]  ->  totals. Only lines that exist and have some stock are priced.
function summarize(lines, shipCfg = DEFAULT_SHIPPING, { discount = 0, shippingDiscount = 0 } = {}) {
  const subtotal = lines.filter((l) => counts(l.status)).reduce((s, l) => s + l.lineTotal, 0);
  const shippingFee = subtotal > 0 ? calcShipping(subtotal, shipCfg) : 0;
  const shipping = Math.max(0, shippingFee - shippingDiscount);
  const total = Math.max(0, subtotal - discount) + shipping;
  return {
    subtotal, discount, shipping, total, shippingFee,
    itemCount: lines.reduce((s, l) => s + l.quantity, 0),
    freeShippingRemaining: subtotal > 0 && shippingFee > 0 ? Math.max(0, shipCfg.freeAbove - subtotal) : 0,
    canCheckout: lines.length > 0 && lines.every((l) => l.status === 'ok'),
  };
}
module.exports = { MAX_QTY, MAX_LINES, clampQty, mergeItems, lineStatus, summarize };
