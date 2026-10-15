// Store settings (pure, tested in tests/settings.test.js). Stored as Setting documents: key -> value.
// `shipping` and `returns` keep the exact shape that orderService / returnService already read.
const KEYS = ['store', 'bank', 'shipping', 'returns'];
const DEFAULTS = {
  store: { name: 'Afsana Perfumes', tagline: '', phone: '', whatsapp: '', email: '', address: '', instagram: '', facebook: '' },
  bank: { enabled: false, bankName: '', accountTitle: '', accountNumber: '', iban: '', branch: '', instructions: '' },
  shipping: { flatRate: 250, freeAbove: 5000 },   // freeAbove 0 = free delivery on every order
  returns: { windowDays: 7 },
};
const withDefaults = (key, value) => ({ ...DEFAULTS[key], ...(value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).filter(([k]) => k in DEFAULTS[key])) : {}) });

// All settings, filling anything missing with defaults. `docs` = [{ key, value }]
function merge(docs = []) {
  const by = new Map(docs.map((d) => [d.key, d.value]));
  return Object.fromEntries(KEYS.map((k) => [k, withDefaults(k, by.get(k))]));
}
const bankReady = (b) => Boolean(b && b.enabled && String(b.accountTitle || '').trim() && (String(b.accountNumber || '').trim() || String(b.iban || '').trim()));

// What the shop (and anyone on the internet) may see. Bank details only when switched on AND complete.
function publicView(all) {
  const b = all.bank;
  return {
    store: all.store,
    bank: bankReady(b) ? { bankName: b.bankName, accountTitle: b.accountTitle, accountNumber: b.accountNumber, iban: b.iban, branch: b.branch, instructions: b.instructions } : null,
    shipping: { flatRate: all.shipping.flatRate, freeAbove: all.shipping.freeAbove },
    returns: { windowDays: all.returns.windowDays },
  };
}
module.exports = { KEYS, DEFAULTS, withDefaults, merge, bankReady, publicView };
