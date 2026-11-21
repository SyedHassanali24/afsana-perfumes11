export const SITE_URL = 'https://afsanaperfumes.store';
export const SITE_NAME = 'AFSANA Perfumes';
export const DEFAULT_SOCIAL_IMAGE = `${SITE_URL}/afsana-astral-drift-house-hero.webp`;

const PAGE_METADATA = {
  '/': {
    title: 'AFSANA Perfumes Pakistan | Luxury Fragrances',
    description: 'Shop AFSANA perfumes online in Pakistan. Discover signature fragrances, explore scent notes and find a memorable scent for every occasion.',
  },
  '/shop': {
    title: 'Perfumes Online in Pakistan | AFSANA Collection',
    description: 'Explore the AFSANA perfume collection. Browse signature fragrances, scent notes and styles to find a perfume for everyday wear and special occasions.',
  },
  '/discover': {
    title: 'Perfume Finder | Discover Your Signature Scent | AFSANA',
    description: 'Find a perfume that matches your mood. Explore fragrance families, scent notes and the AFSANA scent finder to discover your signature fragrance.',
  },
  '/about': {
    title: 'About AFSANA Perfumes | The Art of Scent',
    description: 'Discover the AFSANA philosophy and our approach to fragrance, identity and memorable scent experiences.',
  },
  '/journal': {
    title: 'Perfume Guides & Scent Stories | AFSANA Journal',
    description: 'Explore perfume guides, fragrance notes, scent inspiration and thoughtful stories from the AFSANA journal.',
  },
  '/gifting': {
    title: 'Perfume Gifts in Pakistan | AFSANA Gifting',
    description: 'Explore AFSANA perfume gifting ideas. Find a thoughtful fragrance for celebrations, meaningful moments and special occasions.',
  },
  '/contact': {
    title: 'Contact AFSANA Perfumes',
    description: 'Contact AFSANA for perfume recommendations, fragrance questions, gifting guidance and help with your order.',
  },
  '/track': {
    title: 'Track Your AFSANA Order',
    description: 'Check the latest status of your AFSANA perfume order using your order details.',
    robots: 'noindex,follow',
  },
  '/privacy-policy': {
    title: 'Privacy Policy | AFSANA Perfumes',
    description: 'Read how AFSANA Perfumes handles website information and customer privacy.',
  },
  '/terms-of-service': {
    title: 'Terms of Service | AFSANA Perfumes',
    description: 'Review the terms that apply when browsing and shopping with AFSANA Perfumes.',
  },
  '/data-deletion': {
    title: 'User Data Deletion | AFSANA Perfumes',
    description: 'Information about requesting deletion of personal data associated with AFSANA services.',
    robots: 'noindex,follow',
  },
};

const PRIVATE_ROUTE_PATTERNS = [
  /^\/admin(?:\/|$)/,
  /^\/api(?:\/|$)/,
  /^\/(?:cart|checkout|account|wishlist|login|register|forgot-password|reset-password)(?:\/|$)/,
  /^\/order-success(?:\/|$)/,
];

function cleanText(value, maxLength = 300) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

