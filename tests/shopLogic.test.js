const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path');
const R = require('../services/cartRules');

// ESM files in src/ are loaded as data: modules (same trick as mappers.test.js)
const load = (rel) => import('data:text/javascript;base64,' + Buffer.from(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')).toString('base64'));

test('shop cart logic: add / set / remove behave and stay within limits', async () => {
  const L = await load('src/shop/cartLogic.js');
  let items = L.addItem([], 'a', 2);
  items = L.addItem(items, 'a', 3); items = L.addItem(items, 'b');
  assert.deepEqual(items, [{ variantId: 'a', quantity: 5 }, { variantId: 'b', quantity: 1 }]);
  assert.equal(L.countItems(items), 6);
  assert.deepEqual(L.setQuantity(items, 'a', 50)[0], { variantId: 'a', quantity: 20 });
  assert.deepEqual(L.setQuantity(items, 'a', 0), [{ variantId: 'b', quantity: 1 }]);
  assert.deepEqual(L.removeItem(items, 'b'), [{ variantId: 'a', quantity: 5 }]);
});

test('shop cart logic gives the same merge result as the server rules (guest cart -> account cart)', async () => {
  const L = await load('src/shop/cartLogic.js');
  const server = [{ variantId: 'a', quantity: 18 }, { variantId: 'b', quantity: 1 }];
  const guest = [{ variantId: 'a', quantity: 5 }, { variantId: 'c', quantity: 2 }, { variantId: '', quantity: 1 }];
  assert.deepEqual(L.mergeItems(server, guest), R.mergeItems(server, guest));
  assert.deepEqual(L.mergeItems(server, guest).map((i) => i.quantity), [20, 1, 2]);
});

test('shop format: card normaliser accepts both list items and related items', async () => {
  const F = await load('src/shop/format.js');
  const a = F.cardOf({ id: '1', name: 'A', slug: 'a', priceFrom: 100, image: { url: 'u' }, inStock: true, gender: 'Men' });
  const b = F.cardOf({ _id: '2', name: 'B', slug: 'b', media: [{ kind: 'gallery', url: 'g' }, { kind: 'main', url: 'm' }], fragrance: { gender: 'Women' } });
  assert.equal(a.image.url, 'u'); assert.equal(b.id, '2'); assert.equal(b.image.url, 'm'); assert.equal(b.gender, 'Women');
  assert.equal(F.money(12500), 'PKR 12,500');
});
