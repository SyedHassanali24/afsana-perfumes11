const SHIPMENT_STATUSES = ['Pending', 'Picked Up', 'In Transit', 'Out For Delivery', 'Delivered', 'Failed', 'Returned'];
const canCreateShipment = (orderStatus) => ['Confirmed', 'Processing', 'Packed'].includes(orderStatus);
const isShipmentTerminal = (status) => ['Delivered', 'Returned'].includes(status);
function matchShippingRate(rates, city, subtotal = 0) {
  const normalizedCity = String(city || '').trim().toLocaleLowerCase();
  if (!normalizedCity) return null;
  const matches = (rates || []).filter((rate) => rate && rate.isActive !== false &&
    Array.isArray(rate.zone?.cities) && rate.zone.cities.some((candidate) =>
      String(candidate || '').trim().toLocaleLowerCase() === normalizedCity));
  // If several methods/zones cover a city, use the lowest actual fee because checkout has no method selector yet.
  matches.sort((a, b) => {
    const fee = (r) => r.freeAbove != null && subtotal >= r.freeAbove ? 0 : Math.max(0, Number(r.baseRate) || 0);
    return fee(a) - fee(b) || (Number(a.baseRate) || 0) - (Number(b.baseRate) || 0) || String(a.method || '').localeCompare(String(b.method || ''));
  });
  return matches[0] || null;
}
function shippingForCity(rate, subtotal, fallback) {
  if (!rate) return { fee: Number(fallback.freeAbove) === 0 || (Number(fallback.freeAbove) > 0 && subtotal >= fallback.freeAbove) ? 0 : fallback.flatRate, method: 'Standard', zone: '', estDays: '', source: 'default' };
  const fee = rate.freeAbove != null && subtotal >= rate.freeAbove ? 0 : Math.max(0, Number(rate.baseRate) || 0);
  return { fee, method: rate.method || 'Standard', zone: rate.zone?.name || '', estDays: rate.estDays || '', source: 'zone' };
}
function trackingUrl(courier, number) {
  if (!courier?.trackingUrlTemplate || !number) return '';
  if (!/^https:\/\//i.test(courier.trackingUrlTemplate) || !courier.trackingUrlTemplate.includes('{trackingNumber}')) return '';
  return courier.trackingUrlTemplate.replace(/\{trackingNumber\}/g, encodeURIComponent(number));
}
// Shipment status -> the order status it implies. Pending / Failed never change the order (a failed delivery is a staff decision).
const ORDER_FLOW = ['Packed', 'Shipped', 'Out For Delivery', 'Delivered'];
const SHIPMENT_TO_ORDER = { 'Picked Up': 'Shipped', 'In Transit': 'Shipped', 'Out For Delivery': 'Out For Delivery', Delivered: 'Delivered', Returned: 'Returned' };
// Which order-status steps (in order) must be applied so the order follows its shipment. Pure: the caller applies each step through
// orderService.changeStatus, so stock commit / COD paid / restock rules stay in ONE place. Never moves an order backwards.
// Returns { steps: string[], message: string }  (message is '' when nothing needs saying).
function orderStepsForShipment(orderStatus, shipmentStatus) {
  const target = SHIPMENT_TO_ORDER[shipmentStatus];
  if (!target) return { steps: [], message: '' };
  if (target === 'Returned') {
    if (['Shipped', 'Out For Delivery'].includes(orderStatus)) return { steps: ['Returned'], message: '' };
    if (orderStatus === 'Returned') return { steps: [], message: '' };
    return { steps: [], message: `Order is "${orderStatus}", so its status was not changed. Update the order by hand if needed.` };
  }
  const from = ORDER_FLOW.indexOf(orderStatus);
  const to = ORDER_FLOW.indexOf(target);
  if (from < 0) {
    if (['Confirmed', 'Processing'].includes(orderStatus)) return { steps: [], message: 'Order status was not changed because the order is not Packed yet. Mark it Packed in Orders, then save the shipment again.' };
    return { steps: [], message: ['Shipped', 'Out For Delivery', 'Delivered', 'Returned'].includes(orderStatus) ? '' : `Order is "${orderStatus}", so its status was not changed.` };
  }
  if (from >= to) return { steps: [], message: '' };
  const steps = ORDER_FLOW.slice(from + 1, to + 1).filter((st) => st === target || st === 'Shipped');
  return { steps, message: '' };
}
module.exports = { SHIPMENT_STATUSES, canCreateShipment, isShipmentTerminal, trackingUrl, matchShippingRate, shippingForCity, orderStepsForShipment };
