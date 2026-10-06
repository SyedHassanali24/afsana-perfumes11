// The ONLY place that knows both the orders API shape and the Admin Orders UI shape.
// Everything here is pure (no React, no fetch) so tests/orders.test.js can run it.
//
// Field-level security: the server may REMOVE customer.phone, shippingAddress (whole), internalNotes,
// payments and items.costPrice from responses. A missing field therefore means "hidden", never an error.

export const money = (n) => (n === undefined || n === null ? '—' : `PKR ${Number(n).toLocaleString('en-PK')}`);
export const when = (d) => {
  const t = d ? new Date(d) : null;
  return t && !Number.isNaN(t.getTime()) ? t.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
};

// Copies of database/constants.js. tests/orders.test.js fails if they ever drift apart.
export const ORDER_STATUSES = ['New', 'Confirmed', 'Processing', 'Packed', 'Shipped', 'Out For Delivery', 'Delivered', 'Cancelled', 'Return Requested', 'Returned', 'Refunded'];
export const PAYMENT_STATUSES = ['Pending', 'Paid', 'Failed', 'Refunded', 'Partially Refunded'];

// Copy of orderService.TRANSITIONS (the API does not expose it). The server re-checks every change; this only decides
// which buttons to show. tests/orders.test.js fails if it drifts from the server table.
export const TRANSITIONS = {
  New: ['Confirmed', 'Cancelled'],
  Confirmed: ['Processing', 'Packed', 'Cancelled'],
  Processing: ['Packed', 'Cancelled'],
  Packed: ['Shipped', 'Cancelled'],
  Shipped: ['Out For Delivery', 'Delivered', 'Returned'],
  'Out For Delivery': ['Delivered', 'Returned'],
  Delivered: [], 'Return Requested': [],
  Cancelled: [], Returned: [], Refunded: [],
};
export const nextStatuses = (status) => TRANSITIONS[status] || [];

// After delivery the status is driven by the Returns flow only -> the drawer links there instead of offering buttons.
export const RETURNS_FLOW_STATUSES = ['Delivered', 'Return Requested', 'Returned', 'Refunded'];
export const isReturnsFlow = (status) => RETURNS_FLOW_STATUSES.includes(status);

// PATCH /orders/admin/:id/payment only accepts these. Refunded / Partially Refunded belong to the Returns flow.
export const EDITABLE_PAYMENT_STATUSES = ['Pending', 'Paid', 'Failed'];
export const canEditPayment = (paymentStatus) => EDITABLE_PAYMENT_STATUSES.includes(paymentStatus);

export const PAYMENT_TONE = { Pending: 'warning', Paid: 'success', Failed: 'danger', Refunded: 'danger', 'Partially Refunded': 'warning' };
export const METHOD_LABEL = { COD: 'Cash on Delivery', BANK_TRANSFER: 'Bank Transfer' };

// GET /orders/admin/list item -> table row
export const toRow = (o) => ({
  id: o._id,
  orderNumber: o.orderNumber,
  customerName: o.customer?.name || '—',
  city: o.shippingAddress?.city || '', // '' when the address is hidden from this role
  total: o.total,
  paymentMethod: o.paymentMethod,
  paymentStatus: o.paymentStatus,
  status: o.status,
  createdAt: o.createdAt,
});

// GET /orders/admin/:id -> { order } -> drawer model
export const toDetail = (o) => {
  const c = o.customer || {};
  const a = o.shippingAddress || null; // null = hidden (or never stored)
  const items = (o.items || []).map((i, idx) => ({
    key: i._id || idx,
    name: i.name || '—',
    sku: i.sku || '',
    sizeMl: i.sizeMl ?? null,
    quantity: i.quantity ?? 0,
    unitPrice: i.unitPrice ?? 0,
    lineTotal: i.lineTotal ?? (i.unitPrice ?? 0) * (i.quantity ?? 0),
    costPrice: i.costPrice ?? null, // null = hidden
  }));
  const payments = Array.isArray(o.payments) ? o.payments : null; // null = hidden
  const latestRef = payments ? ([...payments].reverse().find((p) => p.reference) || {}).reference || '' : '';
  return {
    id: o._id,
    orderNumber: o.orderNumber,
    status: o.status,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    methodLabel: METHOD_LABEL[o.paymentMethod] || o.paymentMethod || '—',
    createdAt: o.createdAt,
    customer: { name: c.name || '—', phone: c.phone || a?.phone || '', email: c.email || '' },
    address: a && {
      fullName: a.fullName || '',
      lines: [a.line1, a.line2].filter(Boolean),
      cityLine: [a.city, a.postalCode].filter(Boolean).join(' '),
    },
    subtotal: o.subtotal ?? null,
    shipping: o.shipping ?? 0,
    discount: o.discount ?? 0,
    total: o.total ?? null,
    couponCode: o.couponCode || '',
    cancelledReason: o.cancelledReason || '',
    items,
    timeline: (o.timeline || []).map((t) => ({ event: t.event, at: when(t.at), note: t.note || '', done: true })),
    notes: Array.isArray(o.internalNotes)
      ? [...o.internalNotes].sort((x, y) => new Date(y.at || 0) - new Date(x.at || 0)).map((n, idx) => ({ key: n._id || idx, text: n.text, at: when(n.at) }))
      : null, // null = hidden
    payments: payments && payments.map((p) => ({ status: p.status, amount: p.amount, reference: p.reference || '', at: when(p.receivedAt) })),
    paymentReference: latestRef,
  };
};
