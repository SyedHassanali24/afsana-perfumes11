import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { CustomerAuthProvider } from "./customer/CustomerAuthContext";
import { CartProvider } from "./shop/CartContext";
import { WishlistProvider } from "./shop/WishlistContext";
import "./index.css";
import "./styles/tokens.css";
import "./styles/luxury-v3.css";

// HashRouter keeps every storefront/admin route working on GitHub Pages without server rewrites.
const Router = import.meta.env.BASE_URL === "/" ? BrowserRouter : HashRouter;

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
