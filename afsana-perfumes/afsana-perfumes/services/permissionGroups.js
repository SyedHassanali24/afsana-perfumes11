// How the role editor groups modules. Every module in constants.MODULES must appear exactly once (unit-tested).
module.exports = [
  ['Overview', ['dashboard', 'analytics', 'reports']],
  ['Catalog', ['products', 'categories', 'collections', 'brands', 'inventory', 'suppliers', 'purchaseOrders']],
  ['Sales', ['orders', 'shipping', 'payments', 'returns', 'refunds', 'customers', 'carts', 'wishlists', 'abandonedCarts', 'reviews']],
  ['Marketing', ['coupons', 'flashSales', 'giftBoxes', 'giftCards', 'loyalty', 'campaigns']],
  ['Content', ['homepage', 'navigation', 'banners', 'pages', 'faq', 'announcements', 'seo']],
  ['Finance', ['finance', 'expenses', 'profit']],
  ['Team & security', ['staff', 'roles', 'permissions', 'accessScope', 'temporaryAccess', 'sessions', 'auditLogs', 'security']],
  ['System', ['notifications', 'email', 'whatsapp', 'tracking', 'backup', 'settings']],
];
