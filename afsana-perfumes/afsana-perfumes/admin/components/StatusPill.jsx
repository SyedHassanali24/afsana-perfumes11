// Maps a status string to a tone. Extend as new statuses are added.
const TONE_BY_STATUS = {
  // orders
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
  // stock
  "In Stock": "success",
  "Low Stock": "warning",
  "Out of Stock": "danger",
  // generic
  Active: "success",
  Inactive: "danger",
  Draft: "warning",
  Pending: "warning",
  Approved: "success",
  Rejected: "danger",
};

const TONE_CLASSES = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  gold: "bg-gold-soft text-gold",
};

export default function StatusPill({ status, tone }) {
  const resolvedTone = tone || TONE_BY_STATUS[status] || "gold";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium ${TONE_CLASSES[resolvedTone]}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
