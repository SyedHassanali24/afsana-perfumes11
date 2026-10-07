// Pure rules for the CMS admin (Banners, FAQs, Announcements). No DB, no npm deps -> unit-tested with `node --test`.
const RESOURCES = ['banners', 'faqs', 'announcements'];
const MODULE_OF = { banners: 'banners', faqs: 'faq', announcements: 'announcements' }; // permission module per resource
const DOC_KEYS = { // top-level fields of the Mongoose document the admin may write (a missing key is CLEARED on update)
  banners: ['desktopImage', 'mobileImage', 'heading', 'subtitle', 'buttonText', 'buttonLink', 'startsAt', 'endsAt', 'isActive', 'sortOrder'],
  faqs: ['question', 'answer', 'sortOrder', 'isActive'],
  announcements: ['text', 'link', 'startsAt', 'endsAt', 'isActive'],
};

const has = (v) => v !== undefined && v !== null && v !== '';
const str = (v) => (has(v) ? String(v).trim() : '');
const toDate = (v) => (v instanceof Date ? v : new Date(v));
const int = (v, d = 0) => (has(v) && Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : d);

// Links and image addresses: a full http(s) address or a path on this site. Blocks javascript:, data:, and "//host" tricks.
const validUrl = (u) => { const s = String(u || '').trim(); return /^https?:\/\/[^\s/$.?#][^\s]*$/i.test(s) || (/^\/[^\s/][^\s]*$/.test(s)) || s === '/'; };

function normalize(r, c) {
  const out = { isActive: c.isActive === undefined ? true : !!c.isActive };
  const put = (k) => { const v = str(c[k]); if (v) out[k] = v; };
  const dates = () => { if (has(c.startsAt)) out.startsAt = toDate(c.startsAt); if (has(c.endsAt)) out.endsAt = toDate(c.endsAt); };
  if (r === 'banners') {
    ['heading', 'subtitle', 'buttonText', 'buttonLink', 'desktopImageUrl', 'desktopImageAlt', 'mobileImageUrl', 'mobileImageAlt'].forEach(put);
    out.sortOrder = int(c.sortOrder); dates();
  } else if (r === 'faqs') {
    ['question', 'answer'].forEach(put); out.sortOrder = int(c.sortOrder);
  } else if (r === 'announcements') {
    ['text', 'link'].forEach(put); dates();
  }
  return out;
}

// -> [{ path, message }] (empty = valid). Works on the normalized, FULL record.
function crossFieldErrors(r, c) {
  const errs = []; const add = (path, message) => errs.push({ path, message });
  const dates = () => { if (has(c.startsAt) && has(c.endsAt) && !(toDate(c.endsAt) > toDate(c.startsAt))) add('endsAt', 'End must be after the start.'); };
  const url = (k, label) => { if (has(c[k]) && !validUrl(c[k])) add(k, `${label} must be a full https:// address or a path starting with /.`); };
  const max = (k, n, label) => { if (str(c[k]).length > n) add(k, `${label} can be at most ${n} characters.`); };
  if (r === 'banners') {
    if (!has(c.heading) && !has(c.desktopImageUrl)) add('heading', 'Add a heading or a desktop image.');
    max('heading', 120, 'Heading'); max('subtitle', 200, 'Subtitle'); max('buttonText', 40, 'Button text');
    url('buttonLink', 'Button link'); url('desktopImageUrl', 'Desktop image'); url('mobileImageUrl', 'Mobile image');
    if (has(c.buttonText) && !has(c.buttonLink)) add('buttonLink', 'Add a link for the button.');
    if (has(c.buttonLink) && !has(c.buttonText)) add('buttonText', 'Add the button text.');
    if (!(Number.isInteger(Number(c.sortOrder || 0)) && Number(c.sortOrder || 0) >= 0 && Number(c.sortOrder || 0) <= 9999)) add('sortOrder', 'Order must be a whole number from 0 to 9999.');
    dates();
  } else if (r === 'faqs') {
    if (str(c.question).length < 5) add('question', 'Write the question (at least 5 characters).');
    if (str(c.question).length > 200) add('question', 'The question can be at most 200 characters.');
    if (!str(c.answer)) add('answer', 'Write the answer.');
    if (str(c.answer).length > 2000) add('answer', 'The answer can be at most 2000 characters.');
  } else if (r === 'announcements') {
    if (str(c.text).length < 3) add('text', 'Write the announcement (at least 3 characters).');
    if (str(c.text).length > 160) add('text', 'The announcement can be at most 160 characters.');
    url('link', 'Link'); dates();
  } else add('resource', 'Unknown section.');
  return errs;
}

// 'Live' | 'Scheduled' | 'Expired' | 'Inactive'
function cmsStatus(r, c, now = new Date()) {
  if (!c.isActive) return 'Inactive';
  if (r === 'faqs') return 'Live';
  if (c.startsAt && toDate(c.startsAt) > now) return 'Scheduled';
  if (c.endsAt && toDate(c.endsAt) < now) return 'Expired';
  return 'Live';
}

// Mongoose document <-> flat admin record (banner images are nested in the document, flat in the API)
function fromDoc(r, d) {
  if (r === 'banners') return { heading: d.heading || '', subtitle: d.subtitle || '', buttonText: d.buttonText || '', buttonLink: d.buttonLink || '',
    desktopImageUrl: (d.desktopImage && d.desktopImage.url) || '', desktopImageAlt: (d.desktopImage && d.desktopImage.alt) || '',
    mobileImageUrl: (d.mobileImage && d.mobileImage.url) || '', mobileImageAlt: (d.mobileImage && d.mobileImage.alt) || '',
    startsAt: d.startsAt || null, endsAt: d.endsAt || null, isActive: !!d.isActive, sortOrder: d.sortOrder || 0 };
  if (r === 'faqs') return { question: d.question || '', answer: d.answer || '', sortOrder: d.sortOrder || 0, isActive: !!d.isActive };
  return { text: d.text || '', link: d.link || '', startsAt: d.startsAt || null, endsAt: d.endsAt || null, isActive: !!d.isActive };
}
function toDoc(r, n) { // n = normalize() output
  if (r !== 'banners') return { ...n };
  const { desktopImageUrl, desktopImageAlt, mobileImageUrl, mobileImageAlt, ...rest } = n;
  const out = { ...rest };
  if (desktopImageUrl) out.desktopImage = { url: desktopImageUrl, alt: desktopImageAlt || undefined };
  if (mobileImageUrl) out.mobileImage = { url: mobileImageUrl, alt: mobileImageAlt || undefined };
  return out;
}

module.exports = { RESOURCES, MODULE_OF, DOC_KEYS, validUrl, normalize, crossFieldErrors, cmsStatus, fromDoc, toDoc };
