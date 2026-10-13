// Pure order rules (no DB, no npm deps -> unit-tested with `node --test`). Used by services/orderService.js.
// Fixes the 3 "known Orders server problems" from HANDOFF (restock on Returned, payment vs Refunded, search by redacted phone).

// (b) Once money has been (partly) refunded, the refund flow owns the payment status; the payment endpoint must not touch it.
const PAYMENT_LOCKED = ['Refunded', 'Partially Refunded'];
const canEditPayment = (paymentStatus) => !PAYMENT_LOCKED.includes(paymentStatus);

// (a) What happens to stock when staff move an order to `to`. `committed` = order.stockCommitted (set when it was Shipped).
//   Cancelled: committed -> units go back on the shelf; not yet committed -> just release the reservation.
//   Returned (only reachable from Shipped / Out For Delivery, i.e. the parcel came back unopened): units go back on the shelf.
//   Anything else: no stock effect here (Delivered -> returns are handled by returnService).
function stockEffect(to, committed) {
  if (to === 'Cancelled') return committed ? 'restock' : 'release';
  if (to === 'Returned') return committed ? 'restock_return' : null;
  return null;
}

// (c) Fields the admin order search may look at. A role that may not SEE the phone must not be able to find orders BY phone either.
function searchFields(denied) {
  const d = new Set(denied ? [...denied] : []);
  return d.has('customer.phone') ? ['orderNumber', 'customer.name'] : ['orderNumber', 'customer.name', 'customer.phone'];
}

module.exports = { PAYMENT_LOCKED, canEditPayment, stockEffect, searchFields };
