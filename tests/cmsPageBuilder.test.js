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
  for (const type of ['whatsapp_float', 'ai_concierge']) {
    assert.ok(CMS.HOMEPAGE_SECTION_TYPES.includes(type));
    assert.deepEqual(CMS.crossFieldErrors('homepage', CMS.normalize('homepage', { type, pageKey: 'site_footer_before' })), []);
  }
});

test('homepage sections are soft-deletable without being treated as another content module', () => {
  assert.ok(CMS.DOC_KEYS.homepage.includes('pageKey'));
  assert.equal(CMS.MODULE_OF.homepage, 'homepage');
});
