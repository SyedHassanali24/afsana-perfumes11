'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeCode, validatePartner, discountFor, commissionFor, slugCode } = require('../services/affiliateRules');

test('referral codes normalize consistently and staff slugs are safe', () => {
  assert.equal(normalizeCode('  afsana-ali '), 'AFSANA-ALI');
  assert.equal(slugCode('Ayesha Khan', 'STAFF'), 'STAFF-AYESHA-KHAN');
});

test('partner discount rules respect caps and free delivery', () => {
  assert.deepEqual(discountFor({ discountType: 'percentage', discountValue: 20, maxDiscount: 500 }, 5000, 250), { discount: 500, shippingDiscount: 0 });
  assert.deepEqual(discountFor({ discountType: 'fixed', discountValue: 1200 }, 900, 250), { discount: 900, shippingDiscount: 0 });
  assert.deepEqual(discountFor({ discountType: 'free_shipping' }, 900, 250), { discount: 0, shippingDiscount: 250 });
});

test('partner validation checks availability, minimum order and customer usage', () => {
  const customerId = 'customer-1';
  const partner = { isActive: true, minOrder: 2000, usageLimit: 10, usedCount: 2, perCustomerLimit: 1, redemptions: [{ customerId }] };
  assert.match(validatePartner({ ...partner, isActive: false }, { subtotal: 2500 }), /not available/i);
  assert.match(validatePartner(partner, { subtotal: 1000 }), /minimum order/i);
  assert.match(validatePartner(partner, { subtotal: 2500, customerId }), /already used/i);
  assert.equal(validatePartner(partner, { subtotal: 2500, customerId: 'another-customer' }), null);
});

test('commission estimate is bounded by net referred merchandise', () => {
  assert.deepEqual(commissionFor({ commissionType: 'percentage', commissionValue: 12 }, 5000), { baseAmount: 5000, amount: 600 });
  assert.deepEqual(commissionFor({ commissionType: 'fixed', commissionValue: 900 }, 500), { baseAmount: 500, amount: 500 });
});
