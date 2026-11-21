const test = require('node:test');
const assert = require('node:assert/strict');
const journal = import('../src/shop/journalArticles.js');

test('journal guides have unique slugs and complete editorial metadata', async () => {
  const { JOURNAL_ARTICLES } = await journal;
  const slugs = JOURNAL_ARTICLES.map((article) => article.slug);

  assert.equal(JOURNAL_ARTICLES.length, 4);
  assert.equal(new Set(slugs).size, slugs.length);

  for (const article of JOURNAL_ARTICLES) {
    assert.match(article.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(article.title.length > 15);
    assert.ok(article.description.length >= 80 && article.description.length <= 180);
    assert.ok(article.sections.length >= 3);
    const wordCount = article.sections
      .flatMap((section) => section.paragraphs)
      .join(' ')
      .split(/\s+/)
      .filter(Boolean).length;
    assert.ok(wordCount >= 160, `${article.slug} should contain useful editorial depth`);
    assert.ok(article.links.length > 0);
  }
});
