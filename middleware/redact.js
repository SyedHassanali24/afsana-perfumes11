// Field-level security: removes restricted fields from API output (server-side, not just hidden in UI).
const FIELD_PATHS = {
  'product.costPrice': ['costPrice', 'variants.costPrice', 'items.costPrice'],
  'order.profit': ['profit'],
  'order.internalNotes': ['internalNotes'],
  'order.paymentDetails': ['payment', 'payments'],
  'customer.phone': ['phone', 'customer.phone', 'shippingAddress.phone', 'addresses.phone'],
  'customer.address': ['shippingAddress', 'addresses'],
};
// Removes the dotted path at ANY depth, so it works for wrapped responses ({ order: {...} }, { orders: [...] }).
// Fails closed: a matching key is removed wherever it appears.
function omitPath(obj, segs) {
  if (Array.isArray(obj)) return obj.forEach((o) => omitPath(o, segs));
  if (!obj || typeof obj !== 'object') return;
  removeAt(obj, segs);
  for (const k of Object.keys(obj)) omitPath(obj[k], segs);
}
function removeAt(node, segs) {
  if (Array.isArray(node)) return node.forEach((n) => removeAt(n, segs));
  if (!node || typeof node !== 'object') return;
  if (segs.length === 1) { delete node[segs[0]]; return; }
  removeAt(node[segs[0]], segs.slice(1));
}
function redact(data, denied) {
  if (!denied || !denied.size) return data;
  const copy = JSON.parse(JSON.stringify(data));
  for (const key of denied) for (const p of FIELD_PATHS[key] || []) omitPath(copy, p.split('.'));
  return copy;
}
module.exports = { redact, FIELD_PATHS };
