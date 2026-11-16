const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyTrafficSource, normalizeAttribution } = require('../services/trafficAttribution');

test('classifies the requested social traffic sources from UTM tags or referrer hosts', () => {
  assert.equal(classifyTrafficSource('social', 'www.tiktok.com'), 'TikTok');
  assert.equal(classifyTrafficSource('', 'l.instagram.com'), 'Instagram');
  assert.equal(classifyTrafficSource('youtube', ''), 'YouTube');
  assert.equal(classifyTrafficSource('', 'm.facebook.com'), 'Facebook');
  assert.equal(classifyTrafficSource('whatsapp', ''), 'WhatsApp');
});

test('classifies search, referral and direct visits', () => {
  assert.equal(classifyTrafficSource('', 'www.google.com'), 'Search');
  assert.equal(classifyTrafficSource('', 'partner.example'), 'Referral');
  assert.equal(classifyTrafficSource('', ''), 'Direct');
});

test('normalizes campaign metadata and strips query strings from stored paths', () => {
  const value = normalizeAttribution({
    utmSource: 'instagram', utmMedium: 'social', utmCampaign: 'winter launch',
    referrerHost: 'L.INSTAGRAM.COM', landingPath: '/shop?email=private@example.com',
    path: '/product/oud?token=secret', affiliateCode: 'afs-01',
  });
  assert.deepEqual(value, {
    source: 'Instagram', medium: 'social', campaign: 'winter launch',
    referrerHost: 'l.instagram.com', landingPath: '/shop',
    path: '/product/oud', affiliateCode: 'AFS-01',
  });
});


test('classifies email marketing and additional social platforms', () => {
  assert.equal(classifyTrafficSource('email', ''), 'Email');
  assert.equal(classifyTrafficSource('', 'mail.google.com'), 'Email');
  assert.equal(classifyTrafficSource('', 'www.pinterest.com'), 'Other Social');
  assert.equal(classifyTrafficSource('', 'www.linkedin.com'), 'Other Social');
});
