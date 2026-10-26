// Pure: keeps exactly one default address in a customer's list (mutates and returns the array).
const MAX_ADDRESSES = 10;
function normalizeDefaults(list, preferredId) {
  if (!list.length) return list;
  const pref = preferredId ? list.find((a) => String(a._id) === String(preferredId)) : null;
  const chosen = pref || list.find((a) => a.isDefault) || list[0];
  list.forEach((a) => { a.isDefault = a === chosen; });
  return list;
}
module.exports = { MAX_ADDRESSES, normalizeDefaults };
