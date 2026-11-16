const { Banner, Faq, Announcement, HomepageSection } = require('../database/models');
const { E, ApiError } = require('../middleware/errors');
const { audit } = require('./audit');
const { scopeFilter } = require('../middleware/permissions');
const SCOPE_MAP = { stores: 'storeId' };
const storeFilter = (scopes, uid) => scopeFilter(scopes, uid, SCOPE_MAP);
const isStoreScoped = (r) => r === 'banners' || r === 'homepage';
const createStoreId = (scopes) => {
  if (scopes?.some((s) => s.kind === 'all')) return 'main';
  const stores = [...new Set((scopes || []).filter((s) => s.kind === 'stores').flatMap((s) => s.values || []))];
  if (stores.length !== 1) throw E.forbidden('CMS content must belong to exactly one store in your access scope.');
  return stores[0];
};
const adminFilter = (r, scopes, uid) => ({ ...base(r), ...(isStoreScoped(r) ? storeFilter(scopes, uid) : {}) });
const R = require('./cmsRules');

const MODEL = { banners: Banner, faqs: Faq, announcements: Announcement, homepage: HomepageSection };
const NAME = { banners: 'banner', faqs: 'faq', announcements: 'announcement', homepage: 'homepage section' };
const SORT = { banners: { sortOrder: 1, createdAt: -1 }, faqs: { sortOrder: 1, createdAt: 1 }, announcements: { createdAt: -1 }, homepage: { sortOrder: 1, createdAt: 1 } };
const base = (r) => (r === 'banners' ? { isDeleted: false } : {}); // banners are soft-deleted; FAQs and announcements are removed for good
const invalid = (errs) => new ApiError(400, 'VALIDATION_ERROR', 'Please check the highlighted fields.', errs);
const shape = (r, d, now = new Date()) => ({ id: d._id, ...R.fromDoc(r, d), status: R.cmsStatus(r, d, now), createdAt: d.createdAt });
const mod = (r) => R.MODULE_OF[r];

async function list(r, scopes, uid) {
  const now = new Date();
  const rows = await MODEL[r].find(adminFilter(r, scopes, uid)).sort(SORT[r]).limit(200).lean();
  return { items: rows.map((d) => shape(r, d, now)) };
}

async function create(ctx, r, body, scopes) {
  const data = R.normalize(r, body);
  const errs = R.crossFieldErrors(r, data);
  if (errs.length) throw invalid(errs);
  const d = await MODEL[r].create({ ...R.toDoc(r, data), ...(isStoreScoped(r) ? { storeId: createStoreId(scopes) } : {}) });
  await audit(ctx, { action: `${NAME[r]}.created`, module: mod(r), recordId: d._id, newValue: R.fromDoc(r, d) });
  return { item: shape(r, d) };
}

async function update(ctx, r, id, body, scopes) {
  const d = await MODEL[r].findOne({ _id: id, ...adminFilter(r, scopes, ctx.user._id) });
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

async function setActive(ctx, r, id, isActive, scopes) {
  const d = await MODEL[r].findOne({ _id: id, ...adminFilter(r, scopes, ctx.user._id) });
  if (!d) throw E.notFound('Not found.');
  if (r === 'homepage') {
    const was = d.isEnabled; d.isEnabled = !!isActive; await d.save();
    await audit(ctx, { action: `${NAME[r]}.active_changed`, module: mod(r), recordId: id, oldValue: { isEnabled: was }, newValue: { isEnabled: d.isEnabled } });
    return { item: shape(r, d) };
  }
  const was = d.isActive; d.isActive = !!isActive; await d.save();
  await audit(ctx, { action: `${NAME[r]}.active_changed`, module: mod(r), recordId: id, oldValue: { isActive: was }, newValue: { isActive: d.isActive } });
  return { item: shape(r, d) };
}

async function remove(ctx, r, id, scopes) {
  const d = await MODEL[r].findOne({ _id: id, ...adminFilter(r, scopes, ctx.user._id) });
  if (!d) throw E.notFound('Not found.');
  const old = R.fromDoc(r, d);
  if (r === 'banners') await Banner.updateOne({ _id: id, ...storeFilter(scopes, ctx.user._id) }, { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: ctx.user._id, isActive: false } });
  else await MODEL[r].deleteOne({ _id: id });
  await audit(ctx, { action: `${NAME[r]}.deleted`, module: mod(r), recordId: id, oldValue: old });
  return {};
}

