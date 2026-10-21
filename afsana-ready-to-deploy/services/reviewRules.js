// Pure rules for product reviews (no DB, no I/O) -> tests/reviewRules.test.js.
// Flow: a shopper who RECEIVED the perfume writes a review -> it is Pending -> staff Approve / Feature / Reject.
// Only Approved + Featured reviews are public. Editing a review sends it back to Pending (so approved text cannot be swapped later).
const STATUSES = ['Pending', 'Approved', 'Rejected', 'Featured'];
const PUBLIC = ['Approved', 'Featured'];
const MODERATION_TARGETS = ['Approved', 'Rejected', 'Featured'];

const isPublic = (status) => PUBLIC.includes(status);
// Staff may move a review to Approved / Rejected / Featured from any other state; nobody moves one back to Pending by hand.
const canModerate = (from, to) => STATUSES.includes(from) && MODERATION_TARGETS.includes(to) && from !== to;
const statusAfterEdit = () => 'Pending';

// Plain text only: strip control characters, trim, collapse 3+ line breaks.
function cleanText(s) {
  return String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
// "Ayesha Khan" -> "Ayesha K."; one name stays as is; nothing -> "Customer". Shoppers never see a full name, phone or email.
function displayName(full) {
  const parts = cleanText(full).split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Customer';
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}
// rows = [{ rating }] of the PUBLIC reviews of one product -> { avg (1 decimal, 0 when none), count, breakdown: {1..5} }
function summarize(rows) {
  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0; let count = 0;
  for (const r of rows || []) {
    const n = Math.round(Number(r.rating));
    if (n >= 1 && n <= 5) { breakdown[n] += 1; sum += n; count += 1; }
  }
  return { avg: count ? Math.round((sum / count) * 10) / 10 : 0, count, breakdown };
}
// What the public sees of one review (no ids of the shopper, no status, no order).
function publicShape(r, customerName) {
  return { id: r._id, rating: r.rating, title: r.title || '', text: r.text || '', name: displayName(customerName), featured: r.status === 'Featured', verified: true, createdAt: r.createdAt };
}
// What a shopper sees of their OWN review (includes the status so the page can say "waiting for approval").
function ownShape(r) {
  return { id: r._id, rating: r.rating, title: r.title || '', text: r.text || '', status: r.status, createdAt: r.createdAt, updatedAt: r.updatedAt };
}
// Featured first, then newest.
function sortPublic(rows) {
  return [...rows].sort((a, b) => (Number(b.status === 'Featured') - Number(a.status === 'Featured')) || (new Date(b.createdAt) - new Date(a.createdAt)));
}
module.exports = { STATUSES, PUBLIC, MODERATION_TARGETS, isPublic, canModerate, statusAfterEdit, cleanText, displayName, summarize, publicShape, ownShape, sortPublic };
