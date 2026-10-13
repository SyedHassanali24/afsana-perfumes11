// Pure cart helpers for the browser (no React, no storage). Mirrors services/cartRules.js on the server.
// The client only ever stores { variantId, quantity }: prices always come from POST /api/cart/quote.
export const MAX_QTY = 20;
export const MAX_LINES = 30;
export const clampQty = (n) => Math.min(MAX_QTY, Math.max(1, Math.floor(Number(n) || 1)));

export function mergeItems(...lists) {
  const m = new Map();
  for (const list of lists) for (const it of list || []) {
    const id = it && it.variantId ? String(it.variantId) : '';
    if (id) m.set(id, clampQty((m.get(id) || 0) + clampQty(it.quantity)));
  }
  return [...m].slice(0, MAX_LINES).map(([variantId, quantity]) => ({ variantId, quantity }));
}
export const addItem = (items, variantId, qty = 1) => mergeItems(items, [{ variantId, quantity: qty }]);
export const setQuantity = (items, variantId, qty) => (qty < 1 ? removeItem(items, variantId) : items.map((i) => (i.variantId === String(variantId) ? { ...i, quantity: clampQty(qty) } : i)));
export const removeItem = (items, variantId) => items.filter((i) => i.variantId !== String(variantId));
export const countItems = (items) => items.reduce((s, i) => s + i.quantity, 0);
