const mongoose = require('mongoose');
const { Schema } = mongoose;
const { ObjectId } = Schema.Types;
const C = require('../constants');
const { storeScoped, model: m } = require('./_plugins');
const model = (n, s) => m(mongoose, n, s);

// Atomic counter -> ORD-000123 style numbers without races.
const counterSchema = new Schema({ _id: String, seq: { type: Number, default: 0 } });
const Counter = model('Counter', counterSchema);
async function nextNumber(key, prefix, pad = 6) {
  const c = await Counter.findByIdAndUpdate(key, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return `${prefix}-${String(c.seq).padStart(pad, '0')}`;
}

const timelineSchema = new Schema({
  event: String, status: String, note: String, by: { type: ObjectId, ref: 'User' }, at: { type: Date, default: Date.now },
}, { _id: false });

const orderSchema = new Schema({
  orderNumber: { type: String, required: true, unique: true },
  customerId: { type: ObjectId, ref: 'Customer', index: true }, // null allowed for guest checkout
  customer: { name: String, phone: String, email: String },       // snapshot at purchase time
  shippingAddress: { fullName: String, phone: String, line1: String, line2: String, city: String, postalCode: String },
  subtotal: Number, shipping: { type: Number, default: 0 }, discount: { type: Number, default: 0 }, total: Number,
  couponCode: String,
  paymentMethod: { type: String, enum: C.PAYMENT_METHODS, required: true },
  paymentStatus: { type: String, enum: C.PAYMENT_STATUSES, default: 'Pending', index: true },
  status: { type: String, enum: C.ORDER_STATUSES, default: 'New' },
  timeline: [timelineSchema],
  internalNotes: [{ text: String, by: { type: ObjectId, ref: 'User' }, at: { type: Date, default: Date.now } }], // never sent to customer
  assignedTo: { type: ObjectId, ref: 'User' },    // for "Assigned Records Only" scope
  createdBy: { type: ObjectId, ref: 'User' },     // for "Created By Me" scope
  cancelledReason: String,
  stockCommitted: { type: Boolean, default: false }, // true once reserved units have left the shelf (on Shipped)
  returnRevision: { type: Number, default: 0 },      // Phase 7: bumped by every return/refund write -> acts as a lock so two staff/shoppers cannot over-return or over-refund
}, { timestamps: true });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'shippingAddress.city': 1 });
storeScoped(orderSchema);

const orderItemSchema = new Schema({
  orderId: { type: ObjectId, ref: 'Order', required: true, index: true },
  productId: { type: ObjectId, ref: 'Product', required: true },
  variantId: { type: ObjectId, ref: 'ProductVariant', required: true },
  name: String, sku: String, sizeMl: Number, image: String,      // snapshots
  unitPrice: { type: Number, required: true },
  costPrice: Number,                                              // snapshot -> profit reports
  quantity: { type: Number, required: true, min: 1 },
  lineTotal: Number,
}, { timestamps: true });

const paymentSchema = new Schema({
  orderId: { type: ObjectId, ref: 'Order', required: true, index: true },
  method: { type: String, enum: C.PAYMENT_METHODS },
  amount: Number,
  status: { type: String, enum: C.PAYMENT_STATUSES, default: 'Pending' },
  reference: String, proofUrl: String, // bank-transfer receipt
  receivedBy: { type: ObjectId, ref: 'User' }, receivedAt: Date,
}, { timestamps: true });

const courierSchema = new Schema({
  name: { type: String, required: true }, trackingUrlTemplate: String, // ".../{trackingNumber}"
  apiStatus: { type: String, enum: ['Manual', 'Connected', 'Error'], default: 'Manual' }, isActive: { type: Boolean, default: true },
});
const shippingRateSchema = new Schema({
  zone: { name: String, cities: [String] }, method: String,
  baseRate: Number, freeAbove: Number, estDays: String, isActive: { type: Boolean, default: true },
});
const shipmentSchema = new Schema({
  orderId: { type: ObjectId, ref: 'Order', required: true, index: true },
  courierId: { type: ObjectId, ref: 'Courier' },
  trackingNumber: String,
  status: { type: String, enum: ['Pending', 'Picked Up', 'In Transit', 'Out For Delivery', 'Delivered', 'Failed', 'Returned'], default: 'Pending' },
  events: [{ status: String, note: String, at: { type: Date, default: Date.now } }],
}, { timestamps: true });

