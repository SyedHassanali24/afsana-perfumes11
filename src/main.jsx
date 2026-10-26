import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { CustomerAuthProvider } from "./customer/CustomerAuthContext";
import { CartProvider } from "./shop/CartContext";
import { WishlistProvider } from "./shop/WishlistContext";
import "./index.css";
import "./styles/tokens.css";

// Provider ORDER matters: Cart and Wishlist read the shopper session, so they sit inside CustomerAuthProvider.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CustomerAuthProvider>
          <CartProvider>
            <WishlistProvider>
              <App />
            </WishlistProvider>
          </CartProvider>
        </CustomerAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
