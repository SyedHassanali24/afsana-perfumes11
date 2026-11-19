// Delivery fee by city. Thin DB layer over the pure rules in shippingRules.js (zones = ShippingRate docs, fallback = Setting 'shipping').
// Used by the cart quote and by checkout so the shopper is charged exactly what the cart showed.
const { Setting, ShippingRate } = require('../database/models');
const { DEFAULT_SHIPPING } = require('./pricing');
const Rules = require('./shippingRules');

// Cache public shipping settings briefly within each Worker isolate. These values are
// shared across shoppers; a short TTL removes repeated DB reads while keeping admin
// changes fresh. A single in-flight load also coalesces concurrent cart quote requests.
const CONTEXT_TTL_MS = 15000;
let cachedContext = null;
let cacheExpiresAt = 0;
let loadingContext = null;

async function loadContext() {
  if (cachedContext && cacheExpiresAt > Date.now()) return cachedContext;
  if (loadingContext) return loadingContext;

  loadingContext = Promise.all([
    ShippingRate.find({ isActive: { $ne: false } }).lean(),
    Setting.findOne({ key: 'shipping' }).lean(),
  ]).then(([rates, s]) => {
    cachedContext = { rates, cfg: { ...DEFAULT_SHIPPING, ...((s && s.value) || {}) } };
    cacheExpiresAt = Date.now() + CONTEXT_TTL_MS;
    return cachedContext;
  }).finally(() => {
    loadingContext = null;
  });

  return loadingContext;
}

// -> { fee, method, zone, estDays, source: 'zone' | 'default', freeAbove, remaining }
async function deliveryFor(city, subtotal, ctx) {
  const { rates, cfg } = ctx || await loadContext();
  return Rules.deliveryQuote(rates, city, subtotal, cfg);
}

module.exports = { loadContext, deliveryFor };
