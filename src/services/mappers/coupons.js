// The ONLY place that knows both the Coupons API shape and the admin form shape. Pure, no imports (tests load it as a data: module).
export const TYPE_OPTIONS = [
  { value: 'percentage', label: 'Percentage off' },
  { value: 'fixed', label: 'Fixed amount off' },
  { value: 'free_shipping', label: 'Free shipping' },
];
export const STATUS_OPTIONS = ['Active', 'Scheduled', 'Expired', 'Used up', 'Inactive'];
export const STATUS_TONE = { Active: 'success', Scheduled: 'gold', Expired: 'danger', 'Used up': 'warning', Inactive: 'danger' };

const money = (n) => `PKR ${Number(n || 0).toLocaleString('en-PK')}`;
const PKT_OFFSET_MS = 5 * 3600 * 1000; // Pakistan time, UTC+5, no daylight saving

// "10% off (max PKR 500)" / "PKR 300 off" / "Free shipping"
export const describeValue = (c) => {
  if (c.type === 'percentage') return `${c.value}% off${c.maxDiscount ? ` (max ${money(c.maxDiscount)})` : ''}`;
  if (c.type === 'fixed') return `${money(c.value)} off`;
  return 'Free shipping';
};

export const describeUsage = (c) => `${c.usedCount || 0}${c.usageLimit ? ` / ${c.usageLimit}` : ''}`;

// ISO date -> 'YYYY-MM-DD' in Pakistan time (for <input type="date">); '' when empty
export const toDateInput = (iso) => (iso ? new Date(new Date(iso).getTime() + PKT_OFFSET_MS).toISOString().slice(0, 10) : '');
// 'YYYY-MM-DD' -> start / end of that Pakistan day as ISO; null when empty
export const startOfDayIso = (d) => (d ? new Date(`${d}T00:00:00+05:00`).toISOString() : null);
export const endOfDayIso = (d) => (d ? new Date(`${d}T23:59:59+05:00`).toISOString() : null);

// GET /coupons/admin item -> table row
export const toRow = (c) => ({
  id: c.id, code: c.code, status: c.status, isActive: c.isActive,
  discount: describeValue(c), minOrder: c.minOrder ? money(c.minOrder) : '—', usage: describeUsage(c),
  validity: c.startsAt || c.expiresAt ? `${c.startsAt ? toDateInput(c.startsAt) : '…'} → ${c.expiresAt ? toDateInput(c.expiresAt) : 'no expiry'}` : 'Always',
  usedCount: c.usedCount || 0, raw: c,
});

export const EMPTY_FORM = {
  code: '', type: 'percentage', value: '', minOrder: '', maxDiscount: '', usageLimit: '', perCustomerLimit: '1',
  startsAt: '', expiresAt: '', firstOrderOnly: false, isActive: true,
};

// API coupon -> form values (all strings, so inputs stay controlled)
export const toForm = (c) => ({
  code: c.code || '', type: c.type, value: c.type === 'free_shipping' ? '' : String(c.value ?? ''),
  minOrder: c.minOrder ? String(c.minOrder) : '', maxDiscount: c.maxDiscount ? String(c.maxDiscount) : '',
  usageLimit: c.usageLimit ? String(c.usageLimit) : '', perCustomerLimit: String(c.perCustomerLimit ?? 1),
  startsAt: toDateInput(c.startsAt), expiresAt: toDateInput(c.expiresAt),
  firstOrderOnly: !!c.firstOrderOnly, isActive: !!c.isActive,
});

// form values -> POST/PATCH body. Blank optional fields are sent as null so a PATCH clears them.
export const toPayload = (f) => ({
  code: f.code.trim().toUpperCase(), type: f.type,
  value: f.type === 'free_shipping' ? 0 : Number(f.value || 0),
  minOrder: Number(f.minOrder || 0),
  maxDiscount: f.type === 'percentage' && f.maxDiscount !== '' ? Number(f.maxDiscount) : null,
  usageLimit: f.usageLimit !== '' ? Number(f.usageLimit) : null,
  perCustomerLimit: f.perCustomerLimit !== '' ? Number(f.perCustomerLimit) : 1,
  startsAt: startOfDayIso(f.startsAt), expiresAt: endOfDayIso(f.expiresAt),
  firstOrderOnly: !!f.firstOrderOnly, isActive: !!f.isActive,
});
