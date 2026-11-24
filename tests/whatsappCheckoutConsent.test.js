'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../validation/schemas');

const baseCheckout = {
  items: [{ variantId: '64b000000000000000000001', quantity: 1 }],
  customer: { name: 'Test Customer', phone: '03252032321', email: 'buyer@example.com' },
  shippingAddress: { line1: 'House 10, Street 2', city: 'Karachi' },
  paymentMethod: 'COD',
};

test('checkout: WhatsApp order confirmation consent defaults to false', () => {
  const parsed = S.checkoutBody.parse(baseCheckout);
  assert.equal(parsed.whatsappOrderUpdatesOptIn, false);
  assert.equal(parsed.whatsappMarketingOptIn, false);
  assert.equal(parsed.customer.phone, '+923252032321');
});

test('checkout: explicit WhatsApp order confirmation consent is preserved', () => {
  const parsed = S.checkoutBody.parse({ ...baseCheckout, whatsappOrderUpdatesOptIn: true });
  assert.equal(parsed.whatsappOrderUpdatesOptIn, true);
});

test('checkout: separate WhatsApp marketing consent is preserved', () => {
  const parsed = S.checkoutBody.parse({ ...baseCheckout, whatsappMarketingOptIn: true });
  assert.equal(parsed.whatsappMarketingOptIn, true);
  assert.equal(parsed.whatsappOrderUpdatesOptIn, false);
});

test('WhatsApp campaign: defaults the AFSANA shop link and rejects external domains', () => {
  const parsed = S.whatsappCampaignBody.parse({ name: 'Weekend offer', message: 'Save on selected scents.' });
  assert.equal(parsed.ctaUrl, 'https://afsanaperfumes.store/shop');
  assert.throws(() => S.whatsappCampaignBody.parse({
    name: 'External link', message: 'A special offer for you.', ctaUrl: 'https://example.com/offer',
  }));
});
