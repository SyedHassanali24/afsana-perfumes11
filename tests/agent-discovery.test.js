import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readPublic = (path) => readFileSync(new URL(`../public/${path}`, import.meta.url), "utf8");

test("llms.txt is Markdown with a site H1 and useful public links", () => {
  const content = readPublic("llms.txt");
  assert.match(content, /^# AFSANA Perfumes/m);
  assert.match(content, /\[[^\]]+\]\(https:\/\/afsanaperfumes\.store\//);
  assert.ok(content.trim().length > 50);
});

test("ARD manifest contains a valid, domain-anchored static skill entry", () => {
  const manifest = JSON.parse(readPublic(".well-known/ard.json"));
  assert.ok(Array.isArray(manifest.entries));
  assert.equal(manifest.entries.length, 1);
  const [entry] = manifest.entries;
  assert.match(entry.identifier, /^urn:air:afsanaperfumes\.store:[a-z0-9_-]+:[a-z0-9_-]+$/);
  assert.ok(entry.displayName);
  assert.equal(entry.type, "application/ai-skill+md");
  assert.match(entry.url, /^https:\/\/afsanaperfumes\.store\//);
  assert.equal(Boolean(entry.url) + Boolean(entry.data), 1);
  assert.ok(Array.isArray(entry.representativeQueries));
  assert.ok(entry.representativeQueries.length >= 2 && entry.representativeQueries.length <= 5);
  assert.equal(entry["@context"], "https://agenticresourcediscovery.org/context/v1");
});

test("HTML advertises the current ARD manifest and llms.txt", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /rel="ard"[^>]+href="\/.well-known\/ard\.json"/);
  assert.match(html, /rel="describedby" href="\/llms\.txt"/);
  assert.match(html, /rel="preload"\s+as="image"/);
});
