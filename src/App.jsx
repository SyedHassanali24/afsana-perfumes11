import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import RequireAuth from './auth/RequireAuth';
import LoginPage from './auth/LoginPage';
import ChangePasswordPage from './auth/ChangePasswordPage';
const AdminLayout = lazy(() => import('../admin/components/AdminLayout'));
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
const EmailMarketingPage = lazy(() => import('../admin/email-marketing/EmailMarketingPage'));
const WhatsAppMarketingPage = lazy(() => import('../admin/whatsapp-marketing/WhatsAppMarketingPage'));
const ReviewsList = lazy(() => import('../admin/reviews/ReviewsList'));
const FinancePage = lazy(() => import('../admin/finance/FinancePage'));
const GrowthPage = lazy(() => import('../admin/growth/GrowthPage'));
const VirtualAccountantPage = lazy(() => import('../admin/accountant/VirtualAccountantPage'));
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
import SeoController from './shop/SeoController';
import { trackStorefrontPageView } from './shop/trafficTracking';

function AdminAuthScope() {
  return <AuthProvider><Outlet /></AuthProvider>;
}
const HomePage = lazy(() => import('./shop/pages/HomePage'));
const ShopPage = lazy(() => import('./shop/pages/ShopPage'));
const ProductPage = lazy(() => import('./shop/pages/ProductPage'));
const CartPage = lazy(() => import('./shop/pages/CartPage'));
const CheckoutPage = lazy(() => import('./shop/pages/CheckoutPage'));
const OrderSuccessPage = lazy(() => import('./shop/pages/OrderSuccessPage'));
const TrackOrderPage = lazy(() => import('./shop/pages/TrackOrderPage'));
const ContactPage = lazy(() => import('./shop/pages/ContactPage'));
const AboutPage = lazy(() => import('./shop/pages/AboutPage'));
const JournalPage = lazy(() => import('./shop/pages/JournalPage'));
const JournalArticlePage = lazy(() => import('./shop/pages/JournalArticlePage'));
const GiftingPage = lazy(() => import('./shop/pages/GiftingPage'));
const PrivacyPolicyPage = lazy(() => import('./shop/pages/PrivacyPolicyPage'));
const DataDeletionPage = lazy(() => import('./shop/pages/DataDeletionPage'));
const TermsOfServicePage = lazy(() => import('./shop/pages/TermsOfServicePage'));
const ManagedCmsPage = lazy(() => import('./shop/AfsanaSignatureHome').then((m) => ({ default: m.ManagedCmsPage })));
const ScentFinderPage = lazy(() => import('./shop/AfsanaSignatureHome').then((m) => ({ default: m.ScentFinderPage })));
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
    // A Suspense fallback must remain visible until its lazy page actually loads.
    if (suspense) return undefined;
    const timer = window.setTimeout(() => setVisible(false), 300);
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

function TrafficTracker() {
  const location = useLocation();
  useEffect(() => {
    const isAdmin = location.pathname === '/admin' || location.pathname.startsWith('/admin/');
    const isPreview = new URLSearchParams(location.search).get('afsanaPreview') === '1';
    if (isAdmin || isPreview) return undefined;

    let idleId = null;
    let timerId = null;
    let cancelled = false;
    const track = () => {
      if (!cancelled) trackStorefrontPageView(location.pathname, location.search);
    };

    // Analytics is non-critical. Send it when the browser is idle (with a
    // bounded fallback) so it cannot contend with first-screen resources.
    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(track, { timeout: 2500 });
    } else {
      timerId = window.setTimeout(track, 1200);
    }
    return () => {
      cancelled = true;
      if (idleId !== null && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId);
      }
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [location.pathname, location.search]);
  return null;
}

export default function App() {
  return (
    <>
      <TrafficTracker />
      <SeoController />
      {/* Route loading is already handled by the Suspense fallback below. */}
      <Suspense fallback={window.location.pathname.startsWith("/admin") ? <AfsanaLoader suspense /> : <AfsanaLoader suspense />}>
        <Routes>
          <Route element={<AdminAuthScope />}>
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
          <Route path="/admin/email-marketing" element={page('campaigns.view', <EmailMarketingPage />)} />
          <Route path="/admin/whatsapp-marketing" element={page('campaigns.view', <WhatsAppMarketingPage />)} />
          <Route path="/admin/reviews" element={page('reviews.view', <ReviewsList />)} />
          <Route path="/admin/finance" element={page('finance.view', <FinancePage />)} />
          <Route path="/admin/growth" element={page('dashboard.view', <GrowthPage />)} />
          <Route path="/admin/accountant" element={page('finance.view', <VirtualAccountantPage />)} />
          <Route path="/admin/marketing" element={page('coupons.view', <CouponsList />)} />
          <Route path="/admin/cms" element={page('homepage.view', <CmsPage />)} />
          <Route path="/admin/settings" element={page('settings.view', <SettingsPage />)} />
          <Route path="/admin/backup" element={page('backup.export', <BackupPage />)} />
          <Route path="/admin/staff" element={page(undefined, <StaffPage />)} />
          <Route path="/admin/account" element={page(undefined, <MyAccountPage />)} />
          <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
          </Route>

          <Route element={<ShopLayout />}>
            <Route path="/login" element={<CustomerLoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<><ManagedCmsPage pageKey="collection_before" /><ShopPage /><ManagedCmsPage pageKey="collection_after" /></>} />
            <Route path="/about" element={<ManagedCmsPage pageKey="house" fallback={<AboutPage />} />} />
            <Route path="/journal/:slug" element={<JournalArticlePage />} />
            <Route path="/journal" element={<ManagedCmsPage pageKey="journal" fallback={<JournalPage />} />} />
            <Route path="/discover" element={<ManagedCmsPage pageKey="discover" fallback={<ScentFinderPage />} />} />
            <Route path="/gifting" element={<ManagedCmsPage pageKey="gifting" fallback={<GiftingPage />} />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/data-deletion" element={<DataDeletionPage />} />
            <Route path="/terms-of-service" element={<TermsOfServicePage />} />
            <Route path="/terms" element={<Navigate to="/terms-of-service" replace />} />
            <Route path="/product/:slug" element={<><ManagedCmsPage pageKey="product_before" /><ProductPage /><ManagedCmsPage pageKey="product_after" /></>} />
            <Route path="/cart" element={<><ManagedCmsPage pageKey="cart_before" /><CartPage /><ManagedCmsPage pageKey="cart_after" /></>} />
            <Route path="/checkout" element={<><ManagedCmsPage pageKey="checkout_before" /><CheckoutPage /><ManagedCmsPage pageKey="checkout_after" /></>} />
            <Route path="/order-success/:orderNumber" element={<OrderSuccessPage />} />
            <Route path="/track" element={<><ManagedCmsPage pageKey="track_before" /><TrackOrderPage /><ManagedCmsPage pageKey="track_after" /></>} />
            <Route path="/contact" element={<><ManagedCmsPage pageKey="contact_before" /><ContactPage /><ManagedCmsPage pageKey="contact_after" /></>} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/account" element={mine(<AccountPage />)} />
            <Route path="/account/orders/:orderNumber" element={mine(<OrderDetailPage />)} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
