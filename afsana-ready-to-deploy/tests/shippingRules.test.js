const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../services/shippingRules');

test('shipment creation is limited to confirmed, processing, or packed orders', () => {
  for (const status of ['Confirmed', 'Processing', 'Packed']) assert.equal(R.canCreateShipment(status), true);
  for (const status of ['New', 'Cancelled', 'Shipped', 'Delivered', 'Returned', 'Refunded']) assert.equal(R.canCreateShipment(status), false);
});

test('delivered and returned shipments are terminal', () => {
  assert.equal(R.isShipmentTerminal('Delivered'), true);
  assert.equal(R.isShipmentTerminal('Returned'), true);
  assert.equal(R.isShipmentTerminal('In Transit'), false);
});

test('tracking URL safely encodes tracking numbers and rejects unsafe templates', () => {
  assert.equal(R.trackingUrl({ trackingUrlTemplate: 'https://carrier.example/track/{trackingNumber}' }, 'PK 12/3'), 'https://carrier.example/track/PK%2012%2F3');
  assert.equal(R.trackingUrl({ trackingUrlTemplate: 'javascript:alert({trackingNumber})' }, '123'), '');
  assert.equal(R.trackingUrl({ trackingUrlTemplate: 'https://carrier.example/track' }, '123'), '');
  assert.equal(R.trackingUrl({}, '123'), '');
});


test('shipping rate matching is case-insensitive and ignores inactive zones', () => {
  const rates = [
    { isActive: false, zone: { cities: ['Karachi'] }, baseRate: 10 },
    { isActive: true, zone: { cities: ['Lahore', 'Karachi'] }, baseRate: 250, freeAbove: 5000, method: 'Standard' },
  ];
  assert.equal(R.matchShippingRate(rates, ' kArAcHi ') , rates[1]);
  assert.equal(R.matchShippingRate(rates, 'Islamabad'), null);
  assert.equal(R.matchShippingRate(rates, ''), null);
  const multi = [{ zone: { cities: ['Karachi'] }, baseRate: 400, freeAbove: 5000, method: 'Express' }, { zone: { cities: ['Karachi'] }, baseRate: 250, method: 'Standard' }];
  assert.equal(R.matchShippingRate(multi, 'Karachi', 1000), multi[1], 'choose the cheapest applicable method when no method selector exists');
  assert.equal(R.matchShippingRate(multi, 'Karachi', 5000), multi[0], 'free-threshold rates can become cheapest at this subtotal');
});

test('city shipping rates honor free-shipping thresholds and default settings', () => {
  const rate = { isActive: true, zone: { name: 'Metro', cities: ['Karachi'] }, method: 'Express', baseRate: 300, freeAbove: 4000, estDays: '1-2 days' };
  assert.deepEqual(R.shippingForCity(rate, 2000, { flatRate: 250, freeAbove: 5000 }), { fee: 300, method: 'Express', zone: 'Metro', estDays: '1-2 days', source: 'zone' });
  assert.equal(R.shippingForCity(rate, 4000, { flatRate: 250, freeAbove: 5000 }).fee, 0);
  assert.equal(R.shippingForCity(null, 2000, { flatRate: 250, freeAbove: 5000 }).fee, 250);
  assert.equal(R.shippingForCity(null, 5000, { flatRate: 250, freeAbove: 5000 }).fee, 0);
  assert.equal(R.shippingForCity(null, 1, { flatRate: 250, freeAbove: 0 }).fee, 0);
});

test('order follows its shipment: Packed order + Delivered shipment goes Shipped then Delivered', () => {
  assert.deepEqual(R.orderStepsForShipment('Packed', 'Picked Up').steps, ['Shipped']);
  assert.deepEqual(R.orderStepsForShipment('Packed', 'In Transit').steps, ['Shipped']);
  assert.deepEqual(R.orderStepsForShipment('Packed', 'Out For Delivery').steps, ['Shipped', 'Out For Delivery']);
  assert.deepEqual(R.orderStepsForShipment('Packed', 'Delivered').steps, ['Shipped', 'Delivered']);
  assert.deepEqual(R.orderStepsForShipment('Shipped', 'Delivered').steps, ['Delivered']);
  assert.deepEqual(R.orderStepsForShipment('Out For Delivery', 'Delivered').steps, ['Delivered']);
});

