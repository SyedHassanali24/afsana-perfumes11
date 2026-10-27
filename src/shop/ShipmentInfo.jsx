// Courier + tracking number + "Track with courier" link for the shopper (public tracker and "my order"). Renders nothing without a shipment.
// The server never sends staff notes; the link is only shown when it is a real https address.
export default function ShipmentInfo({ shipment }) {
  if (!shipment) return null;
  const safe = typeof shipment.trackingUrl === 'string' && /^https:\/\//i.test(shipment.trackingUrl);
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-card space-y-1 text-sm" data-testid="shipment-info">
      <p className="text-ink">Delivery: <span className="font-medium">{shipment.status}</span></p>
      {shipment.courier && <p className="text-ink-muted">Courier: {shipment.courier}</p>}
      {shipment.trackingNumber && <p className="text-ink-muted">Tracking number: <span className="text-ink">{shipment.trackingNumber}</span></p>}
      {safe && <a href={shipment.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-primary hover:underline">Track with courier</a>}
    </div>
  );
}
