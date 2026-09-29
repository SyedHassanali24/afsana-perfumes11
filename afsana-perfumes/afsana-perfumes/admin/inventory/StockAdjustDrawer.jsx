import { useState } from "react";
import Button from "../components/Button";
import Drawer from "../components/Drawer";
import { Field, Input, Select, Textarea } from "../components/FormFields";

const ADJUSTMENT_TYPES = ["Restock", "Damaged", "Stock Adjustment"];

/**
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {{id: string, name: string, current: number}} product
 * @param {(payload: {productId: string, type: string, quantity: number, reason: string}) => void} onSubmit
 */
export default function StockAdjustDrawer({ open, onClose, product, onSubmit }) {
  const [type, setType] = useState(ADJUSTMENT_TYPES[0]);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  if (!product) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!quantity || Number(quantity) === 0) {
      setError("Enter a non-zero quantity.");
      return;
    }
    if (!reason.trim()) {
      setError("A reason is required — this is written to the audit log.");
      return;
    }
    // Phase 3: POST /api/inventory/:productId/adjust — this must be an atomic
    // Mongo update (per spec's "Atomic inventory operations") and must write
    // an inventoryTransactions record with who/when/reason.
    onSubmit({
      productId: product.id,
      type,
      quantity: type === "Damaged" ? -Math.abs(Number(quantity)) : Number(quantity),
      reason,
    });
    setQuantity("");
    setReason("");
    setError("");
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Adjust stock — ${product.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" form="stock-adjust-form">
            Apply adjustment
          </Button>
        </>
      }
    >
      <form id="stock-adjust-form" onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-ink-muted">
          Current stock: <span className="text-ink">{product.current}</span>
        </p>

        <Field label="Adjustment type">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {ADJUSTMENT_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </Field>

        <Field label="Quantity" hint={type === "Damaged" ? "Enter as a positive number — it will be subtracted." : undefined}>
          <Input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="e.g. 20"
          />
        </Field>

        <Field label="Reason" error={error} hint="Required — recorded in the stock history and audit log.">
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Purchase order PO-0043 received"
          />
        </Field>
      </form>
    </Drawer>
  );
}
