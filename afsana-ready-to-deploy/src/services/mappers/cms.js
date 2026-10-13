// CMS admin (Banners / FAQs / Announcements): the ONLY place that knows the API shape and the form shape. Pure, no imports.
const PKT_OFFSET_MS = 5 * 3600 * 1000; // Pakistan time, UTC+5
export const toDateInput = (iso) => (iso ? new Date(new Date(iso).getTime() + PKT_OFFSET_MS).toISOString().slice(0, 10) : '');
export const startOfDayIso = (d) => (d ? new Date(`${d}T00:00:00+05:00`).toISOString() : null);
export const endOfDayIso = (d) => (d ? new Date(`${d}T23:59:59+05:00`).toISOString() : null);
export const STATUS_TONE = { Live: 'success', Scheduled: 'gold', Expired: 'danger', Inactive: 'danger' };

const clip = (s, n) => { const t = String(s || ''); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };
const when = (i) => (i.startsAt || i.endsAt ? `${i.startsAt ? toDateInput(i.startsAt) : '…'} → ${i.endsAt ? toDateInput(i.endsAt) : 'no end'}` : 'Always');
const blankNull = (v) => { const t = String(v == null ? '' : v).trim(); return t === '' ? null : t; };
const sortNum = (v) => (String(v).trim() === '' ? 0 : Number(v));
const datesIn = (i) => ({ startsAt: toDateInput(i.startsAt), endsAt: toDateInput(i.endsAt) });
const datesOut = (f) => ({ startsAt: startOfDayIso(f.startsAt), endsAt: endOfDayIso(f.endsAt) });

export const RESOURCE_KEYS = ['banners', 'faqs', 'announcements'];

