const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path');

// src/services/mappers/orders.js is ESM (Vite); load it as a data: module so this runs in the CJS test setup.
const load = () => import('data:text/javascript;base64,' + Buffer.from(fs.readFileSync(path.join(__dirname, '../src/services/mappers/orders.js'), 'utf8')).toString('base64'));

// orderService.js needs mongoose (not installed in the sandbox), so read its TRANSITIONS block from the source text.
const serverTransitions = () => {
  const src = fs.readFileSync(path.join(__dirname, '../services/orderService.js'), 'utf8');
  const m = src.match(/const TRANSITIONS = (\{[\s\S]*?\n\});/);
  assert.ok(m, 'could not find TRANSITIONS in services/orderService.js');
  return new Function(`return ${m[1]};`)();
};

test('UI status table matches the server TRANSITIONS table exactly', async () => {
  const M = await load();
  assert.deepEqual(M.TRANSITIONS, serverTransitions());
});

test('UI status / payment lists match database/constants.js', async () => {
  const M = await load(); const C = require('../database/constants');
  assert.deepEqual(M.ORDER_STATUSES, C.ORDER_STATUSES);
  assert.deepEqual(M.PAYMENT_STATUSES, C.PAYMENT_STATUSES);
});

test('after Delivered there are no manual next statuses; returns link is shown instead', async () => {
  const M = await load();
  for (const s of ['Delivered', 'Return Requested', 'Returned', 'Refunded', 'Cancelled']) assert.deepEqual(M.nextStatuses(s), [], s);
  for (const s of ['Delivered', 'Return Requested', 'Returned', 'Refunded']) assert.equal(M.isReturnsFlow(s), true, s);
  assert.equal(M.isReturnsFlow('Shipped'), false);
  assert.equal(M.isReturnsFlow('Cancelled'), false);
  assert.deepEqual(M.nextStatuses('New'), ['Confirmed', 'Cancelled']);
  assert.deepEqual(M.nextStatuses('nonsense'), []);
});

test('payment can only be edited to Pending/Paid/Failed, and not once refunded', async () => {
  const M = await load();
  assert.equal(M.canEditPayment('Pending'), true);
  assert.equal(M.canEditPayment('Refunded'), false);
  assert.equal(M.canEditPayment('Partially Refunded'), false);
});

test('list row: _id becomes id, and redacted phone/address do not crash', async () => {
  const M = await load();
  const full = M.toRow({ _id: 'o1', orderNumber: 'AFS-000001', customer: { name: 'Sana', phone: '0300' }, shippingAddress: { city: 'Lahore' }, total: 6650, paymentMethod: 'COD', paymentStatus: 'Pending', status: 'New', createdAt: '2026-09-29T10:20:00Z' });
  assert.equal(full.id, 'o1'); assert.equal(full.city, 'Lahore'); assert.equal(full.customerName, 'Sana');
  const hidden = M.toRow({ _id: 'o2', orderNumber: 'AFS-000002', customer: { name: 'Bilal' }, total: 10, status: 'New' });
  assert.equal(hidden.city, '');
  assert.equal(M.toRow({ _id: 'o3' }).customerName, '—');
});

const apiOrder = {
  _id: 'o1', orderNumber: 'AFS-000001', status: 'Shipped', paymentStatus: 'Pending', paymentMethod: 'BANK_TRANSFER',
  customer: { name: 'Sana', phone: '03001234567', email: 's@x.com' },
  shippingAddress: { fullName: 'Sana Malik', phone: '0311', line1: 'House 12', line2: 'DHA', city: 'Lahore', postalCode: '54000' },
  subtotal: 6400, shipping: 250, discount: 0, total: 6650, couponCode: '',
  items: [{ _id: 'i1', name: 'Oud Rihan 50ml', sku: 'S-50', sizeMl: 50, quantity: 1, unitPrice: 6400, lineTotal: 6400, costPrice: 3000 }],
  timeline: [{ event: 'Order Placed', status: 'New', at: '2026-09-27T09:02:00Z' }, { event: 'Order Shipped', status: 'Shipped', note: 'TCS', at: '2026-09-29T10:20:00Z' }],
  internalNotes: [{ _id: 'n1', text: 'old', at: '2026-09-27T10:00:00Z' }, { _id: 'n2', text: 'new', at: '2026-09-28T10:00:00Z' }],
  payments: [{ status: 'Pending', amount: 6650, reference: '' }, { status: 'Pending', amount: 6650, reference: 'TXN-1' }],
};

test('detail: full response maps to the drawer model', async () => {
  const M = await load();
  const d = M.toDetail(apiOrder);
  assert.equal(d.id, 'o1'); assert.equal(d.methodLabel, 'Bank Transfer');
  assert.deepEqual(d.address.lines, ['House 12', 'DHA']); assert.equal(d.address.cityLine, 'Lahore 54000');
  assert.equal(d.items[0].costPrice, 3000);
  assert.equal(d.timeline.length, 2); assert.equal(d.timeline[1].note, 'TCS');
  assert.deepEqual(d.notes.map((n) => n.text), ['new', 'old'], 'newest note first');
  assert.equal(d.paymentReference, 'TXN-1');
});

test('detail: everything the server can redact is tolerated', async () => {
  const M = await load();
  const { shippingAddress, internalNotes, payments, ...rest } = apiOrder;
  const red = { ...rest, customer: { name: 'Sana' }, items: [{ _id: 'i1', name: 'Oud', quantity: 2, unitPrice: 100 }] };
  const d = M.toDetail(red);
  assert.equal(d.address, null); assert.equal(d.notes, null); assert.equal(d.payments, null);
  assert.equal(d.customer.phone, ''); assert.equal(d.items[0].costPrice, null);
  assert.equal(d.items[0].lineTotal, 200, 'falls back to unitPrice x quantity');
  assert.equal(d.paymentReference, '');
  assert.doesNotThrow(() => M.toDetail({ _id: 'x' }), 'a nearly empty order does not crash');
});
