// Copy this into your router file (App.jsx). Needs: npm i react-router-dom
// main.jsx:  <BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter>
import { Routes, Route, Navigate } from 'react-router-dom';
import RequireAuth from './auth/RequireAuth';
import LoginPage from './auth/LoginPage';
import AdminLayout from '../admin/components/AdminLayout';
import Dashboard from '../admin/dashboard/Dashboard';
import ProductsList from '../admin/products/ProductsList';
import InventoryList from '../admin/inventory/InventoryList';
import OrdersList from '../admin/orders/OrdersList';

const page = (permission, el) => (
  <RequireAuth permission={permission}><AdminLayout>{el}</AdminLayout></RequireAuth>
);

export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/admin" element={page('dashboard.view', <Dashboard />)} />
      <Route path="/admin/products" element={page('products.view', <ProductsList />)} />
      <Route path="/admin/inventory" element={page('inventory.view', <InventoryList />)} />
      <Route path="/admin/orders" element={page('orders.view', <OrdersList />)} />
      <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
// Note: if your app already wraps everything in <AuthProvider> in main.jsx, remove the import above.
