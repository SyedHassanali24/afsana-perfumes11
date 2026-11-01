const test = require('node:test');
const assert = require('node:assert/strict');
const CMS = require('../services/cmsRules');

test('multi-page CMS assigns old sections to home and accepts the supported page positions', () => {
  assert.equal(CMS.normalize('homepage', { type: 'hero' }).pageKey, 'home');
  for (const pageKey of CMS.HOMEPAGE_PAGE_KEYS) {
    const data = CMS.normalize('homepage', { type: 'rich_text', pageKey, sortOrder: 0 });
    assert.equal(data.pageKey, pageKey);
    assert.deepEqual(CMS.crossFieldErrors('homepage', data), []);
    assert.equal(CMS.fromDoc('homepage', CMS.toDoc('homepage', data)).pageKey, pageKey);
  }
});

test('unsupported page positions are rejected instead of silently being published', () => {
  const data = CMS.normalize('homepage', { type: 'hero', pageKey: 'admin-dashboard' });
  assert.ok(CMS.crossFieldErrors('homepage', data).some((issue) => issue.path === 'pageKey'));
});

test('floating WhatsApp and guided scent concierge are valid visual section types', () => {
  for (const [type, pageKey] of [['whatsapp_float','site_footer_before'],['ai_concierge','site_footer_before'],['nav_menu','site_navigation'],['custom_footer','site_footer'],['reference_assets','home']]) {
    assert.ok(CMS.HOMEPAGE_SECTION_TYPES.includes(type));
    assert.deepEqual(CMS.crossFieldErrors('homepage', CMS.normalize('homepage', { type, pageKey })), []);
  }
  assert.ok(CMS.crossFieldErrors('homepage', CMS.normalize('homepage', { type:'nav_menu', pageKey:'home' })).some((issue) => issue.path === 'pageKey'));
  assert.ok(CMS.crossFieldErrors('homepage', CMS.normalize('homepage', { type:'custom_footer', pageKey:'site_footer_before' })).some((issue) => issue.path === 'pageKey'));
});

test('homepage sections are soft-deletable without being treated as another content module', () => {
  assert.ok(CMS.DOC_KEYS.homepage.includes('pageKey'));
  assert.equal(CMS.MODULE_OF.homepage, 'homepage');
});

test('public homepage grouping keeps saved sections without theme/template tags', () => {
  const grouped = CMS.groupHomepageSections([
    { _id: 'home-hero', type: 'hero', title: 'Campaign hero', pageKey: 'home', config: { imageUrl: '/api/media/0123456789abcdef01234567' }, sortOrder: 0 },
    { _id: 'journal-grid', type: 'video_grid', title: 'Behind the scent', pageKey: 'journal', config: { columns: 3 }, sortOrder: 1 },
    { _id: 'footer', type: 'custom_footer', title: 'The house', pageKey: 'site_footer', config: {}, sortOrder: 0 },
  ]);
  assert.deepEqual(grouped.homepageSections.map((section) => section.id), ['home-hero']);
  assert.deepEqual(grouped.pageSections.journal.map((section) => section.id), ['journal-grid']);
  assert.deepEqual(grouped.pageSections.site_footer.map((section) => section.id), ['footer']);
  assert.equal(grouped.homepageSections[0].config.imageUrl, '/api/media/0123456789abcdef01234567');
});
