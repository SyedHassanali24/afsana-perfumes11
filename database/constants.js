// Single source of truth shared by models, seed, middleware (Phase 4) and the admin Sidebar `permission` keys.
const MODULES = [
  'dashboard','analytics','products','categories','collections','brands','inventory','suppliers','purchaseOrders',
  'orders','shipping','payments','returns','refunds','customers','carts','wishlists','abandonedCarts','reviews',
  'coupons','flashSales','giftBoxes','giftCards','loyalty','campaigns','homepage','navigation','banners','pages',
  'faq','announcements','finance','expenses','profit','reports','staff','roles','permissions','accessScope',
  'temporaryAccess','sessions','notifications','email','whatsapp','seo','tracking','auditLogs','security','backup','settings',
];
const ACTIONS = [
  'view','create','edit','delete','restore','export','import','approve','reject','publish','archive',
  'managePrice','manageStock','manageImages','manageSeo','refund','changeStatus',
];
const SCOPES = ['all','assigned','createdByMe','cities','categories','products','stores'];

// Permission keys are `${module}.${action}`. These always require re-auth/confirmation + audit log.
const HIGH_RISK = [
  'products.delete','customers.delete','refunds.refund','orders.refund','products.managePrice','inventory.manageStock',
  'customers.export','orders.export','staff.edit','roles.edit','permissions.edit','payments.edit','security.edit','settings.edit',
];
const RESTRICTABLE_FIELDS = [
  'customer.phone','customer.address','order.paymentDetails','product.costPrice','order.profit','order.internalNotes',
];
const ROLE_LEVEL = { owner: 100, superAdmin: 90, admin: 70, manager: 50, staff: 10 };

const ORDER_STATUSES = ['New','Confirmed','Processing','Packed','Shipped','Out For Delivery','Delivered','Cancelled','Return Requested','Returned','Refunded'];
const PAYMENT_STATUSES = ['Pending','Paid','Failed','Refunded','Partially Refunded'];
const PAYMENT_METHODS = ['COD','BANK_TRANSFER'];
const PRODUCT_STATUSES = ['Draft','Active','Inactive','Out of Stock','Archived'];
const STOCK_TX_TYPES = ['opening','restock','order','order_cancel','damaged','adjustment','return','po_receive'];

module.exports = {
  MODULES, ACTIONS, SCOPES, HIGH_RISK, RESTRICTABLE_FIELDS, ROLE_LEVEL,
  ORDER_STATUSES, PAYMENT_STATUSES, PAYMENT_METHODS, PRODUCT_STATUSES, STOCK_TX_TYPES,
};
