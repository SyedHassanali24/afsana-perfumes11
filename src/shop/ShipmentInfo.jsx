// Courier + tracking number + "Track with courier" link for the shopper (public tracker and "my order"). Renders nothing without a shipment.
// The server never sends staff notes; the link is only shown when it is a real https address.
export default function ShipmentInfo({ shipment }) {
  if (!shipment) return null;
  const safe = typeof shipment.trackingUrl === 'string' && /^https:\/\//i.test(shipment.trackingUrl);
  return (
    <div className="rounded-xl border border-[#263e0e]/10 bg-[#faf8f4] p-4 shadow-[0_18px_50px_rgba(24,35,8,.06)] space-y-1 text-sm" data-testid="shipment-info">
      <p className="text-[#182308]">Delivery: <span className="font-medium">{shipment.status}</span></p>
      {shipment.courier && <p className="text-[#5f654f]">Courier: {shipment.courier}</p>}
      {shipment.trackingNumber && <p className="text-[#5f654f]">Tracking number: <span className="text-[#182308]">{shipment.trackingNumber}</span></p>}
      {safe && <a href={shipment.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-[#263e0e] hover:underline">Track with courier</a>}
    </div>
  );
}
