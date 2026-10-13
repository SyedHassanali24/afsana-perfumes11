export const money = (n) => `PKR ${Number(n || 0).toLocaleString('en-PK')}`;
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
export const PAYMENT_LABEL = { COD: 'Cash on Delivery', BANK_TRANSFER: 'Bank Transfer' };
// PLACEHOLDER text: replace with the shop's real bank-transfer instructions (later this will come from Settings).
export const BANK_NOTE = 'Our team will contact you after you place the order with the bank details to send payment to.';

// Normalises a product coming from the list API ({id, image}) or the detail API's `related` ({_id, media}) into one card shape.
export const cardOf = (p) => ({
  id: String(p.id || p._id), slug: p.slug, name: p.name, priceFrom: p.priceFrom, inStock: p.inStock,
  gender: p.gender || (p.fragrance && p.fragrance.gender),
  image: p.image || (p.media || []).find((m) => m.kind === 'main') || (p.media || [])[0] || null,
});
