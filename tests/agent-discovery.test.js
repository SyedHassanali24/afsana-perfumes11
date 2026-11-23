const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const readPublic = (file) => fs.readFileSync(path.join(__dirname, '..', 'public', file), 'utf8');

test('llms.txt is Markdown with a site H1 and useful public links', () => {
  const content = readPublic('llms.txt');
  assert.ok(content.startsWith('# AFSANA Perfumes'));
  assert.ok(content.includes('https://afsanaperfumes.store/'));
  assert.ok(content.trim().length > 50);
});

test('ARD manifest contains a valid, domain-anchored static skill entry', () => {
  const manifest = JSON.parse(readPublic('.well-known/ard.json'));
  assert.ok(Array.isArray(manifest.entries));
  assert.equal(manifest.entries.length, 1);
  const [entry] = manifest.entries;
  assert.ok(entry.identifier.startsWith('urn:air:afsanaperfumes.store:'));
  assert.ok(entry.displayName);
  assert.equal(entry.type, 'application/agent-skills+md');
  assert.ok(entry.url.startsWith('https://afsanaperfumes.store/'));
  assert.equal(Number(Boolean(entry.url)) + Number(Boolean(entry.data)), 1);
  assert.ok(Array.isArray(entry.representativeQueries));
  assert.ok(entry.representativeQueries.length >= 2 && entry.representativeQueries.length <= 5);
  assert.equal(entry['@context'], 'https://agenticresourcediscovery.org/context/v1');
});

test('HTML advertises the current ARD manifest and llms.txt', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.ok(html.includes('rel="ard"'));
  assert.ok(html.includes('href="/.well-known/ard.json"'));
  assert.ok(html.includes('href="/llms.txt"'));
  assert.ok(html.includes('fetchpriority="high"'));
  assert.ok(html.includes('imagesrcset='));
});
