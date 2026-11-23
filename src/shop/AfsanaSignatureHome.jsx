import { responsiveUnsplashSrcSet } from './responsiveImages';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, X, Instagram, Facebook, Youtube, Music2, Pin, Volume2, VolumeX } from 'lucide-react';
import useApi from '../hooks/useApi';
import { productsApi, cmsPublicApi, reviewsApi } from '../services';
import useShopSettings from './useShopSettings';
import ProductCard from './ProductCard';
import NewsletterSubscription from './components/NewsletterSubscription';
import CmsTestimonials, { sampleTestimonialsSection } from './CmsTestimonials';
import { Container } from './ui';
import { JOURNAL_ARTICLES } from './journalArticles';

const img={
 hero:'https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&w=1440&q=74',
 signature:'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=640&q=74',
 woods:'https://images.unsplash.com/photo-1616949755610-8c9bbc08f138?auto=format&fit=crop&w=800&q=74',
 floral:'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=800&q=74',
 gifting:'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=74',
 story:'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1000&q=74'
};
const video='https://videos.pexels.com/video-files/853801/853801-hd_1920_1080_30fps.mp4';
function HeroBackgroundVideo() {
  const videoRef = useRef(null);
  useEffect(() => {
    const element = videoRef.current;
    if (!element) return undefined;
    let cancelled = false;
    let timer = null;
    const onPageLoad = () => {
      if (cancelled) return;
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || navigator.connection?.saveData) return;
      timer = window.setTimeout(() => {
        const target = videoRef.current;
        if (cancelled || !target || target.src) return;
        target.src = video;
        target.load();
        target.play().catch(() => {});
      }, 1200);
    };
    if (document.readyState === 'complete') onPageLoad();
    else window.addEventListener('load', onPageLoad, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener('load', onPageLoad);
      if (timer !== null) window.clearTimeout(timer);
      if (videoRef.current) videoRef.current.pause();
    };
  }, []);
  return <video ref={videoRef} className="absolute inset-0 -z-20 h-full w-full object-cover" muted loop playsInline preload="none" aria-hidden="true"/>;
}
// The public catalogue is the only source for perfume product imagery on editorial pages.
const isCatalogueImageUrl = (url) => {
  const path = String(url || '').split(/[?#]/, 1)[0].toLowerCase();
  return !!path && !['.mp4','.webm','.mov','.m4v','.glb','.gltf'].some((extension) => path.endsWith(extension));
};
const catalogImage = (product) => product?.image?.url || product?.media?.find?.((item) => item?.kind === 'main' && isCatalogueImageUrl(item?.url))?.url || product?.media?.find?.((item) => isCatalogueImageUrl(item?.url) && !['video','media360','model3d'].includes(String(item?.kind || '').toLowerCase()))?.url || '';
const catalogProductsWithImages = (products = []) => products.filter((product) => catalogImage(product));
const catalogProductAt = (products = [], index = 0) => {
  const available = catalogProductsWithImages(products);
  return available.length ? available[index % available.length] : null;
};
// Editorial page heroes must use the named AFSANA fragrance for that page.
// Never substitute a different bottle when the exact product is unavailable.
const editorialProductByPage = {
  discover: { name: 'Mood Swing', pattern: /\bmood\s*swing\b/i },
  journal: { name: 'Rose Miracle', pattern: /\brose\s*miracle\b/i },
  house: { name: 'Ember Light', pattern: /\bember\s*light\b/i },
  gifting: { name: 'Astral Drift', pattern: /\bastral\s*drift\b/i }
};
const catalogProductForEditorialPage = (products = [], pageKey = '') => {
  const target = editorialProductByPage[pageKey];
  if (!target) return null;
  return catalogProductsWithImages(products).find((product) =>
    target.pattern.test(String(product?.name || ''))
  ) || null;
};
const catalogProductLink = (product) => product?.slug ? `/product/${product.slug}` : '/shop';
const Eyebrow=({children,light=false,white=false})=><div className={'flex items-center gap-3 text-[9px] sm:text-[10px] uppercase tracking-[.38em] font-semibold '+(white?'!text-white':light?'text-[#b4bf41]':'text-[#263e0e]')}><span className="w-9 h-px bg-current opacity-70"/>{children}</div>;
function DeferredBackgroundVideo({ src, poster, autoPlay = true, muted = true, controls = false, className = '' }) {
  const videoRef = useRef(null);
  useEffect(() => {
    const element = videoRef.current;
    if (!element || !src) return undefined;
    let disposed = false;
    const loadWhenVisible = () => {
      if (disposed) return;
      if (!element.getAttribute('src')) {
        element.src = src;
        element.load();
      }
      if (autoPlay) element.play().catch(() => {});
    };
    if (typeof IntersectionObserver === 'undefined') {
      loadWhenVisible();
      return () => { disposed = true; element.pause(); };
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        loadWhenVisible();
        observer.disconnect();
      }
    }, { rootMargin: '240px 0px' });
    observer.observe(element);
    return () => {
      disposed = true;
      observer.disconnect();
      element.pause();
    };
  }, [src, autoPlay]);
  return <video ref={videoRef} className={className} poster={poster || undefined} muted={muted} loop playsInline controls={controls} preload="none" onError={(event) => { event.currentTarget.style.display = 'none'; }}/>;
}


