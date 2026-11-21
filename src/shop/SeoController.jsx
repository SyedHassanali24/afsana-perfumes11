import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { applyPageMetadata, getPageMetadata } from './seo';

export default function SeoController() {
  const location = useLocation();

  useEffect(() => {
    applyPageMetadata(getPageMetadata(location.pathname));
  }, [location.pathname]);

  return null;
}
