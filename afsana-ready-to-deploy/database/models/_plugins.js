const { Schema } = require('mongoose');
const { ObjectId } = Schema.Types;

// isDeleted flag + who/when. Queries must filter { isDeleted: false } (helpers arrive in Phase 3).
function softDelete(schema) {
  schema.add({
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    deletedBy: { type: ObjectId, ref: 'User' },
  });
}
// Multi-store readiness: always 'main' today, no UI for it.
function storeScoped(schema) {
  schema.add({ storeId: { type: String, default: 'main', index: true } });
}
const model = (mongoose, name, schema) => mongoose.models[name] || mongoose.model(name, schema);
module.exports = { softDelete, storeScoped, model };
