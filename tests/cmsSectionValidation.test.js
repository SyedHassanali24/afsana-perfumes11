const test = require('node:test');
const assert = require('node:assert/strict');
const { homepageSectionShape } = require('../validation/schemas');

test('CMS API accepts all premium homepage section types offered by the builder', () => {
  const supported = [
    'hero', 'featured_collection', 'best_sellers', 'new_arrivals', 'under_2000',
    'gift_boxes', 'testimonials', 'instagram', 'newsletter', 'video_banner',
    'video_grid', 'image_banner', 'split_story', 'benefits', 'category_tiles',
    'marquee', 'trust_grid', 'cinematic_statement', 'lookbook', 'values_grid',
    'blog_grid', 'post_grid', 'promo_timer', 'offer_timer', 'community_pulse',
    'footer_showcase', 'muse_scene', 'product_3d_showcase', 'fragrance_dna',
    'interactive_gallery', 'scent_finder', 'rich_text', 'faq', 'spacer',
  ];
  for (const type of supported) {
    assert.equal(homepageSectionShape.safeParse({ type, title: '', config: {}, sortOrder: 0, isEnabled: true }).success, true, type);
  }
});
