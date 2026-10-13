const mongoose = require('mongoose');
const { Schema } = mongoose;
const { ObjectId } = Schema.Types;
const C = require('../constants');
const { softDelete, storeScoped, model: m } = require('./_plugins');
const model = (n, s) => m(mongoose, n, s);

// One inventory document per VARIANT. Available = current - reserved (virtual, never stored).
const inventorySchema = new Schema({
  variantId: { type: ObjectId, ref: 'ProductVariant', required: true, unique: true },
  productId: { type: ObjectId, ref: 'Product', required: true, index: true },
  current: { type: Number, default: 0, min: 0 },
  reserved: { type: Number, default: 0, min: 0 },
  damaged: { type: Number, default: 0, min: 0 },
  incoming: { type: Number, default: 0, min: 0 },
  lowStockThreshold: { type: Number, default: 5 },
}, { timestamps: true });
inventorySchema.virtual('available').get(function () { return this.current - this.reserved; });
storeScoped(inventorySchema);

// ---- Atomic operations: the condition is INSIDE the update, so two buyers can never both win the last unit ----
// Returns the updated doc, or null when stock was insufficient. Pass { session } inside a transaction.
inventorySchema.statics.reserve = function (variantId, qty, opts = {}) {
  return this.findOneAndUpdate(
    { variantId, $expr: { $gte: [{ $subtract: ['$current', '$reserved'] }, qty] } },
    { $inc: { reserved: qty } },
    { new: true, ...opts },
  );
};
inventorySchema.statics.release = function (variantId, qty, opts = {}) {
  return this.findOneAndUpdate({ variantId, reserved: { $gte: qty } }, { $inc: { reserved: -qty } }, { new: true, ...opts });
};
// On shipment/confirmation: reserved units leave the shelf.
inventorySchema.statics.commit = function (variantId, qty, opts = {}) {
  return this.findOneAndUpdate(
    { variantId, reserved: { $gte: qty }, current: { $gte: qty } },
    { $inc: { reserved: -qty, current: -qty } }, { new: true, ...opts });
};

const inventoryTxSchema = new Schema({
  variantId: { type: ObjectId, ref: 'ProductVariant', required: true },
  productId: { type: ObjectId, ref: 'Product', required: true },
  type: { type: String, enum: C.STOCK_TX_TYPES, required: true },
  delta: { type: Number, required: true },
  before: Number, after: Number,
  reason: { type: String, required: function () { return ['adjustment', 'damaged'].includes(this.type); } },
  ref: { kind: String, id: ObjectId }, // Order / PurchaseOrder
  by: { type: ObjectId, ref: 'User' },
}, { timestamps: { createdAt: true, updatedAt: false } });
inventoryTxSchema.index({ variantId: 1, createdAt: -1 });
inventoryTxSchema.index({ createdAt: -1 });

const supplierSchema = new Schema({
  name: { type: String, required: true },
  contactPerson: String, phone: String, email: String, address: String,
  productIds: [{ type: ObjectId, ref: 'Product' }],
  paymentTerms: String, notes: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
storeScoped(supplierSchema); softDelete(supplierSchema);

const poSchema = new Schema({
  poNumber: { type: String, required: true, unique: true },
  supplierId: { type: ObjectId, ref: 'Supplier', required: true, index: true },
  items: [{
    productId: { type: ObjectId, ref: 'Product', required: true },
    variantId: { type: ObjectId, ref: 'ProductVariant', required: true },
    quantity: { type: Number, min: 1, required: true },
    costPerUnit: { type: Number, min: 0, required: true },
    receivedQuantity: { type: Number, default: 0 },
  }],
  totalCost: Number,
  status: { type: String, enum: ['Draft', 'Ordered', 'Partially Received', 'Received', 'Cancelled'], default: 'Draft', index: true },
  expectedDate: Date,
  createdBy: { type: ObjectId, ref: 'User' },
}, { timestamps: true });
storeScoped(poSchema);

module.exports = {
  Inventory: model('Inventory', inventorySchema),
  InventoryTransaction: model('InventoryTransaction', inventoryTxSchema),
  Supplier: model('Supplier', supplierSchema),
  PurchaseOrder: model('PurchaseOrder', poSchema),
};
