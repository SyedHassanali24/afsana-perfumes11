import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import RequireAuth from './auth/RequireAuth';
import LoginPage from './auth/LoginPage';
import ChangePasswordPage from './auth/ChangePasswordPage';
import AdminLayout from '../admin/components/AdminLayout';
const Dashboard = lazy(() => import('../admin/dashboard/Dashboard'));
const AnalyticsPage = lazy(() => import('../admin/dashboard/AnalyticsPage'));
const CouponsList = lazy(() => import('../admin/coupons/CouponsList'));
const CmsPage = lazy(() => import('../admin/cms/CmsPage'));
const ProductsList = lazy(() => import('../admin/products/ProductsList'));
const InventoryList = lazy(() => import('../admin/inventory/InventoryList'));
const OrdersList = lazy(() => import('../admin/orders/OrdersList'));
const CatalogPage = lazy(() => import('../admin/catalog/CatalogPage'));
const ReturnsList = lazy(() => import('../admin/returns/ReturnsList'));
const ShippingPage = lazy(() => import('../admin/shipping/ShippingPage'));
const CustomersList = lazy(() => import('../admin/customers/CustomersList'));
const ReviewsList = lazy(() => import('../admin/reviews/ReviewsList'));
const FinancePage = lazy(() => import('../admin/finance/FinancePage'));
const BackupPage = lazy(() => import('../admin/backup/BackupPage'));
const SettingsPage = lazy(() => import('../admin/settings/SettingsPage'));
const StaffPage = lazy(() => import('../admin/staff/StaffPage'));
const MyAccountPage = lazy(() => import('../admin/account/MyAccountPage'));
import RequireCustomer from './customer/RequireCustomer';
const CustomerLoginPage = lazy(() => import('./customer/CustomerLoginPage'));
const RegisterPage = lazy(() => import('./customer/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./customer/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./customer/ResetPasswordPage'));
import ShopLayout from './shop/ShopLayout';
const HomePage = lazy(() => import('./shop/pages/HomePage'));
const ShopPage = lazy(() => import('./shop/pages/ShopPage'));
const ProductPage = lazy(() => import('./shop/pages/ProductPage'));
const CartPage = lazy(() => import('./shop/pages/CartPage'));
const CheckoutPage = lazy(() => import('./shop/pages/CheckoutPage'));
const OrderSuccessPage = lazy(() => import('./shop/pages/OrderSuccessPage'));
const TrackOrderPage = lazy(() => import('./shop/pages/TrackOrderPage'));
const AboutPage = lazy(() => import('./shop/pages/AboutPage'));
const JournalPage = lazy(() => import('./shop/pages/JournalPage'));
const GiftingPage = lazy(() => import('./shop/pages/GiftingPage'));
const WishlistPage = lazy(() => import('./shop/account/WishlistPage'));
const AccountPage = lazy(() => import('./shop/account/AccountPage'));
const OrderDetailPage = lazy(() => import('./shop/account/OrderDetailPage'));

const page = (permission, el) => (
  <RequireAuth permission={permission}><AdminLayout>{el}</AdminLayout></RequireAuth>
);
const mine = (el) => <RequireCustomer>{el}</RequireCustomer>;

function AfsanaLoader({ suspense = false }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), suspense ? 650 : 1500);
    return () => window.clearTimeout(timer);
  }, [suspense]);
  if (!visible) return null;
  return (
    <div className="afsana-page-loader" role="status" aria-label="Loading Afsana">
      <div className="afsana-loader-glow afsana-loader-glow-one" />
      <div className="afsana-loader-glow afsana-loader-glow-two" />
      <div className="afsana-loader-content">
        <div className="afsana-loader-mark">
          <span>AFSANA</span>
          <i />
          <small>THE ART OF SCENT</small>
        </div>
        <div className="afsana-loader-ring"><span /></div>
        <p>Composing your experience</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      {!window.location.pathname.startsWith("/admin") && <AfsanaLoader />}
      <Suspense fallback={window.location.pathname.startsWith("/admin") ? <div className="min-h-screen bg-[var(--bg)]" /> : <AfsanaLoader suspense />}>
        <Routes>
          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="/admin/change-password" element={<ChangePasswordPage />} />
          <Route path="/admin" element={page('dashboard.view', <Dashboard />)} />
          <Route path="/admin/analytics" element={page('dashboard.view', <AnalyticsPage />)} />
          <Route path="/admin/products" element={page('products.view', <ProductsList />)} />
          <Route path="/admin/catalog" element={page('categories.view', <CatalogPage />)} />
          <Route path="/admin/inventory" element={page('inventory.view', <InventoryList />)} />
          <Route path="/admin/orders" element={page('orders.view', <OrdersList />)} />
          <Route path="/admin/returns" element={page('returns.view', <ReturnsList />)} />
          <Route path="/admin/shipping" element={page('shipping.view', <ShippingPage />)} />
          <Route path="/admin/customers" element={page('customers.view', <CustomersList />)} />
          <Route path="/admin/reviews" element={page('reviews.view', <ReviewsList />)} />
          <Route path="/admin/finance" element={page('finance.view', <FinancePage />)} />
          <Route path="/admin/marketing" element={page('coupons.view', <CouponsList />)} />
          <Route path="/admin/cms" element={page('homepage.view', <CmsPage />)} />
          <Route path="/admin/settings" element={page('settings.view', <SettingsPage />)} />
          <Route path="/admin/backup" element={page('backup.export', <BackupPage />)} />
          <Route path="/admin/staff" element={page(undefined, <StaffPage />)} />
          <Route path="/admin/account" element={page(undefined, <MyAccountPage />)} />
          <Route path="/admin/*" element={<Navigate to="/admin" replace />} />

          <Route path="/login" element={<CustomerLoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route element={<ShopLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/journal" element={<JournalPage />} />
            <Route path="/gifting" element={<GiftingPage />} />
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
      </Suspense>
    </>
  );
}
