const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../services/affiliateRules");

test("affiliate code normalization is consistent", () => {
  assert.equal(R.normalizeCode("  afsana-ali "), "AFSANA-ALI");
  assert.equal(R.CODE_RE.test("AFSANA-ALI"), true);
  assert.equal(R.CODE_RE.test("x"), false);
});
test("partner validity checks status, time, minimum and customer usage", () => {
  const partner = { isActive: true, discountType: "none", minOrder: 1000, perCustomerLimit: 1, redemptions: [{ customerId: "c1" }] };
  assert.match(R.validatePartner(partner, { subtotal: 500 }), /Minimum order/);
  assert.match(R.validatePartner(partner, { subtotal: 1500, customerId: "c1" }), /already used/);
  assert.equal(R.validatePartner(partner, { subtotal: 1500, customerId: "c2" }), null);
  assert.match(R.validatePartner({ ...partner, isActive: false }), /not available/);
});
test("affiliate discounts are server-calculated and bounded", () => {
  assert.deepEqual(R.discountFor({ discountType: "percentage", discountValue: 20, maxDiscount: 500 }, 5000, 250), { discount: 500, shippingDiscount: 0 });
  assert.deepEqual(R.discountFor({ discountType: "fixed", discountValue: 900 }, 500, 250), { discount: 500, shippingDiscount: 0 });
  assert.deepEqual(R.discountFor({ discountType: "free_shipping" }, 5000, 250), { discount: 0, shippingDiscount: 250 });
  assert.deepEqual(R.discountFor({ discountType: "none" }, 5000, 250), { discount: 0, shippingDiscount: 0 });
});
test("commission excludes amounts beyond net merchandise and is capped", () => {
  assert.deepEqual(R.commissionFor({ commissionType: "percentage", commissionValue: 10 }, 5000), { baseAmount: 5000, amount: 500 });
  assert.deepEqual(R.commissionFor({ commissionType: "fixed", commissionValue: 900 }, 500), { baseAmount: 500, amount: 500 });
  assert.deepEqual(R.commissionFor({ commissionType: "percentage", commissionValue: 0 }, 5000), { baseAmount: 5000, amount: 0 });
});
