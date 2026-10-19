// Delivery fee by city. Thin DB layer over the pure rules in shippingRules.js (zones = ShippingRate docs, fallback = Setting 'shipping').
// Used by the cart quote and by checkout so the shopper is charged exactly what the cart showed.
const { Setting, ShippingRate } = require('../database/models');
const { DEFAULT_SHIPPING } = require('./pricing');
const Rules = require('./shippingRules');

// Loads the active zones + the Settings fee once. Call it once per request and reuse the result.
async function loadContext() {
  const [rates, s] = await Promise.all([
    ShippingRate.find({ isActive: { $ne: false } }).lean(),
    Setting.findOne({ key: 'shipping' }).lean(),
  ]);
  return { rates, cfg: { ...DEFAULT_SHIPPING, ...((s && s.value) || {}) } };
}

// -> { fee, method, zone, estDays, source: 'zone' | 'default', freeAbove, remaining }
async function deliveryFor(city, subtotal, ctx) {
  const { rates, cfg } = ctx || await loadContext();
  return Rules.deliveryQuote(rates, city, subtotal, cfg);
}

module.exports = { loadContext, deliveryFor };