function Hero(){
 return <section className="hero relative isolate min-h-[760px] sm:min-h-[900px] overflow-hidden bg-[#080a07] text-white">
  <img src={img.hero} srcSet={responsiveUnsplashSrcSet(img.hero, 68)} sizes="100vw" alt="" fetchPriority="high" loading="eager" decoding="async" className="absolute inset-0 -z-20 h-full w-full object-cover"/>
  <HeroBackgroundVideo/>
  <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_72%_38%,rgba(163,197,233,.28),transparent_22%),radial-gradient(circle_at_18%_72%,rgba(123,0,58,.24),transparent_26%),linear-gradient(90deg,rgba(8,10,7,.98),rgba(38,62,14,.80),rgba(8,10,7,.42))"/>
  <div className="hero-light"/><div className="hero-light two"/>
  <div className="container-xl hero-content"><div className="grid w-full items-center lg:grid-cols-[1.08fr_.92fr] gap-12">
   <div className="luxury-reveal">
    <Eyebrow light>AN AFSANA BEGINS</Eyebrow>
    <h1 className="hero-title mt-7 max-w-4xl font-display">SCENTS<br/>WITH A<br/><em className="text-[#ffe500]">A STORY.</em></h1>
    <p className="mt-4 text-[10px] uppercase tracking-[.42em] text-[#a3c5e9]/80">THE ART OF SCENT • PRIVATE COLLECTION</p>
    <p className="hero-description mt-8">Some scents are worn. Others become memories. Discover a cinematic fragrance world crafted to leave a trace long after you leave the room.</p>
    <div className="hero-buttons mt-9 flex flex-wrap gap-3">
      <Link to="/shop" className="group inline-flex items-center gap-3 bg-[#ffe500] px-7 py-4 text-xs font-semibold uppercase tracking-[.16em] text-[#080a07] hover:bg-white transition">Enter the Story <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition"/></Link>
      <a href="#finderSection" className="inline-flex items-center gap-3 border border-white/25 px-7 py-4 text-xs uppercase tracking-[.16em] text-white hover:border-[#d6a84f] hover:text-[#ffe500] transition">Find Your AFSANA <span>✦</span></a>
    </div>
    <div className="mt-8 flex flex-wrap gap-3 text-[8px] uppercase tracking-[.25em] text-white/45"><span className="border border-white/10 bg-white/[.03] px-3 py-2">Premium Oils</span><span className="border border-white/10 bg-white/[.03] px-3 py-2">Long Lasting</span><span className="border border-white/10 bg-white/[.03] px-3 py-2">Gift Ready</span></div>
   </div>
   <div className="hero-side hidden lg:block luxury-reveal">
    <div className="hero-card relative mx-auto hero-card-magical">
      <div className="absolute -top-4 -right-4 z-10 rounded-full border border-[#d6a84f]/40 bg-[#070807]/70 px-4 py-2 text-[8px] uppercase tracking-[.28em] text-[#ffe500] backdrop-blur">01 • Signature</div>
      <div className="hero-card-image"><img src={img.signature} srcSet={responsiveUnsplashSrcSet(img.signature)} sizes="(max-width: 700px) 90vw, 34vw" alt="Afsana fragrance" width="960" height="1200" loading="lazy" decoding="async"/></div>
      <div className="text-left mt-4"><Eyebrow light>THE SIGNATURE</Eyebrow><p className="mt-4 font-display text-2xl">Citrus, saffron & a magnetic trail.</p></div>
    </div>
   </div>
  </div></div>
  <div className="absolute bottom-7 left-1/2 -translate-x-1/2 text-center text-[8px] uppercase tracking-[.35em] text-white/45"><span>Scroll to discover</span><div className="mx-auto mt-3 h-12 w-px bg-gradient-to-b from-[#b4bf41] to-transparent"/></div>
 </section>;
}
