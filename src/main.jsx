import React from "react";
import ReactDOM from "react-dom/client";
import { cmsPublicApi, productsApi } from "./services";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
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

// Start homepage data reads before React mounts. The API client deduplicates
// these with the same requests made by ShopLayout and AfsanaSignatureHome,
// avoiding the CMS -> hero render waterfall on a cold mobile visit.
if (window.location.pathname === "/") {
  void cmsPublicApi.content().catch(() => {});
  void productsApi.list({ sort: "popular", limit: 12 }).catch(() => {});
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router>
      <AuthProvider>
        <CustomerAuthProvider>
          <CartProvider>
            <WishlistProvider>
              <App />
            </WishlistProvider>
          </CartProvider>
        </CustomerAuthProvider>
      </AuthProvider>
    </Router>
  </React.StrictMode>
);

// Cloudflare deploy refresh: rebuild the CMS frontend uploader bundle.
// Cloudflare deploy refresh: include CMS custom-section visibility fix.
// Cloudflare deploy refresh: cinematic background video CMS support.
// Cloudflare deploy refresh: Instagram Reel embed support.
