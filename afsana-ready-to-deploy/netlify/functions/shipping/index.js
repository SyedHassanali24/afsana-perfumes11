const { createHandler } = require('../../../middleware/withApi');
const { res } = require('../../../middleware/http');
const S = require('../../../validation/schemas');
const Sh = require('../../../services/shippingService');

// All routes are staff-only. The shopper sees shipment info through the order tracker / "my order" (services/orderService), not here.
// Creating a shipment uses the 'shipping.create' scopes to decide which orders the staff member may ship; changing one uses 'shipping.edit'.
const routes = [
  { method: 'GET', path: '/admin', permission: ['shipping', 'view'], handler: ({ ctx, scopes }) => Sh.listAdmin(scopes, ctx.user._id) },
  { method: 'POST', path: '/admin/couriers', permission: ['shipping', 'create'], body: S.courierBody, handler: async ({ ctx, body }) => res(201, await Sh.createCourier(ctx, body)) },
  { method: 'PATCH', path: '/admin/couriers/:id', permission: ['shipping', 'edit'], body: S.courierPatch, handler: ({ ctx, params, body }) => Sh.updateCourier(ctx, params.id, body) },
  { method: 'POST', path: '/admin/rates', permission: ['shipping', 'create'], body: S.shippingRateBody, handler: async ({ ctx, body }) => res(201, await Sh.createRate(ctx, body)) },
  { method: 'PATCH', path: '/admin/rates/:id', permission: ['shipping', 'edit'], body: S.shippingRatePatch, handler: ({ ctx, params, body }) => Sh.updateRate(ctx, params.id, body) },
  { method: 'POST', path: '/admin/orders/:orderId/shipment', permission: ['shipping', 'create'], body: S.shipmentBody, handler: async ({ ctx, params, body, scopes }) => res(201, await Sh.createShipment(ctx, params.orderId, body, scopes)) },
  { method: 'PATCH', path: '/admin/shipments/:id', permission: ['shipping', 'edit'], body: S.shipmentPatch, handler: ({ ctx, params, body, scopes }) => Sh.updateShipment(ctx, params.id, body, scopes) },
];
exports.handler = createHandler('shipping', routes);
