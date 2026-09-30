import { api } from './api';
export { api, ApiError } from './api';

export const authApi = {
  login: (email, password) => api('/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => api('/auth/logout', { method: 'POST' }),
  logoutAll: () => api('/auth/logout-all', { method: 'POST' }),
  me: () => api('/auth/me'),
  changePassword: (currentPassword, newPassword) => api('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),
  sessions: () => api('/auth/sessions'),
  revokeSession: (id) => api(`/auth/sessions/${id}`, { method: 'DELETE' }),
};

export const productsApi = {
  // storefront
  list: (query) => api('/products', { query }),
  bySlug: (slug) => api(`/products/${slug}`),
  // admin
  adminList: (query) => api('/products/admin/list', { query }),
  categories: () => api('/products/admin/categories'),
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

// ---- Phase 4: team & access (all writes need confirmPassword) ----
export const staffApi = {
  list: (query) => api('/staff', { query }),
  get: (id) => api(`/staff/${id}`),
  assignableRoles: () => api('/staff/assignable-roles'),
  create: (body) => api('/staff', { method: 'POST', body }),
  update: (id, body) => api(`/staff/${id}`, { method: 'PATCH', body }),
  resetPassword: (id, confirmPassword, password) => api(`/staff/${id}/reset-password`, { method: 'POST', body: { confirmPassword, password } }),
  remove: (id, confirmPassword) => api(`/staff/${id}`, { method: 'DELETE', body: { confirmPassword } }),
  addOverride: (id, body) => api(`/staff/${id}/overrides`, { method: 'POST', body }),
  removeOverride: (id, overrideId, confirmPassword) => api(`/staff/${id}/overrides/${overrideId}`, { method: 'DELETE', body: { confirmPassword } }),
  sessions: (id) => api(`/staff/${id}/sessions`),
  revokeSessions: (id, confirmPassword) => api(`/staff/${id}/sessions`, { method: 'DELETE', body: { confirmPassword } }),
};
export const rolesApi = {
  list: () => api('/roles'),
  create: (body) => api('/roles', { method: 'POST', body }),
  update: (id, body) => api(`/roles/${id}`, { method: 'PATCH', body }),
  remove: (id, confirmPassword) => api(`/roles/${id}`, { method: 'DELETE', body: { confirmPassword } }),
};
export const permissionsApi = {
  catalog: () => api('/permissions/catalog'),
  history: (query) => api('/permissions/history', { query }),
};
export const auditApi = { list: (query) => api('/audit', { query }) };

// ---- Storefront customer accounts (separate cookie from staff) ----
export const accountApi = {
  register: (body) => api('/account/register', { method: 'POST', body }),
  login: (identifier, password) => api('/account/login', { method: 'POST', body: { identifier, password } }),
  logout: () => api('/account/logout', { method: 'POST' }),
  me: () => api('/account/me'),
  updateProfile: (body) => api('/account/me', { method: 'PATCH', body }),
  changePassword: (currentPassword, newPassword) => api('/account/change-password', { method: 'POST', body: { currentPassword, newPassword } }),
  forgotPassword: (identifier) => api('/account/forgot-password', { method: 'POST', body: { identifier } }),
  resetPassword: (token, newPassword) => api('/account/reset-password', { method: 'POST', body: { token, newPassword } }),
};
