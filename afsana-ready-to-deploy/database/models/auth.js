const mongoose = require('mongoose');
const { Schema } = mongoose;
const { ObjectId } = Schema.Types;
const C = require('../constants');
const { softDelete, storeScoped, model: m } = require('./_plugins');
const model = (n, s) => m(mongoose, n, s);

// ---- users: login identity for BOTH staff and customers ----
const userSchema = new Schema({
  kind: { type: String, enum: ['staff', 'customer'], required: true, index: true },
  email: { type: String, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  passwordHash: { type: String, required: true, select: false },
  status: { type: String, enum: ['Active', 'Suspended', 'Disabled'], default: 'Active' },
  failedLoginCount: { type: Number, default: 0 },
  lockedUntil: Date,
  lastLoginAt: Date,
  passwordChangedAt: Date,
  mustChangePassword: { type: Boolean, default: false },
  resetTokenHash: { type: String, select: false },
  resetTokenExpires: Date,
}, { timestamps: true });
userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });
storeScoped(userSchema);

// ---- sessions: server-side record behind the HTTP-only cookie (listable, revocable) ----
const sessionSchema = new Schema({
  userId: { type: ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  device: { userAgent: String, ip: String, label: String },
  lastActiveAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  revokedAt: Date,
  revokedReason: String,
}, { timestamps: true });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL cleanup

// ---- permissions: catalog of every `module.action` (seeded) ----
const permissionSchema = new Schema({
  key: { type: String, required: true, unique: true },
  module: { type: String, enum: C.MODULES, required: true },
  action: { type: String, enum: C.ACTIONS, required: true },
  isHighRisk: { type: Boolean, default: false },
  description: String,
});

// ---- roles: User -> Role -> Grants -> Scope ----
const grantSchema = new Schema({
  module: { type: String, enum: C.MODULES, required: true },
  actions: [{ type: String, enum: C.ACTIONS }],
  scope: {
    kind: { type: String, enum: C.SCOPES, default: 'all' },
    values: [String], // cities / category ids / product ids / store ids depending on kind
  },
}, { _id: false });

const roleSchema = new Schema({
  key: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: String,
  isSystem: { type: Boolean, default: false },       // system roles: cannot be deleted/renamed
  isUnrestricted: { type: Boolean, default: false }, // Owner only: bypasses grants, still audited
  level: { type: Number, default: 10 },              // you can only manage roles with a lower level
  grants: [grantSchema],
  deniedFields: [{ type: String, enum: C.RESTRICTABLE_FIELDS }],
}, { timestamps: true });
storeScoped(roleSchema);
softDelete(roleSchema);

// ---- staff: profile + per-user overrides (temporary access) + working hours ----
const overrideSchema = new Schema({
  effect: { type: String, enum: ['allow', 'deny'], default: 'allow' },
  grant: grantSchema,
  startsAt: Date,
  expiresAt: Date, // resolver ignores overrides outside [startsAt, expiresAt] -> automatic expiry
  reason: String,
  grantedBy: { type: ObjectId, ref: 'User' },
});

const staffSchema = new Schema({
  userId: { type: ObjectId, ref: 'User', required: true, unique: true },
  name: { type: String, required: true },
  roleId: { type: ObjectId, ref: 'Role', required: true, index: true },
  overrides: [overrideSchema],
  deniedFields: [{ type: String, enum: C.RESTRICTABLE_FIELDS }], // added on top of role's
  workingHours: {
    enabled: { type: Boolean, default: false },
    days: [{ type: Number, min: 0, max: 6 }], // 0 = Sunday
    start: String, // "09:00"
    end: String,   // "18:00"
    timezone: { type: String, default: 'Asia/Karachi' },
  },
  status: { type: String, enum: ['Active', 'Suspended', 'Disabled'], default: 'Active', index: true },
  createdBy: { type: ObjectId, ref: 'User' },
}, { timestamps: true });
storeScoped(staffSchema);
softDelete(staffSchema);

// ---- permission history: append-only ----
const permissionHistorySchema = new Schema({
  staffId: { type: ObjectId, ref: 'Staff', index: true },
  roleId: { type: ObjectId, ref: 'Role' },
  changedBy: { type: ObjectId, ref: 'User', required: true },
  change: { type: String, required: true }, // 'role_assigned' | 'override_added' | 'grants_updated' ...
  before: Schema.Types.Mixed,
  after: Schema.Types.Mixed,
}, { timestamps: { createdAt: true, updatedAt: false } });

// ---- customers: shopper profile (credentials live in users) ----
const addressSchema = new Schema({
  type: { type: String, enum: ['Home', 'Office', 'Other'], default: 'Home' },
  fullName: String, phone: String, line1: String, line2: String, city: String, postalCode: String,
  isDefault: { type: Boolean, default: false },
});
const customerSchema = new Schema({
  userId: { type: ObjectId, ref: 'User', index: true },
  name: { type: String, required: true },
  phone: String,
  email: { type: String, lowercase: true },
  city: { type: String, index: true },
  addresses: [addressSchema],
  segment: { type: String, enum: ['New', 'Repeat', 'VIP', 'Inactive'], default: 'New', index: true },
  stats: {
    ordersCount: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    lastOrderAt: Date,
  },
  loyaltyPoints: { type: Number, default: 0 },
  notes: String, // staff-only
}, { timestamps: true });
customerSchema.index({ phone: 1 });
customerSchema.index({ email: 1 });
storeScoped(customerSchema);
softDelete(customerSchema);

module.exports = {
  User: model('User', userSchema),
  Session: model('Session', sessionSchema),
  Permission: model('Permission', permissionSchema),
  Role: model('Role', roleSchema),
  Staff: model('Staff', staffSchema),
  PermissionHistory: model('PermissionHistory', permissionHistorySchema),
  Customer: model('Customer', customerSchema),
};