export function getCanonicalUrl(pathname = '/', preferredUrl) {
  const siteOrigin = new URL(SITE_URL).origin;
  if (typeof preferredUrl === 'string' && preferredUrl.trim()) {
    try {
      const preferred = new URL(preferredUrl.trim(), SITE_URL);
      if (preferred.origin === siteOrigin && /^https?:$/.test(preferred.protocol)) {
        preferred.search = '';
        preferred.hash = '';
        if (preferred.pathname !== '/') preferred.pathname = preferred.pathname.replace(/\/+$/, '');
        return preferred.toString();
      }
    } catch {
      // An invalid or off-site canonical is ignored in favour of this page URL.
    }
  }

  const rawPath = String(pathname || '/').split(/[?#]/, 1)[0] || '/';
  const safePath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  const normalisedPath = safePath === '/' ? '/' : safePath.replace(/\/+$/, '');
  return `${SITE_URL}${normalisedPath}`;
}

export function getPageMetadata(pathname = '/') {
  const path = String(pathname || '/').split(/[?#]/, 1)[0] || '/';
  const privateRoute = PRIVATE_ROUTE_PATTERNS.some((pattern) => pattern.test(path));
  const page = PAGE_METADATA[path] || (
    path.startsWith('/product/')
      ? {
          title: 'AFSANA Perfumes | Signature Fragrances',
          description: 'Discover this AFSANA fragrance, explore its scent profile and view product details.',
        }
      : {
          title: 'AFSANA Perfumes | The Art of Scent',
          description: 'Discover AFSANA signature fragrances, explore scent notes and find your next memorable perfume.',
          robots: 'noindex,follow',
        }
  );

  return {
    ...page,
    canonicalUrl: getCanonicalUrl(path),
    image: DEFAULT_SOCIAL_IMAGE,
    imageAlt: 'AFSANA Perfumes — The Art of Scent',
    type: path.startsWith('/product/') ? 'product' : 'website',
    robots: privateRoute ? 'noindex,follow' : (page.robots || 'index,follow,max-image-preview:large'),
  };
}

function formatTitle(value, fallback) {
  const title = cleanText(value || fallback, 120);
  if (!title) return SITE_NAME;
  return /\bafsana\b/i.test(title) ? title : `${title} | ${SITE_NAME}`;
}

function absoluteImageUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value.trim(), SITE_URL);
    return /^https?:$/.test(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

function upsertMeta(attribute, key, value) {
  if (!value || typeof document === 'undefined') return;
  const selector = `meta[${attribute}="${key}"]`;
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', String(value));
}

function upsertCanonical(href) {
  if (typeof document === 'undefined' || !href) return;
  let element = document.head.querySelector('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

function setPageJsonLd(value) {
  if (typeof document === 'undefined') return;
  const id = 'afsana-page-jsonld';
  let element = document.getElementById(id);
  if (!value) {
    element?.remove();
    return;
  }
  if (!element) {
    element = document.createElement('script');
    element.id = id;
    element.type = 'application/ld+json';
    document.head.appendChild(element);
  }
  element.textContent = JSON.stringify(value);
}

export function applyPageMetadata(metadata = {}) {
  if (typeof document === 'undefined') return;
  const defaults = getPageMetadata(window.location.pathname);
  const title = formatTitle(metadata.title, defaults.title);
  const description = cleanText(metadata.description || defaults.description, 160);
  const canonicalUrl = getCanonicalUrl(window.location.pathname, metadata.canonicalUrl || defaults.canonicalUrl);
  const image = absoluteImageUrl(metadata.image || defaults.image);
  const imageAlt = cleanText(metadata.imageAlt || defaults.imageAlt, 200);
  const robots = metadata.robots || defaults.robots;
  const type = metadata.type || defaults.type || 'website';

  document.title = title;
  upsertMeta('name', 'description', description);
  upsertMeta('name', 'robots', robots);
  upsertMeta('property', 'og:type', type);
  upsertMeta('property', 'og:site_name', SITE_NAME);
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:url', canonicalUrl);
  upsertMeta('property', 'og:locale', 'en_PK');
  upsertMeta('property', 'og:image', image);
  upsertMeta('property', 'og:image:alt', imageAlt);
  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
  upsertMeta('name', 'twitter:image', image);
  upsertMeta('name', 'twitter:image:alt', imageAlt);
  upsertCanonical(canonicalUrl);
  setPageJsonLd(metadata.jsonLd || null);
}

export function buildProductJsonLd({
  product,
  price,
  available,
  imageUrls = [],
  canonicalUrl,
  category,
  ratingAverage,
  ratingCount,
}) {
  const name = cleanText(product?.name, 160);
  const images = [...new Set(
    (Array.isArray(imageUrls) ? imageUrls : [imageUrls])
      .map(absoluteImageUrl)
      .filter(Boolean),
  )];
  if (!name || !images.length) return null;

  const description = cleanText(
    product?.seo?.metaDescription || product?.content?.shortDescription || product?.content?.fullDescription,
    500,
  );
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    image: images,
    brand: { '@type': 'Brand', name: 'AFSANA' },
    url: getCanonicalUrl(product?.slug ? `/product/${product.slug}` : '/', canonicalUrl),
  };

  if (description) schema.description = description;
  if (product?.sku) schema.sku = cleanText(product.sku, 80);
  if (category) schema.category = cleanText(category, 120);

  const numericPrice = Number(price);
  if (Number.isFinite(numericPrice) && numericPrice > 0) {
    const offer = {
      '@type': 'Offer',
      priceCurrency: 'PKR',
      price: numericPrice,
      url: schema.url,
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: SITE_NAME },
    };
    const numericAvailable = Number(available);
    if (available !== null && available !== undefined && Number.isFinite(numericAvailable)) {
      offer.availability = numericAvailable > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock';
    }
    schema.offers = offer;
  }

  const average = Number(ratingAverage);
  const count = Number(ratingCount);
  if (Number.isFinite(average) && average >= 1 && average <= 5 && Number.isInteger(count) && count > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: average,
      reviewCount: count,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return schema;
}
