const SITE_URL = "https://afsanaperfumes.store";
const INDEXABLE_ROBOTS = "index,follow,max-image-preview:large";

const PAGE_METADATA = {
  "/": {
    title: "AFSANA Perfumes Pakistan | Luxury Fragrances",
    description: "Shop AFSANA perfumes online in Pakistan. Discover signature fragrances, explore scent notes and find a memorable scent for every occasion.",
  },
  "/shop": {
    title: "Perfumes Online in Pakistan | AFSANA Collection",
    description: "Explore the AFSANA perfume collection. Browse signature fragrances, scent notes and styles to find a perfume for everyday wear and special occasions.",
  },
  "/discover": {
    title: "Perfume Finder | Discover Your Signature Scent | AFSANA",
    description: "Find a perfume that matches your mood. Explore fragrance families, scent notes and the AFSANA scent finder to discover your signature fragrance.",
  },
  "/about": {
    title: "About AFSANA Perfumes | The Art of Scent",
    description: "Discover the AFSANA philosophy and our approach to fragrance, identity and memorable scent experiences.",
  },
  "/journal": {
    title: "Perfume Guides & Scent Stories | AFSANA Journal",
    description: "Explore perfume guides, fragrance notes, scent inspiration and thoughtful stories from the AFSANA journal.",
  },
  "/gifting": {
    title: "Perfume Gifts in Pakistan | AFSANA Gifting",
    description: "Explore AFSANA perfume gifting ideas. Find a thoughtful fragrance for celebrations, meaningful moments and special occasions.",
  },
  "/contact": {
    title: "Contact AFSANA Perfumes",
    description: "Contact AFSANA for perfume recommendations, fragrance questions, gifting guidance and help with your order.",
  },
};

const PRODUCTS = {
  "astral-drift": "Astral Drift",
  "busy-man": "Busy Man",
  dastan: "Dastan",
  dragon: "Dragon",
  "drama-queen": "Drama Queen",
  "ember-light": "Ember Light",
  flex: "Flex",
  "mood-swing": "Mood Swing",
  "red-forest": "Red Forest",
  "rose-miricle": "Rose Miricle",
  "safr-e-meehak": "Safr-e-Meehak",
  "taj-ul-oud": "Taj-ul-Oud",
};

const ARTICLES = {
  "choosing-your-signature-perfume": {
    title: "How to Choose a Signature Perfume | AFSANA Journal",
    description: "Learn how to choose a signature perfume by scent family, personal style, occasion and the way a fragrance develops on your skin.",
  },
  "perfume-notes-explained": {
    title: "Perfume Notes: Top, Heart & Base | AFSANA Journal",
    description: "Understand top, heart and base notes, fragrance families and how to read a perfume note pyramid before choosing your next scent.",
  },
  "choosing-perfume-for-warm-weather": {
    title: "Perfume for Warm Weather in Pakistan | AFSANA Journal",
    description: "A practical guide to choosing fragrance styles for warm days and cooler evenings in Pakistan, from fresh citrus to soft woods and amber.",
  },
  "how-to-choose-a-perfume-gift": {
    title: "How to Choose a Perfume Gift | AFSANA Journal",
    description: "Learn how to choose a thoughtful perfume gift by considering the recipient’s favourite notes, daily routine, preferred style and occasion.",
  },
};

function titleCaseSlug(slug) {
  return slug.split("-").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function getEdgePageMetadata(pathname = "/") {
  const path = String(pathname || "/").split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
  let metadata = PAGE_METADATA[path];
  let type = "website";

  if (!metadata && path.startsWith("/product/")) {
    const slug = path.slice("/product/".length).split("/")[0];
    const name = PRODUCTS[slug] || titleCaseSlug(slug);
    if (!name || path.split("/").length !== 3) return null;
    metadata = {
      title: `${name} Perfume | AFSANA Perfumes Pakistan`,
      description: `Explore ${name}, view confirmed product details, current price and availability from AFSANA Perfumes.`,
    };
    type = "product";
  } else if (!metadata && path.startsWith("/journal/")) {
    const slug = path.slice("/journal/".length).split("/")[0];
    metadata = ARTICLES[slug];
    if (!metadata || path.split("/").length !== 3) return null;
    type = "article";
  }

  if (!metadata) return null;
  return {
    ...metadata,
    canonicalUrl: `${SITE_URL}${path}`,
    robots: INDEXABLE_ROBOTS,
    type,
  };
}
