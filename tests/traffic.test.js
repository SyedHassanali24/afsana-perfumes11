const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../services/trafficRules');

test('traffic source: UTM tags identify social platforms and search', () => {
  assert.equal(T.classifySource('instagram', 'social', ''), 'instagram');
  assert.equal(T.classifySource('tiktok', 'social', ''), 'tiktok');
  assert.equal(T.classifySource('youtube', 'video', ''), 'youtube');
  assert.equal(T.classifySource('facebook', 'social', ''), 'facebook');
  assert.equal(T.classifySource('whatsapp', 'messaging', ''), 'whatsapp');
  assert.equal(T.classifySource('google', 'organic', ''), 'search');
});
test('traffic source: referrer hosts are mapped to their channel', () => {
  assert.equal(T.classifySource('', '', 'l.instagram.com'), 'instagram');
  assert.equal(T.classifySource('', '', 'vm.tiktok.com'), 'tiktok');
  assert.equal(T.classifySource('', '', 'youtu.be'), 'youtube');
  assert.equal(T.classifySource('', '', 'm.facebook.com'), 'facebook');
  assert.equal(T.classifySource('', '', 'wa.me'), 'whatsapp');
  assert.equal(T.classifySource('', '', 'www.google.com'), 'search');
  assert.equal(T.classifySource('', '', 'perfume-blog.example'), 'referral');
  assert.equal(T.classifySource('', '', ''), 'direct');
});
test('traffic source: unknown UTM campaign does not get mislabelled as direct', () => {
  assert.equal(T.classifySource('creator-partner', 'affiliate', ''), 'other');
  assert.equal(T.classifySource('creator-partner', 'social', ''), 'other_social');
});
test('traffic event stores only safe host, route path and bounded campaign fields', () => {
  const event = T.pageViewEvent({
    sessionRef: '12345678-1234-4123-8123-123456789abc',
    utmSource: 'instagram', utmMedium: 'social', utmCampaign: 'winter launch',
    referrerHost: 'https://l.instagram.com/some/path?email=private@example.com',
    path: '/account/orders/AF-2026-000123?email=private@example.com',
    landingPath: '/order-success/AF-2026-000123',
  });
  assert.equal(event.source, 'instagram');
  assert.equal(event.referrerHost, 'l.instagram.com');
  assert.equal(event.path, '/account/orders/:order');
  assert.equal(event.landingPath, '/order-success/:order');
  assert.equal(event.campaign, 'winter launch');
  assert.equal(JSON.stringify(event).includes('private@example.com'), false);
  assert.equal(T.pageViewEvent({ sessionRef: 'short', path: '/' }), null);
});
test('traffic page paths reject external paths and hide long identifiers', () => {
  assert.equal(T.safePath('https://example.com/?secret=1'), '/');
  assert.equal(T.safePath('/product/0123456789abcdef01234567'), '/product/:id');
  assert.equal(T.safePath('/shop?q=oud'), '/shop');
});
