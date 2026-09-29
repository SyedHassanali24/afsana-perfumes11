import { useState } from "react";
import Button from "../components/Button";
import Drawer from "../components/Drawer";
import StatusPill from "../components/StatusPill";
import { Field, Select, Textarea } from "../components/FormFields";
import OrderTimeline from "./OrderTimeline";
import { ORDER_STATUS_FLOW } from "./mockOrdersData";

/**
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {object} order
 * @param {(orderId: string, status: string, internalNotes: string) => void} onUpdate
 */
export default function OrderDetailDrawer({ open, onClose, order, onUpdate }) {
  const [status, setStatus] = useState(order?.status);
  const [notes, setNotes] = useState(order?.internalNotes || "");

  if (!order) return null;

  const handleSave = () => {
    // Phase 3: PATCH /api/orders/:id { status, internalNotes } — server should
    // append the corresponding timeline event and write an audit log entry.
    onUpdate(order.id, status, notes);
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size="lg"
      title={order.id}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleSave}>Save changes</Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-ink">{order.customer}</p>
            <p className="text-xs text-ink-muted mt-0.5">{order.phone}</p>
            <p className="text-xs text-ink-muted">{order.address}</p>
          </div>
          <StatusPill status={order.paymentStatus} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Order status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {ORDER_STATUS_FLOW.concat(["Cancelled", "Return Requested", "Returned", "Refunded"]).map(
                (s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                )
              )}
            </Select>
          </Field>
          <div>
            <p className="text-sm text-ink mb-1.5">Payment method</p>
            <p className="text-sm text-ink-muted py-2">{order.paymentMethod}</p>
          </div>
        </div>

        <div>
          <p className="text-sm text-ink mb-2">Items</p>
          <div className="border border-border rounded-sm divide-y divide-border">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2.5 text-sm">
                <div>
                  <p className="text-ink">{item.name}</p>
                  <p className="text-ink-muted text-xs">
                    {item.variant} · Qty {item.qty}
                  </p>
                </div>
                <span className="text-ink">{item.price}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between text-ink-muted">
              <span>Subtotal</span>
              <span>{order.subtotal}</span>
            </div>
            <div className="flex justify-between text-ink-muted">
              <span>Shipping</span>
              <span>{order.shipping}</span>
            </div>
            <div className="flex justify-between text-ink-muted">
              <span>Discount</span>
              <span>-{order.discount}</span>
            </div>
            <div className="flex justify-between text-ink font-medium pt-1 border-t border-border">
              <span>Total</span>
              <span>{order.total}</span>
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm text-ink mb-3">Timeline</p>
          <OrderTimeline steps={order.timeline} />
        </div>

        <Field label="Internal notes" hint="Only visible to staff, never shown to the customer">
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add a note…" />
        </Field>
      </div>
    </Drawer>
  );
}
