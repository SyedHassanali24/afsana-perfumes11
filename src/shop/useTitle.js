import { useEffect } from 'react';
import { applyPageMetadata, getPageMetadata } from './seo';

export default function useTitle(title, options = {}) {
  const {
    description,
    image,
    imageAlt,
    canonicalUrl,
    robots,
    type,
    jsonLd,
  } = options || {};

  useEffect(() => {
    const defaults = getPageMetadata(window.location.pathname);
    applyPageMetadata({
      ...defaults,
      title: title || defaults.title,
      description: description || defaults.description,
      image: image || defaults.image,
      imageAlt: imageAlt || defaults.imageAlt,
      canonicalUrl: canonicalUrl || defaults.canonicalUrl,
      robots: robots || defaults.robots,
      type: type || defaults.type,
      jsonLd: jsonLd || null,
    });
  }, [title, description, image, imageAlt, canonicalUrl, robots, type, jsonLd]);
}
