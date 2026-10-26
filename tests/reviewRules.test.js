const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../services/reviewRules');

test('reviews: only Approved and Featured are public; staff can never move a review back to Pending', () => {
  assert.deepEqual(['Pending', 'Approved', 'Rejected', 'Featured'].map(R.isPublic), [false, true, false, true]);
  assert.equal(R.canModerate('Pending', 'Approved'), true); assert.equal(R.canModerate('Pending', 'Rejected'), true);
  assert.equal(R.canModerate('Approved', 'Featured'), true); assert.equal(R.canModerate('Rejected', 'Approved'), true);
  assert.equal(R.canModerate('Approved', 'Approved'), false, 'same status is not a move');
  assert.equal(R.canModerate('Approved', 'Pending'), false); assert.equal(R.canModerate('Pending', 'Gold'), false); assert.equal(R.canModerate('Weird', 'Approved'), false);
  assert.equal(R.statusAfterEdit('Approved'), 'Pending', 'an edited review needs approval again');
});

test('reviews: rating summary (average to 1 decimal, count, 1-5 breakdown) ignores junk ratings', () => {
  assert.deepEqual(R.summarize([]), { avg: 0, count: 0, breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  const s = R.summarize([{ rating: 5 }, { rating: 4 }, { rating: 4 }, { rating: 0 }, { rating: 9 }, { rating: 'x' }]);
  assert.deepEqual([s.avg, s.count, s.breakdown[5], s.breakdown[4]], [4.3, 3, 1, 2]);
});

test('reviews: shoppers only see a short name, never ids / status / phone', () => {
  assert.equal(R.displayName('Ayesha Khan'), 'Ayesha K.'); assert.equal(R.displayName('  ayesha  bibi  khan '), 'ayesha K.');
  assert.equal(R.displayName('Ayesha'), 'Ayesha'); assert.equal(R.displayName(''), 'Customer'); assert.equal(R.displayName(undefined), 'Customer');
  const pub = R.publicShape({ _id: 'r1', rating: 5, title: 'Lovely', text: 'Lasts all day', status: 'Featured', customerId: 'c1', orderId: 'o1', createdAt: 'd' }, 'Ayesha Khan');
  assert.deepEqual(Object.keys(pub).sort(), ['createdAt', 'featured', 'id', 'name', 'rating', 'text', 'title', 'verified']);
  assert.equal(pub.featured, true); assert.equal(pub.name, 'Ayesha K.');
  assert.equal(R.ownShape({ _id: 'r1', rating: 4, status: 'Pending' }).status, 'Pending');
});

test('reviews: text is cleaned (control characters, line breaks) and featured sorts first, then newest', () => {
  assert.equal(R.cleanText('  Nice\u0000 one\r\n\r\n\r\n\r\nreally '), 'Nice one\n\nreally');
  assert.equal(R.cleanText(null), '');
  const rows = [{ id: 1, status: 'Approved', createdAt: '2026-10-03' }, { id: 2, status: 'Featured', createdAt: '2026-10-01' }, { id: 3, status: 'Approved', createdAt: '2026-10-05' }];
  assert.deepEqual(R.sortPublic(rows).map((r) => r.id), [2, 3, 1]);
});
