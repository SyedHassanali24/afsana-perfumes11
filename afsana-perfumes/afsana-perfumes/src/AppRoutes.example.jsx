// Copy into your router file (App.jsx). Needs: npm i react-router-dom
// main.jsx — provider ORDER matters (Cart and Wishlist read the shopper session, so they sit inside CustomerAuthProvider):
//   <BrowserRouter>
//     <AuthProvider>                {/* staff */}
//       <CustomerAuthProvider>      {/* shoppers */}
//         <CartProvider>
//           <WishlistProvider>
//             <App />
//           </WishlistProvider>
//         </CartProvider>
//       </CustomerAuthProvider>
//     </AuthProvider>
//   </BrowserRouter>
// with:  import { CartProvider } from './shop/CartContext';  import { WishlistProvider } from './shop/WishlistContext';
import { Routes, Route, Navigate } from 'react-router-dom';
import RequireAuth from './auth/RequireAuth';
import LoginPage from './auth/LoginPage';
import ChangePasswordPage from './auth/ChangePasswordPage';
import AdminLayout from '../admin/components/AdminLayout';
import Dashboard from '../admin/dashboard/Dashboard';
import ProductsList from '../admin/products/ProductsList';
import InventoryList from '../admin/inventory/InventoryList';
import OrdersList from '../admin/orders/OrdersList';
import CatalogPage from '../admin/catalog/CatalogPage';
import StaffPage from '../admin/staff/StaffPage';
import MyAccountPage from '../admin/account/MyAccountPage';
import RequireCustomer from './customer/RequireCustomer';
import CustomerLoginPage from './customer/CustomerLoginPage';
import RegisterPage from './customer/RegisterPage';
import ForgotPasswordPage from './customer/ForgotPasswordPage';
import ResetPasswordPage from './customer/ResetPasswordPage';
// Phase 6 storefront
import ShopLayout from './shop/ShopLayout';
import HomePage from './shop/pages/HomePage';
import ShopPage from './shop/pages/ShopPage';
import ProductPage from './shop/pages/ProductPage';
import CartPage from './shop/pages/CartPage';
import CheckoutPage from './shop/pages/CheckoutPage';
import OrderSuccessPage from './shop/pages/OrderSuccessPage';
import TrackOrderPage from './shop/pages/TrackOrderPage';
import WishlistPage from './shop/account/WishlistPage';
import AccountPage from './shop/account/AccountPage';
import OrderDetailPage from './shop/account/OrderDetailPage';

const page = (permission, el) => (
  <RequireAuth permission={permission}><AdminLayout>{el}</AdminLayout></RequireAuth>
);
const mine = (el) => <RequireCustomer>{el}</RequireCustomer>;

export default function AppRoutes() {
  return (
    <Routes>
      {/* staff */}
      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/admin/change-password" element={<ChangePasswordPage />} />
      <Route path="/admin" element={page('dashboard.view', <Dashboard />)} />
      <Route path="/admin/products" element={page('products.view', <ProductsList />)} />
      <Route path="/admin/catalog" element={page('categories.view', <CatalogPage />)} />
      <Route path="/admin/inventory" element={page('inventory.view', <InventoryList />)} />
      <Route path="/admin/orders" element={page('orders.view', <OrdersList />)} />
      <Route path="/admin/staff" element={page(undefined, <StaffPage />)} />{/* StaffPage hides tabs the user can't open */}
      <Route path="/admin/account" element={page(undefined, <MyAccountPage />)} />
      <Route path="/admin/*" element={<Navigate to="/admin" replace />} />

      {/* shopper sign-in pages (own card layout, no shop header) */}
      <Route path="/login" element={<CustomerLoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* storefront (shared header/footer) */}
      <Route element={<ShopLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/product/:slug" element={<ProductPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/order-success/:orderNumber" element={<OrderSuccessPage />} />
        <Route path="/track" element={<TrackOrderPage />} />
        <Route path="/wishlist" element={mine(<WishlistPage />)} />
        <Route path="/account" element={mine(<AccountPage />)} />
        <Route path="/account/orders/:orderNumber" element={mine(<OrderDetailPage />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
