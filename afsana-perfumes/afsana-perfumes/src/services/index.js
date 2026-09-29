import { api } from './api';
export { api, ApiError } from './api';

export const authApi = {
  login: (email, password) => api('/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => api('/auth/logout', { method: 'POST' }),
  logoutAll: () => api('/auth/logout-all', { method: 'POST' }),
  me: () => api('/auth/me'),
  sessions: () => api('/auth/sessions'),
  revokeSession: (id) => api(`/auth/sessions/${id}`, { method: 'DELETE' }),
};

export const productsApi = {
  // storefront
  list: (query) => api('/products', { query }),
  bySlug: (slug) => api(`/products/${slug}`),
  // admin
  adminList: (query) => api('/products/admin/list', { query }),
  adminTrash: (query) => api('/products/admin/trash', { query }),
  adminGet: (id) => api(`/products/admin/${id}`),
  create: (body) => api('/products/admin', { method: 'POST', body }),
  update: (id, body) => api(`/products/admin/${id}`, { method: 'PATCH', body }),
  addVariant: (id, body) => api(`/products/admin/${id}/variants`, { method: 'POST', body }),
  updateVariant: (id, variantId, body) => api(`/products/admin/${id}/variants/${variantId}`, { method: 'PATCH', body }), // price changes need confirmPassword
  remove: (id, confirmPassword) => api(`/products/admin/${id}`, { method: 'DELETE', body: { confirmPassword } }),
  restore: (id) => api(`/products/admin/${id}/restore`, { method: 'POST' }),
};

export const inventoryApi = {
  list: (query) => api('/inventory', { query }),
  history: (query) => api('/inventory/history', { query }),
  adjust: (body) => api('/inventory/adjust', { method: 'POST', body }), // { variantId, type, quantity, reason, confirmPassword }
};

export const ordersApi = {
  checkout: (body) => api('/orders', { method: 'POST', body }),
  track: (orderNumber, phone) => api(`/orders/track/${orderNumber}`, { query: { phone } }),
  adminList: (query) => api('/orders/admin/list', { query }),
  adminGet: (id) => api(`/orders/admin/${id}`),
  setStatus: (id, status, note) => api(`/orders/admin/${id}/status`, { method: 'PATCH', body: { status, note } }),
  addNote: (id, text) => api(`/orders/admin/${id}/notes`, { method: 'POST', body: { text } }),
  setPayment: (id, paymentStatus, reference) => api(`/orders/admin/${id}/payment`, { method: 'PATCH', body: { paymentStatus, reference } }),
};