export const SECTIONS = {
  banners: {
    key: 'banners', tab: 'Banners', module: 'banners', singular: 'banner', addLabel: 'Add banner',
    emptyMessage: 'No banners yet. Add your first one.', help: 'Big pictures for the top of the shop. Desktop 1920x700, mobile 1080x1350.',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text', maxLength: 120 },
      { key: 'subtitle', label: 'Subtitle', type: 'text', maxLength: 200 },
      { key: 'desktopImageUrl', label: 'Desktop image address', type: 'text', hint: 'Full https:// address or a path like /images/eid.jpg' },
      { key: 'desktopImageAlt', label: 'Desktop image description', type: 'text', maxLength: 150 },
      { key: 'mobileImageUrl', label: 'Mobile image address', type: 'text' },
      { key: 'mobileImageAlt', label: 'Mobile image description', type: 'text', maxLength: 150 },
      { key: 'buttonText', label: 'Button text', type: 'text', maxLength: 40, half: true },
      { key: 'buttonLink', label: 'Button link', type: 'text', hint: 'e.g. /shop', half: true },
      { key: 'startsAt', label: 'Starts on', type: 'date', hint: 'Empty = now', half: true },
      { key: 'endsAt', label: 'Ends on', type: 'date', hint: 'Empty = no end', half: true },
      { key: 'sortOrder', label: 'Order', type: 'number', hint: 'Smaller shows first', half: true },
      { key: 'isActive', label: 'Show on the shop', type: 'check' },
    ],
    emptyForm: { heading: '', subtitle: '', desktopImageUrl: '', desktopImageAlt: '', mobileImageUrl: '', mobileImageAlt: '', buttonText: '', buttonLink: '', startsAt: '', endsAt: '', sortOrder: '0', isActive: true },
    toForm: (i) => ({ heading: i.heading || '', subtitle: i.subtitle || '', desktopImageUrl: i.desktopImageUrl || '', desktopImageAlt: i.desktopImageAlt || '', mobileImageUrl: i.mobileImageUrl || '', mobileImageAlt: i.mobileImageAlt || '', buttonText: i.buttonText || '', buttonLink: i.buttonLink || '', ...datesIn(i), sortOrder: String(i.sortOrder ?? 0), isActive: !!i.isActive }),
    toPayload: (f) => ({ heading: blankNull(f.heading), subtitle: blankNull(f.subtitle), desktopImageUrl: blankNull(f.desktopImageUrl), desktopImageAlt: blankNull(f.desktopImageAlt), mobileImageUrl: blankNull(f.mobileImageUrl), mobileImageAlt: blankNull(f.mobileImageAlt), buttonText: blankNull(f.buttonText), buttonLink: blankNull(f.buttonLink), ...datesOut(f), sortOrder: sortNum(f.sortOrder), isActive: !!f.isActive }),
    toRow: (i) => ({ id: i.id, status: i.status, isActive: i.isActive, title: i.heading || '(image only)', detail: clip(i.subtitle || i.buttonLink || '', 60), when: when(i), order: i.sortOrder, raw: i }),
    columns: [{ key: 'title', header: 'Banner' }, { key: 'detail', header: 'Details' }, { key: 'when', header: 'Shown' }, { key: 'order', header: 'Order', align: 'right' }],
  },
  faqs: {
    key: 'faqs', tab: 'FAQs', module: 'faq', singular: 'question', addLabel: 'Add question',
    emptyMessage: 'No questions yet. Add your first one.', help: 'Questions shoppers ask often (shipping, returns, authenticity).',
    fields: [
      { key: 'question', label: 'Question', type: 'text', maxLength: 200 },
      { key: 'answer', label: 'Answer', type: 'textarea', maxLength: 2000 },
      { key: 'sortOrder', label: 'Order', type: 'number', hint: 'Smaller shows first', half: true },
      { key: 'isActive', label: 'Show on the shop', type: 'check' },
    ],
    emptyForm: { question: '', answer: '', sortOrder: '0', isActive: true },
    toForm: (i) => ({ question: i.question || '', answer: i.answer || '', sortOrder: String(i.sortOrder ?? 0), isActive: !!i.isActive }),
    toPayload: (f) => ({ question: String(f.question || '').trim(), answer: String(f.answer || '').trim(), sortOrder: sortNum(f.sortOrder), isActive: !!f.isActive }),
    toRow: (i) => ({ id: i.id, status: i.status, isActive: i.isActive, title: i.question, detail: clip(i.answer, 70), when: 'Always', order: i.sortOrder, raw: i }),
    columns: [{ key: 'title', header: 'Question' }, { key: 'detail', header: 'Answer' }, { key: 'order', header: 'Order', align: 'right' }],
  },
  announcements: {
    key: 'announcements', tab: 'Announcements', module: 'announcements', singular: 'announcement', addLabel: 'Add announcement',
    emptyMessage: 'No announcements yet. Add your first one.', help: 'The thin bar at the very top of the shop (e.g. "Free delivery over PKR 5,000").',
    fields: [
      { key: 'text', label: 'Text', type: 'text', maxLength: 160 },
      { key: 'link', label: 'Link (optional)', type: 'text', hint: 'e.g. /shop' },
      { key: 'startsAt', label: 'Starts on', type: 'date', hint: 'Empty = now', half: true },
      { key: 'endsAt', label: 'Ends on', type: 'date', hint: 'Empty = no end', half: true },
      { key: 'isActive', label: 'Show on the shop', type: 'check' },
    ],
    emptyForm: { text: '', link: '', startsAt: '', endsAt: '', isActive: true },
    toForm: (i) => ({ text: i.text || '', link: i.link || '', ...datesIn(i), isActive: !!i.isActive }),
    toPayload: (f) => ({ text: String(f.text || '').trim(), link: blankNull(f.link), ...datesOut(f), isActive: !!f.isActive }),
    toRow: (i) => ({ id: i.id, status: i.status, isActive: i.isActive, title: i.text, detail: i.link || '—', when: when(i), raw: i }),
    columns: [{ key: 'title', header: 'Text' }, { key: 'detail', header: 'Link' }, { key: 'when', header: 'Shown' }],
  },
};
