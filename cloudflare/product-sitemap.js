const PRODUCT_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sitemapDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function buildProductSitemapXml(products = [], siteOrigin = 'https://afsanaperfumes.store') {
  const origin = new URL(siteOrigin).origin;
  const unique = new Map();

  for (const product of Array.isArray(products) ? products : []) {
    const slug = String(product?.slug || '').trim().toLowerCase();
    if (!PRODUCT_SLUG.test(slug) || unique.has(slug)) continue;
    unique.set(slug, sitemapDate(product?.updatedAt));
  }

  const entries = [...unique.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([slug, lastmod]) => {
      const loc = xmlEscape(new URL(`/product/${slug}`, origin).toString());
      const modified = lastmod ? `<lastmod>${lastmod}</lastmod>` : '';
      return `  <url><loc>${loc}</loc>${modified}</url>`;
    });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n');
}
