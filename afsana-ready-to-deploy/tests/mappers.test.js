const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path');

// src/services/mappers/products.js is ESM (Vite); load it as a data: module so this runs in the CJS test setup.
const load = () => import('data:text/javascript;base64,' + Buffer.from(fs.readFileSync(path.join(__dirname, '../src/services/mappers/products.js'), 'utf8')).toString('base64'));

const apiProduct = {
  name: 'Royal Oud', sku: 'AFS-ROYAL-OUD', categoryId: 'c1', brandId: 'b1', status: 'Active',
  content: { shortDescription: 'Old', fullDescription: 'Long text that the form does not edit' },
  fragrance: { familyId: 'f1', gender: 'Men', concentration: 'EDP', longevity: '8h', seasons: ['Winter'] },
  notes: { top: ['Saffron'], heart: ['Oud'], base: ['Amber', 'Musk'] }, collectionIds: ['k1'],
  media: [{ url: 'https://x/b.jpg', alt: 'b', kind: 'gallery', sortOrder: 1 }, { url: 'https://x/a.jpg', alt: 'a', kind: 'main', sortOrder: 0 }],
};
const apiVariants = [{ _id: 'v1', label: '50ml', sizeMl: 50, sku: 'S-50', price: 3500, salePrice: 0, stock: { current: 25, reserved: 2 } }];

test('product PATCH keeps fields the form does not edit (server replaces nested objects wholesale)', async () => {
  const M = await load();
  const f = M.toForm({ product: apiProduct, variants: apiVariants });
  assert.equal(f.values.notesBase, 'Amber, Musk');
  assert.deepEqual(f.values.images.map((i) => i.url), ['https://x/a.jpg', 'https://x/b.jpg'], 'sorted by sortOrder');
  const edited = { ...f.values, shortDescription: 'New', gender: '', notesTop: 'Saffron, Cardamom' };
  const p = M.toPatchPayload(edited, f.base);
  assert.equal(p.content.fullDescription, 'Long text that the form does not edit');
  assert.equal(p.content.shortDescription, 'New');
  assert.equal(p.fragrance.longevity, '8h', 'untouched fragrance fields survive');
  assert.deepEqual(p.fragrance.seasons, ['Winter']);
  assert.equal('gender' in p.fragrance, false, 'clearing the dropdown removes it');
  assert.deepEqual(p.notes.top, ['Saffron', 'Cardamom']);
  assert.deepEqual(p.media.map((m) => [m.kind, m.sortOrder]), [['main', 0], ['gallery', 1]]);
});

test('product create payload', async () => {
  const M = await load();
  const p = M.toCreatePayload({ ...M.EMPTY_FORM, name: ' Velvet Rose ', sku: 'AFS-VR', categoryId: 'c2', price: '2900', salePrice: '', stock: '10', sizeMl: '50', images: [{ url: ' https://x/1.jpg ', alt: '', kind: 'gallery' }, { url: '  ', alt: '', kind: 'gallery' }] });
  assert.equal(p.name, 'Velvet Rose');
  assert.equal(p.variants[0].sku, 'AFS-VR-50');
  assert.equal('salePrice' in p.variants[0], false);
  assert.equal(p.variants[0].stock, 10);
  assert.equal(p.media.length, 1);
  assert.equal(p.media[0].kind, 'main');
  assert.equal('brandId' in p, false);
});

test('changedVariants detects price edits only', async () => {
  const M = await load();
  const vs = M.toForm({ product: apiProduct, variants: apiVariants }).variants;
  assert.equal(M.changedVariants(vs).length, 0);
  assert.equal(M.changedVariants([{ ...vs[0], price: '3600' }]).length, 1);
  assert.equal(M.changedVariants([{ ...vs[0], salePrice: '3000' }]).length, 1);
});

test('image address validation and API error mapping', async () => {
  const M = await load();
  assert.equal(M.badImage([{ url: 'https://ok.com/a.jpg' }, { url: 'ftp://nope' }]), 1);
  assert.equal(M.badImage([{ url: '' }]), -1);
  assert.deepEqual(M.fieldErrors({ details: [{ path: 'variants.0.price', message: 'bad' }, { path: 'media.2.url', message: 'x' }] }), { price: 'bad', media: 'x' });
});
