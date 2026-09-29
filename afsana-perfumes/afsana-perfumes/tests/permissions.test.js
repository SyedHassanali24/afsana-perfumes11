// Run: node --test tests/permissions.test.js
const test = require('node:test'); const assert = require('node:assert');
const fs = require('node:fs'); const path = require('node:path');

test('can()', async () => {
  // src/auth/permissions.js is ESM (Vite); load it as a data: module so this works in a CJS repo.
  const code = fs.readFileSync(path.join(__dirname, '../src/auth/permissions.js'), 'utf8');
  const { can, fieldHidden } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
  assert.equal(can(null, 'products.view'), false);
  assert.equal(can({ unrestricted: true, modules: {} }, 'anything.delete'), true);
  const p = { unrestricted: false, modules: { products: ['view'] }, deniedFields: ['product.costPrice'] };
  assert.equal(can(p, 'products.view'), true);
  assert.equal(can(p, 'products.delete'), false);
  assert.equal(can(p, 'orders.view'), false);
  assert.equal(can(p, undefined), true);
  assert.equal(fieldHidden(p, 'product.costPrice'), true);
});