const returnSchema = new Schema({
  returnNumber: { type: String, required: true, unique: true },   // RET-000001
  orderId: { type: ObjectId, ref: 'Order', required: true, index: true },
  orderNumber: String,                                            // snapshot
  customerId: { type: ObjectId, ref: 'Customer', index: true },
  customer: { name: String, phone: String },                      // snapshot (phone follows the customer.phone field rule)
  city: String,                                                   // snapshot: makes the "cities" access scope work on this collection
  items: [{
    orderItemId: { type: ObjectId, required: true }, productId: ObjectId, variantId: ObjectId,
    name: String, sku: String, sizeMl: Number, unitPrice: Number, quantity: { type: Number, required: true, min: 1 },
  }],
  reason: { type: String, enum: C.RETURN_REASONS, required: true }, details: String,
  source: { type: String, enum: ['customer', 'staff'], default: 'customer' },
  status: { type: String, enum: C.RETURN_STATUSES, default: 'Pending', index: true },
  decisionNote: String,                                           // shown to the customer (why rejected, what happens next)
  condition: { type: String, enum: C.RETURN_CONDITIONS },         // set when goods are received back
  receivedAt: Date, refundedAt: Date, refundedAmount: { type: Number, default: 0 },
  timeline: [timelineSchema],
  handledBy: { type: ObjectId, ref: 'User' },
  createdBy: { type: ObjectId, ref: 'User' }, assignedTo: { type: ObjectId, ref: 'User' },
}, { timestamps: true });
returnSchema.index({ createdAt: -1 });
storeScoped(returnSchema);

const refundSchema = new Schema({
  orderId: { type: ObjectId, ref: 'Order', required: true, index: true },
  orderNumber: String,
  returnId: { type: ObjectId, ref: 'Return', index: true },
  customerId: { type: ObjectId, ref: 'Customer' },
  amount: { type: Number, required: true, min: 1 }, reason: { type: String, required: true },
  method: { type: String, enum: C.REFUND_METHODS, default: 'Bank Transfer' }, reference: String,
  approvedBy: { type: ObjectId, ref: 'User', required: true },
}, { timestamps: true });
refundSchema.index({ createdAt: -1 });
storeScoped(refundSchema);

const cartSchema = new Schema({
  customerId: { type: ObjectId, ref: 'Customer', index: true },
  guestToken: { type: String, index: true },
  items: [{ productId: ObjectId, variantId: ObjectId, quantity: { type: Number, min: 1 } }],
  couponCode: String,
  lastActivityAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

const abandonedCartSchema = new Schema({
  cartId: { type: ObjectId, ref: 'Cart', unique: true },
  customerId: { type: ObjectId, ref: 'Customer' },
  items: Schema.Types.Mixed, cartValue: Number, lastActivityAt: Date,
  reminderCount: { type: Number, default: 0 }, recovered: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = {
  Counter, nextNumber,
  Order: model('Order', orderSchema),
  OrderItem: model('OrderItem', orderItemSchema),
  Payment: model('Payment', paymentSchema),
  Courier: model('Courier', courierSchema),
  ShippingRate: model('ShippingRate', shippingRateSchema),
  Shipment: model('Shipment', shipmentSchema),
  Return: model('Return', returnSchema),
  Refund: model('Refund', refundSchema),
  Cart: model('Cart', cartSchema),
  AbandonedCart: model('AbandonedCart', abandonedCartSchema),
};
