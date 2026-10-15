const { Banner, Faq, Announcement } = require('../database/models');
const { E, ApiError } = require('../middleware/errors');
const { audit } = require('./audit');
const R = require('./cmsRules');

const MODEL = { banners: Banner, faqs: Faq, announcements: Announcement };
const NAME = { banners: 'banner', faqs: 'faq', announcements: 'announcement' };
const SORT = { banners: { sortOrder: 1, createdAt: -1 }, faqs: { sortOrder: 1, createdAt: 1 }, announcements: { createdAt: -1 } };
const base = (r) => (r === 'banners' ? { isDeleted: false } : {}); // banners are soft-deleted; FAQs and announcements are removed for good
const invalid = (errs) => new ApiError(400, 'VALIDATION_ERROR', 'Please check the highlighted fields.', errs);
const shape = (r, d, now = new Date()) => ({ id: d._id, ...R.fromDoc(r, d), status: R.cmsStatus(r, d, now), createdAt: d.createdAt });
const mod = (r) => R.MODULE_OF[r];

async function list(r) {
  const now = new Date();
  const rows = await MODEL[r].find(base(r)).sort(SORT[r]).limit(200).lean();
  return { items: rows.map((d) => shape(r, d, now)) };
}

async function create(ctx, r, body) {
  const data = R.normalize(r, body);
  const errs = R.crossFieldErrors(r, data);
  if (errs.length) throw invalid(errs);
  const d = await MODEL[r].create(R.toDoc(r, data));
  await audit(ctx, { action: `${NAME[r]}.created`, module: mod(r), recordId: d._id, newValue: R.fromDoc(r, d) });
  return { item: shape(r, d) };
}

async function update(ctx, r, id, body) {
  const d = await MODEL[r].findOne({ _id: id, ...base(r) });
  if (!d) throw E.notFound('Not found.');
  const before = R.fromDoc(r, d);
  const data = R.normalize(r, { ...before, ...body });
  const errs = R.crossFieldErrors(r, data);
  if (errs.length) throw invalid(errs);
  const next = R.toDoc(r, data);
  for (const k of R.DOC_KEYS[r]) d.set(k, next[k]); // key missing in `next` -> cleared
  await d.save();
  await audit(ctx, { action: `${NAME[r]}.updated`, module: mod(r), recordId: id, oldValue: before, newValue: R.fromDoc(r, d) });
  return { item: shape(r, d) };
}

async function setActive(ctx, r, id, isActive) {
  const d = await MODEL[r].findOne({ _id: id, ...base(r) });
  if (!d) throw E.notFound('Not found.');
  const was = d.isActive; d.isActive = !!isActive; await d.save();
  await audit(ctx, { action: `${NAME[r]}.active_changed`, module: mod(r), recordId: id, oldValue: { isActive: was }, newValue: { isActive: d.isActive } });
  return { item: shape(r, d) };
}

async function remove(ctx, r, id) {
  const d = await MODEL[r].findOne({ _id: id, ...base(r) });
  if (!d) throw E.notFound('Not found.');
  const old = R.fromDoc(r, d);
  if (r === 'banners') await Banner.updateOne({ _id: id }, { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: ctx.user._id, isActive: false } });
  else await MODEL[r].deleteOne({ _id: id });
  await audit(ctx, { action: `${NAME[r]}.deleted`, module: mod(r), recordId: id, oldValue: old });
  return {};
}

module.exports = { list, create, update, setActive, remove };

// What the shop may show right now: live banners, live FAQs, the newest live announcement. No ids of staff, no drafts.
async function publicContent() {
  const now = new Date();
  const live = (r, rows) => rows.filter((d) => R.cmsStatus(r, d, now) === 'Live');
  const [b, f, a] = await Promise.all([
    Banner.find({ isDeleted: false, isActive: true }).sort(SORT.banners).limit(20).lean(),
    Faq.find({ isActive: true }).sort(SORT.faqs).limit(100).lean(),
    Announcement.find({ isActive: true }).sort(SORT.announcements).limit(10).lean(),
  ]);
  const banners = live('banners', b).map((d) => { const x = R.fromDoc('banners', d); return { id: d._id, heading: x.heading, subtitle: x.subtitle, buttonText: x.buttonText, buttonLink: x.buttonLink, desktopImage: x.desktopImageUrl ? { url: x.desktopImageUrl, alt: x.desktopImageAlt } : null, mobileImage: x.mobileImageUrl ? { url: x.mobileImageUrl, alt: x.mobileImageAlt } : null }; });
  const faqs = live('faqs', f).map((d) => ({ id: d._id, question: d.question, answer: d.answer }));
  const ann = live('announcements', a)[0];
  return { banners, faqs, announcement: ann ? { text: ann.text, link: ann.link || null } : null };
}
module.exports.publicContent = publicContent;
