const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const load = () => import('data:text/javascript;base64,' + Buffer.from(
  fs.readFileSync(path.join(__dirname, '../src/services/mappers/dashboard.js'), 'utf8')
).toString('base64'));

test('dashboard includes MongoDB product and customer counts when role permissions allow them', async () => {
  const { toDashboard } = await load();
  const vm = toDashboard({
    catalog: { products: 12, customers: 4 },
    kpis: { todayRevenue: 5000, todayOrders: 2, monthRevenue: 9000, pendingOrders: 1, avgOrderValue: 4500 },
    revenueSeries: [],
    recentOrders: [],
    topProducts: { days: 30, items: [] },
    lowStock: { count: 0, outOfStock: 0, items: [] },
  });
  assert.equal(vm.cards.find((c) => c.key === 'products').value, '12');
  assert.equal(vm.cards.find((c) => c.key === 'customers').value, '4');
  assert.equal(vm.allHidden, false);
});

test('dashboard hides catalog counts when permissions do not allow them', async () => {
  const { toDashboard, HIDDEN } = await load();
  const vm = toDashboard({ catalog: { products: null, customers: null } });
  assert.equal(vm.cards.find((c) => c.key === 'products').value, HIDDEN);
  assert.equal(vm.cards.find((c) => c.key === 'customers').value, HIDDEN);
  assert.equal(vm.allHidden, true);
});