module.exports = { list, create, update, setActive, remove };

// Route enabled CMS sections to the page they were created for.
// Older manually-created sections without a templateSlot remain on Home.
function sectionPageKey(section) {
  const type = String(section.type || '');
  const slot = String(section.config?.templateSlot || '').trim().toLowerCase();
  if (slot === 'site-navigation' || type === 'nav_menu') return 'site_navigation';
  if (slot === 'site-footer' || type === 'custom_footer' || type === 'footer_showcase') return 'site_footer';
  if (slot.startsWith('site-footer-before-') || ['whatsapp_float', 'ai_concierge'].includes(type)) return 'site_footer_before';
  if (slot.startsWith('site-header-after-') || slot === 'site-header-after') return 'site_header_after';
  if (slot === 'collection-before' || slot.startsWith('collection-before-')) return 'collection_before';
  if (slot === 'collection-after' || slot.startsWith('collection-after-')) return 'collection_after';
  const prefix = slot.split('-')[0];
  if (['home', 'house', 'journal', 'gifting', 'discover'].includes(prefix)) return prefix;
  return 'home';
}

// Keep each CMS page isolated. Flattening every page into Home caused the
// House, Journal, Gifting, Discover, navigation and footer sections to repeat.
async function publicContent() {
  const now = new Date();
  const live = (r, rows) => rows.filter((d) => R.cmsStatus(r, d, now) === 'Live');
  const [b, f, a, h] = await Promise.all([
    Banner.find({ isDeleted: false, isActive: true }).sort(SORT.banners).limit(20).lean(),
    Faq.find({ isActive: true }).sort(SORT.faqs).limit(100).lean(),
    Announcement.find({ isActive: true }).sort(SORT.announcements).limit(10).lean(),
    HomepageSection.find({ isEnabled: true }).sort(SORT.homepage).limit(100).lean(),
  ]);
  const banners = live('banners', b).map((d) => { const x = R.fromDoc('banners', d); return { id: d._id, heading: x.heading, subtitle: x.subtitle, buttonText: x.buttonText, buttonLink: x.buttonLink, desktopImage: x.desktopImageUrl ? { url: x.desktopImageUrl, alt: x.desktopImageAlt } : null, mobileImage: x.mobileImageUrl ? { url: x.mobileImageUrl, alt: x.mobileImageAlt } : null }; });
  const faqs = live('faqs', f).map((d) => ({ id: d._id, question: d.question, answer: d.answer }));
  const ann = live('announcements', a)[0];
  const allSections = h
    // The owner previously asked to remove this specific hard-coded-feeling hero.
    // Keep its CMS record intact, but stop publishing it to the storefront.
    .filter((d) => !(d.type === 'hero' && String(d.title || '').trim().toLowerCase() === 'scent is your energy.'))
    .map((d) => ({ id: d._id, type: d.type, title: d.title || '', config: d.config || {}, sortOrder: d.sortOrder || 0, isEnabled: true }));
  const pageSections = {};
  for (const section of allSections) {
    const pageKey = sectionPageKey(section);
    if (!pageSections[pageKey]) pageSections[pageKey] = [];
    pageSections[pageKey].push(section);
  }
  const homepageSections = pageSections.home || [];
  const managedPageKeys = Object.keys(pageSections).filter((key) => pageSections[key].length > 0);
  return { banners, faqs, announcement: ann ? { text: ann.text, link: ann.link || null } : null, homepageSections, pageSections, managedPageKeys };
}
module.exports.publicContent = publicContent;
module.exports.sectionPageKey = sectionPageKey;