test('order is never moved backwards or twice', () => {
  assert.deepEqual(R.orderStepsForShipment('Shipped', 'In Transit').steps, []);
  assert.deepEqual(R.orderStepsForShipment('Out For Delivery', 'In Transit').steps, []);
  assert.deepEqual(R.orderStepsForShipment('Delivered', 'Delivered').steps, []);
  assert.deepEqual(R.orderStepsForShipment('Delivered', 'Picked Up').steps, []);
});

test('Pending and Failed shipments never change the order', () => {
  for (const st of ['Pending', 'Failed']) for (const o of ['Packed', 'Shipped', 'Confirmed']) assert.deepEqual(R.orderStepsForShipment(o, st), { steps: [], message: '' });
});

test('unpacked orders are left alone with a clear message', () => {
  for (const o of ['Confirmed', 'Processing']) {
    const r = R.orderStepsForShipment(o, 'Delivered');
    assert.deepEqual(r.steps, []);
    assert.match(r.message, /not Packed yet/);
  }
  assert.match(R.orderStepsForShipment('Cancelled', 'Delivered').message, /Cancelled/);
});

test('returned shipment returns only a parcel that actually left', () => {
  assert.deepEqual(R.orderStepsForShipment('Shipped', 'Returned').steps, ['Returned']);
  assert.deepEqual(R.orderStepsForShipment('Out For Delivery', 'Returned').steps, ['Returned']);
  assert.deepEqual(R.orderStepsForShipment('Returned', 'Returned'), { steps: [], message: '' });
  assert.deepEqual(R.orderStepsForShipment('Packed', 'Returned').steps, []);
});

test('every planned step is a legal order transition (same table as orderService)', () => {
  const T = { New: ['Confirmed', 'Cancelled'], Confirmed: ['Processing', 'Packed', 'Cancelled'], Processing: ['Packed', 'Cancelled'], Packed: ['Shipped', 'Cancelled'],
    Shipped: ['Out For Delivery', 'Delivered', 'Returned'], 'Out For Delivery': ['Delivered', 'Returned'] };
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '../services/orderService.js'), 'utf8');
  for (const k of Object.keys(T)) assert.ok(src.includes(`${k.includes(' ') ? `'${k}'` : k}: [${T[k].map((x) => `'${x}'`).join(', ')}]`), `orderService TRANSITIONS changed for ${k}`);
  for (const o of ['Packed', 'Shipped', 'Out For Delivery']) for (const sh of R.SHIPMENT_STATUSES) {
    let cur = o;
    for (const step of R.orderStepsForShipment(o, sh).steps) { assert.ok((T[cur] || []).includes(step), `${cur} -> ${step}`); cur = step; }
  }
});

test('deliveryQuote: fee by city, free-above per zone, Settings fee when the city has no zone', () => {
  const cfg = { flatRate: 250, freeAbove: 5000 };
  const rates = [
    { zone: { name: 'Karachi', cities: ['Karachi'] }, method: 'Standard', baseRate: 150, freeAbove: 3000, estDays: '1-2 days', isActive: true },
    { zone: { name: 'Punjab', cities: ['Lahore', 'Multan'] }, method: 'Standard', baseRate: 300, isActive: true },
  ];
  let d = R.deliveryQuote(rates, 'karachi ', 1000, cfg);
  assert.deepEqual([d.fee, d.zone, d.estDays, d.source, d.remaining], [150, 'Karachi', '1-2 days', 'zone', 2000]);
  assert.equal(R.deliveryQuote(rates, 'Karachi', 3000, cfg).fee, 0, 'free exactly at the zone amount');
  d = R.deliveryQuote(rates, 'Multan', 100000, cfg);
  assert.deepEqual([d.fee, d.remaining, d.freeAbove], [300, 0, null], 'a zone without a free-delivery amount is never free and shows no "add X" hint');
  d = R.deliveryQuote(rates, 'Quetta', 4000, cfg);
  assert.deepEqual([d.fee, d.source, d.remaining], [250, 'default', 1000]);
  assert.equal(R.deliveryQuote(rates, '', 6000, cfg).fee, 0, 'no city: Settings rule');
  assert.equal(R.deliveryQuote(rates, 'Quetta', 0, cfg).remaining, 0, 'empty cart shows no hint');
  assert.equal(R.deliveryQuote([{ ...rates[0], isActive: false }], 'Karachi', 1000, cfg).fee, 250, 'switched-off zone falls back to Settings');
  assert.equal(R.deliveryQuote([], 'Quetta', 1, { flatRate: 250, freeAbove: 0 }).fee, 0, 'Settings freeAbove 0 = always free');
});
