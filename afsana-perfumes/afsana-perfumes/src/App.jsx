import { Routes, Route, Navigate } from "react-router-dom";
import RequireAuth from "./auth/RequireAuth";
import LoginPage from "./auth/LoginPage";
import ChangePasswordPage from "./auth/ChangePasswordPage";
import AdminLayout from "../admin/components/AdminLayout";
import Dashboard from "../admin/dashboard/Dashboard";
import ProductsList from "../admin/products/ProductsList";
import InventoryList from "../admin/inventory/InventoryList";
import OrdersList from "../admin/orders/OrdersList";
import StaffPage from "../admin/staff/StaffPage";
import MyAccountPage from "../admin/account/MyAccountPage";
import CustomerLoginPage from "./customer/CustomerLoginPage";
import RegisterPage from "./customer/RegisterPage";
import ForgotPasswordPage from "./customer/ForgotPasswordPage";
import ResetPasswordPage from "./customer/ResetPasswordPage";

const page = (permission, el) => (
  <RequireAuth permission={permission}>
    <AdminLayout>{el}</AdminLayout>
  </RequireAuth>
);

export default function App() {
  return (
    <Routes>
      {/* staff / admin */}
      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/admin/change-password" element={<ChangePasswordPage />} />
      <Route path="/admin" element={page("dashboard.view", <Dashboard />)} />
      <Route path="/admin/products" element={page("products.view", <ProductsList />)} />
      <Route path="/admin/inventory" element={page("inventory.view", <InventoryList />)} />
      <Route path="/admin/orders" element={page("orders.view", <OrdersList />)} />
      <Route path="/admin/staff" element={page(undefined, <StaffPage />)} />
      <Route path="/admin/account" element={page(undefined, <MyAccountPage />)} />
      <Route path="/admin/*" element={<Navigate to="/admin" replace />} />

      {/* shoppers (storefront pages themselves are a later phase) */}
      <Route path="/login" element={<CustomerLoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* default: send visitors to the admin login until the storefront exists */}
      <Route path="/" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
