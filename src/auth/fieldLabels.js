export const FIELD_LABELS = {
  'customer.phone': 'Customer phone numbers',
  'customer.address': 'Customer addresses',
  'order.paymentDetails': 'Order payment details',
  'product.costPrice': 'Product cost price',
  'order.profit': 'Order profit',
  'order.internalNotes': 'Order internal notes',
};
// "purchaseOrders" -> "Purchase orders", "managePrice" -> "Manage price"
export const human = (k) => { const t = String(k).replace(/([A-Z])/g, ' $1').toLowerCase(); return t.charAt(0).toUpperCase() + t.slice(1); };
export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
