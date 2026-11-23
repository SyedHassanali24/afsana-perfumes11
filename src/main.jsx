import React from "react";
import ReactDOM from "react-dom/client";
import { cmsPublicApi, productsApi } from "./services";
import { responsiveUnsplashSrcSet } from "./shop/responsiveImages";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App";
import { CustomerAuthProvider } from "./customer/CustomerAuthContext";
import { CartProvider } from "./shop/CartContext";
import { WishlistProvider } from "./shop/WishlistContext";
import "./index.css";
import "./styles/tokens.css";
import "./styles/luxury-v3.css";
import "./styles/purple-restore.css";
import "./styles/afsana-reference-storefront.css";

// HashRouter keeps every storefront/admin route working on GitHub Pages without server rewrites.
const Router = import.meta.env.BASE_URL === "/" ? BrowserRouter : HashRouter;

// Start homepage CMS and featured-product reads before React mounts. The
// featured-product GET is shared with AfsanaSignatureHome through the API cache.
// When the CMS data arrives, preload its first visible campaign/hero image
// before React inserts the corresponding image element into the page.
function preloadHomepageImage(source, sizes = "100vw", quality = 68) {
  if (typeof source !== "string" || !source.trim()) return;
  let imageUrl;
  try {
    imageUrl = new URL(source, window.location.origin);
  } catch {
    return;
  }
  if (!["https:", "http:"].includes(imageUrl.protocol)) return;

  const key = imageUrl.href;
  if (Array.from(document.querySelectorAll("link[data-afsana-home-preload]")).some((link) => link.href === key)) return;

  if (imageUrl.origin !== window.location.origin &&
      !document.querySelector(`link[rel="preconnect"][href="${imageUrl.origin}"]`)) {
    const preconnect = document.createElement("link");
    preconnect.rel = "preconnect";
    preconnect.href = imageUrl.origin;
    preconnect.setAttribute("data-afsana-home-preconnect", "true");
    document.head.appendChild(preconnect);
  }

  const preload = document.createElement("link");
  preload.rel = "preload";
  preload.as = "image";
  preload.href = imageUrl.href;
  preload.setAttribute("fetchpriority", "high");
  preload.setAttribute("data-afsana-home-preload", key);

  const responsiveSet = responsiveUnsplashSrcSet(source, quality);
  if (responsiveSet) {
    preload.setAttribute("imagesrcset", responsiveSet);
    preload.setAttribute("imagesizes", sizes);
  }
  document.head.appendChild(preload);
}

if (window.location.pathname === "/") {
  const cmsRequest = cmsPublicApi.content().catch(() => null);
  const featuredProductRequest = productsApi.featured().catch(() => null);

  void cmsRequest.then((content) => {
    if (!content) return;

    const firstBanner = Array.isArray(content.banners)
      ? content.banners.find((banner) => banner && (
          banner.heading || banner.subtitle || banner.desktopImage?.url || banner.mobileImage?.url
        ))
      : null;
    const useMobileBanner = window.matchMedia("(max-width: 700px)").matches;
    const bannerImage = useMobileBanner
      ? firstBanner?.mobileImage?.url || firstBanner?.desktopImage?.url
      : firstBanner?.desktopImage?.url || firstBanner?.mobileImage?.url;
    if (bannerImage) {
      preloadHomepageImage(bannerImage, "100vw", 68);
      return;
    }

    const sections = content.pageSections?.home || content.homepageSections || [];
    const hero = sections.find((section) =>
      section?.isEnabled !== false &&
      ["hero", "image_banner", "cinematic_statement", "video_banner"].includes(section.type)
    );
    const config = hero?.config || {};
    const directHeroImage = config.mobileImageUrl || config.imageUrl ||
      config.heroBottleImageUrl || config.posterUrl;
    if (directHeroImage) {
      preloadHomepageImage(directHeroImage, "90vw", hero?.type === "hero" && config.layout === "reference" ? 70 : 68);
      return;
    }

    if (hero?.type === "hero" && config.layout === "reference" && !config.heroBottleImageUrl) {
      void featuredProductRequest.then((result) => {
        const image = result?.product?.image?.url;
        if (image) preloadHomepageImage(image, "90vw", 70);
      });
    }
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router>
      <CustomerAuthProvider>
        <CartProvider>
          <WishlistProvider>
            <App />
          </WishlistProvider>
        </CartProvider>
      </CustomerAuthProvider>
    </Router>
  </React.StrictMode>
);

// Cloudflare deploy refresh: rebuild the CMS frontend uploader bundle.
// Cloudflare deploy refresh: include CMS custom-section visibility fix.
// Cloudflare deploy refresh: cinematic background video CMS support.
// Cloudflare deploy refresh: Instagram Reel embed support.
