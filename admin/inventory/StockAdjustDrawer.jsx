import { useEffect, useState } from "react";
import Button from "../components/Button";
import Drawer from "../components/Drawer";
import ConfirmPasswordModal from "../components/ConfirmPasswordModal";
import { Field, Input, Select, Textarea } from "../components/FormFields";
import { inventoryApi } from "../../src/services";
import { useAuth } from "../../src/auth/AuthContext";

const TYPES = [
  { value: "restock", label: "Restock (add units)" },
  { value: "damaged", label: "Damaged (remove units)" },
  { value: "adjustment", label: "Correction (count was wrong)" },
];

/** item = a row from GET /inventory. Adjusting stock always asks for the user's password and is audited. */
export default function StockAdjustDrawer({ open, item, onClose, onDone }) {
  const { can } = useAuth();
  const [type, setType] = useState("restock");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [threshold, setThreshold] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [ask, setAsk] = useState(false);

  useEffect(() => { if (open && item) { setType("restock"); setQty(""); setReason(""); setError(""); setNote(""); setAsk(false); setThreshold(String(item.lowStockThreshold)); } }, [open, item]);
  if (!item) return null;

  const n = Number(qty);
  const delta = !qty || Number.isNaN(n) ? 0 : type === "damaged" ? -Math.abs(n) : type === "restock" ? Math.abs(n) : n;
  const after = item.current + delta;
  const canAdjust = can("inventory.manageStock");

  const submit = (e) => {
    e.preventDefault(); setError("");
    if (!Number.isInteger(n) || n === 0) return setError("Enter a whole number, not zero.");
    if (type !== "adjustment" && n < 0) return setError("Enter a positive number.");
    if (reason.trim().length < 3) return setError("A reason is required: it is saved in the audit log.");
    if (after < item.reserved) return setError(`Stock can't go below ${item.reserved} (reserved for open orders).`);
    setAsk(true);
  };
  const apply = async (pw) => {
    await inventoryApi.adjust({ variantId: item.variantId, type, quantity: type === "adjustment" ? n : Math.abs(n), reason: reason.trim(), confirmPassword: pw });
    onDone("Stock updated.");
  };
  const saveThreshold = async () => {
    setError(""); setNote("");
    const t = Number(threshold);
    if (!Number.isInteger(t) || t < 0) return setError("Alert level must be a whole number, 0 or more.");
    try { await inventoryApi.setThreshold(item.variantId, t); setNote("Alert level saved."); onDone(null); } catch (e) { setError(e.message); }
  };

  return (
    <>
      <Drawer open={open} onClose={onClose} title={`${item.productName} · ${item.label}`}
        footer={<><Button variant="secondary" type="button" onClick={onClose}>Close</Button>{canAdjust && <Button type="submit" form="stock-adjust-form">Apply adjustment</Button>}</>}>
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3 text-center">
            {[["On hand", item.current], ["Reserved", item.reserved], ["Available", item.available]].map(([l, v]) => (
              <div key={l} className="bg-bg rounded-sm py-3"><p className="text-xl text-ink font-display">{v}</p><p className="text-xs text-ink-muted">{l}</p></div>
            ))}
          </div>
          {error && <p role="alert" className="text-sm text-danger bg-danger-soft rounded-sm px-3 py-2">{error}</p>}
          {note && <p role="status" className="text-sm text-success bg-success-soft rounded-sm px-3 py-2">{note}</p>}

          {canAdjust ? (
            <form id="stock-adjust-form" onSubmit={submit} className="space-y-4">
              <Field label="What happened?"><Select value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select></Field>
              <Field label={type === "adjustment" ? "Change by (use − to remove)" : "Units"} hint={qty && delta ? `On hand becomes ${after}` : undefined}>
                <Input type="number" step="1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="e.g. 20" />
              </Field>
              <Field label="Reason"><Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Supplier delivery, cracked bottles, recount" /></Field>
            </form>
          ) : <p className="text-sm text-ink-muted">You can view stock but not change it.</p>}

          {can("inventory.edit") && (
            <div className="border-t border-border pt-4 flex items-end gap-3">
              <div className="flex-1"><Field label="Low-stock alert level" hint="Shown as Low Stock at or below this many available units"><Input type="number" min="0" value={threshold} onChange={(e) => setThreshold(e.target.value)} /></Field></div>
              <Button variant="secondary" onClick={saveThreshold}>Save</Button>
            </div>
          )}
        </div>
      </Drawer>
      <ConfirmPasswordModal open={ask} title="Confirm stock change" message={`${item.productName} ${item.label}: ${item.current} → ${after}`} confirmLabel="Apply" onClose={() => setAsk(false)} onConfirm={apply} />
    </>
  );
}
