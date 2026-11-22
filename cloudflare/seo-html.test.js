import test from "node:test";
import assert from "node:assert/strict";
import { getEdgePageMetadata } from "./seo-html.js";

test("returns homepage metadata and canonical URL", () => {
  const metadata = getEdgePageMetadata("/");
  assert.equal(metadata.title, "AFSANA Perfumes Pakistan | Luxury Fragrances");
  assert.equal(metadata.canonicalUrl, "https://afsanaperfumes.store/");
  assert.equal(metadata.robots, "index,follow,max-image-preview:large");
});

test("returns route-specific collection metadata", () => {
  const metadata = getEdgePageMetadata("/shop?utm_source=instagram");
  assert.match(metadata.title, /Perfumes Online in Pakistan/);
  assert.equal(metadata.canonicalUrl, "https://afsanaperfumes.store/shop");
});

test("returns a unique fallback for each known product slug", () => {
  const metadata = getEdgePageMetadata("/product/astral-drift");
  assert.match(metadata.title, /Astral Drift Perfume/);
  assert.equal(metadata.type, "product");
  assert.match(metadata.description, /current price and availability/);
});

test("returns article-specific metadata for Journal guides", () => {
  const metadata = getEdgePageMetadata("/journal/perfume-notes-explained");
  assert.match(metadata.title, /Perfume Notes: Top, Heart & Base/);
  assert.equal(metadata.type, "article");
});

test("normalizes trailing slashes for canonical URLs", () => {
  assert.equal(getEdgePageMetadata("/gifting/").canonicalUrl, "https://afsanaperfumes.store/gifting");
});

test("does not index unknown article paths or private routes", () => {
  assert.equal(getEdgePageMetadata("/journal/not-a-real-article"), null);
  assert.equal(getEdgePageMetadata("/product/not-a-real-product"), null);
  assert.equal(getEdgePageMetadata("/admin"), null);
});

test("keeps legal pages indexable and order/data utility pages noindex", () => {
  assert.match(getEdgePageMetadata("/privacy-policy").robots, /^index,follow/);
  assert.match(getEdgePageMetadata("/terms-of-service").robots, /^index,follow/);
  assert.match(getEdgePageMetadata("/track").robots, /^noindex,follow/);
  assert.match(getEdgePageMetadata("/data-deletion").robots, /^noindex,follow/);
});
