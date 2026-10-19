const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path');

// the orders mapper is ESM (Vite); load it as a data: module so it runs in the CJS test setup
const load = () => import('data:text/javascript;base64,' + Buffer.from(fs.readFileSync(path.join(__dirname, '../src/services/mappers/orders.js'), 'utf8')).toString('base64'));

test('order drawer mapper: shipment passes through, and is null when the order has none', async () => {
  const { toDetail } = await load();
  const base = { _id: 'o1', orderNumber: 'AFS-1', status: 'Packed', items: [], timeline: [] };
  assert.equal(toDetail(base).shipment, null);
  const shipment = { _id: 's1', courier: 'TCS', status: 'Pending', trackingNumber: 'T1', trackingUrl: 'https://track.tcs.pk/T1', terminal: false, events: [] };
  assert.deepEqual(toDetail({ ...base, shipment }).shipment, shipment);
});
