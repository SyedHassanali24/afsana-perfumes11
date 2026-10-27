// Maps a status string to a tone. Extend as new statuses are added.
const TONE_BY_STATUS = {
  New: "warning",
  Confirmed: "gold",
  Processing: "gold",
  Packed: "gold",
  Shipped: "success",
  "Out For Delivery": "success",
  Delivered: "success",
  Cancelled: "danger",
  "Return Requested": "warning",
  Returned: "danger",
  Refunded: "danger",
  "In Stock": "success",
  "Low Stock": "warning",
  "Out of Stock": "danger",
  Ordered: "gold",
  "Partially Received": "warning",
  Received: "success",
  Active: "success",
  Inactive: "danger",
  Suspended: "warning",
  Disabled: "danger",
  Draft: "warning",
  Pending: "warning",
  Approved: "success",
  Rejected: "danger",
};

const TONE_CLASSES = {
  success: "bg-[#e6f0e4] text-[#3d6b3d]",
  warning: "bg-[#f5eedb] text-[#8a6a22]",
  danger: "bg-[#f7e7e5] text-[#9b3f3f]",
  gold: "bg-[#e7ead9] text-[#748e40]",
};

export default function StatusPill({ status, tone }) {
  const resolvedTone = tone || TONE_BY_STATUS[status] || "gold";
  return (
    <span className={"inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold " + TONE_CLASSES[resolvedTone]}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
