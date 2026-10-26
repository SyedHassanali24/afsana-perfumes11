const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../services/customerRules');

test('customers: search skips phone for roles that may not see phone; special characters are escaped', () => {
  assert.deepEqual(R.searchFields(new Set()), ['name', 'email', 'phone']);
  assert.deepEqual(R.searchFields(new Set(['customer.phone'])), ['name', 'email']);
  const parts = R.filterParts({ q: 'a.b(', segment: 'VIP' }, new Set());
  assert.equal(parts.length, 2);
  const re = parts[0].$or[0].name;
  assert.equal(re.test('A.B('), true); assert.equal(re.test('axb('), false, 'dot is not a wildcard');
  assert.deepEqual(parts[1], { segment: 'VIP' });
  assert.deepEqual(R.filterParts({ q: '  ', segment: 'Gold' }, null), [], 'blank search and unknown group add nothing');
});

test('customers: group counts always list the four groups', () => {
  assert.deepEqual(R.countsFromGroups([{ _id: 'VIP', n: 2 }, { _id: 'New', n: 3 }, { _id: null, n: 1 }]), { New: 4, Repeat: 0, VIP: 2, Inactive: 0 });
  assert.deepEqual(R.countsFromGroups([]), { New: 0, Repeat: 0, VIP: 0, Inactive: 0 });
});

test('customers: phone and addresses are REMOVED (not blanked) when the role may not see them', () => {
  const c = { _id: 'c1', name: 'Ayesha', phone: '03001111111', email: 'a@x.pk', city: 'Multan', segment: 'Repeat', notes: 'Prefers oud',
    stats: { ordersCount: 3, totalSpent: 9000 }, addresses: [{ line1: 'House 1', phone: '03001111111' }] };
  const full = R.shapeCustomer(c, new Set());
  assert.equal(full.customer.phone, '03001111111'); assert.equal(full.customer.addresses.length, 1); assert.deepEqual(full.hidden, { phone: false, address: false });
  const hid = R.shapeCustomer(c, new Set(['customer.phone', 'customer.address']));
  assert.equal('phone' in hid.customer, false); assert.equal('addresses' in hid.customer, false); assert.deepEqual(hid.hidden, { phone: true, address: true });
  assert.equal(JSON.stringify(hid).includes('03001111111'), false);
  const onlyPhone = R.shapeCustomer(c, new Set(['customer.phone']));
  assert.equal(JSON.stringify(onlyPhone).includes('03001111111'), false, 'phone inside a visible address is removed too');
  assert.equal(R.shapeCustomer({ _id: 'x', name: 'N' }, null).customer.segment, 'New', 'missing group reads as New');
});

test('customers: patch carries only notes and group', () => {
  assert.deepEqual(R.patchFrom({ segment: 'VIP' }), { segment: 'VIP' });
  assert.deepEqual(R.patchFrom({ notes: '', name: 'Hack', phone: '1' }), { notes: '' });
  assert.deepEqual(R.patchFrom({}), {});
});
