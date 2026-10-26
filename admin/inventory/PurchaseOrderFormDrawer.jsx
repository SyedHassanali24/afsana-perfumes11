import { useEffect, useState } from "react";
import { X } from "lucide-react";
import Button from "../components/Button";
import Drawer from "../components/Drawer";
import { Field, Input, Select } from "../components/FormFields";
import VariantPicker from "./VariantPicker";
import useApi from "../../src/hooks/useApi";
import { purchaseOrdersApi, suppliersApi } from "../../src/services";

const money = (n) => `PKR ${Number(n || 0).toLocaleString("en-PK")}`;
const dateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

/** po = an existing Draft order to edit, or null to create. */
export default function PurchaseOrderFormDrawer({ open, po, onClose, onSaved }) {
  const { data } = useApi(() => (open ? suppliersApi.list({ active: true, limit: 100 }) : Promise.resolve({ suppliers: [] })), [open]);
  const suppliers = data?.suppliers || [];
  const [supplierId, setSupplierId] = useState("");
  const [expected, setExpected] = useState("");
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setSupplierId(po?.supplier?.id || ""); setExpected(dateInput(po?.expectedDate));
    setRows(po ? po.items.map((i) => ({ variantId: String(i.variantId), name: `${i.productName} · ${i.label}`, sku: i.sku, quantity: String(i.quantity), cost: String(i.costPerUnit ?? "") })) : []);
  }, [open, po]);

  const setRow = (id, k, val) => setRows((rs) => rs.map((r) => (r.variantId === id ? { ...r, [k]: val } : r)));
  const total = rows.reduce((n, r) => n + (Number(r.quantity) || 0) * (Number(r.cost) || 0), 0);

  const submit = async (e) => {
    e.preventDefault(); setError("");
    if (!supplierId) return setError("Choose a supplier.");
    if (!rows.length) return setError("Add at least one product.");
    for (const r of rows) {
      if (!Number.isInteger(Number(r.quantity)) || Number(r.quantity) < 1) return setError(`Enter a quantity for ${r.name}.`);
      if (r.cost === "" || Number(r.cost) < 0) return setError(`Enter the cost per unit for ${r.name}.`);
    }
    const body = { supplierId, items: rows.map((r) => ({ variantId: r.variantId, quantity: Number(r.quantity), costPerUnit: Number(r.cost) })), ...(expected ? { expectedDate: new Date(`${expected}T00:00:00`).toISOString() } : {}) };
    setBusy(true);
    try { po ? await purchaseOrdersApi.update(po.id, body) : await purchaseOrdersApi.create(body); onSaved(); }
    catch (err) { setError(err.details?.[0] ? `${err.details[0].path}: ${err.details[0].message}` : err.message); }
    finally { setBusy(false); }
  };

  return (
    <Drawer open={open} onClose={onClose} size="lg" title={po ? `Edit ${po.poNumber}` : "New purchase order"}
      footer={<><Button variant="secondary" type="button" onClick={onClose}>Cancel</Button><Button type="submit" form="po-form" disabled={busy}>{busy ? "Saving…" : "Save draft"}</Button></>}>
      <form id="po-form" onSubmit={submit} className="space-y-5">
        {error && <p role="alert" className="text-sm text-danger bg-danger-soft rounded-sm px-3 py-2">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Supplier">
            <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="" disabled>Select…</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              {po && !suppliers.some((s) => s.id === po.supplier.id) && <option value={po.supplier.id}>{po.supplier.name || "Current supplier"}</option>}
            </Select>
          </Field>
          <Field label="Expected delivery" hint="Optional"><Input type="date" value={expected} onChange={(e) => setExpected(e.target.value)} /></Field>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-ink">Products</p>
          <VariantPicker exclude={rows.map((r) => r.variantId)} onPick={(i) => setRows((rs) => [...rs, { variantId: String(i.variantId), name: `${i.productName} · ${i.label}`, sku: i.sku, quantity: "1", cost: "" }])} />
          {rows.length === 0 && <p className="text-sm text-ink-muted py-3">Search above to add the perfumes you're ordering.</p>}
          {rows.map((r) => (
            <div key={r.variantId} className="grid grid-cols-[1fr_5.5rem_7rem_2rem] gap-2 items-end border-b border-border pb-2">
              <div className="text-sm text-ink">{r.name}<span className="block text-xs text-ink-muted">{r.sku}</span></div>
              <Field label="Qty"><Input type="number" min="1" value={r.quantity} onChange={(e) => setRow(r.variantId, "quantity", e.target.value)} /></Field>
              <Field label="Cost / unit"><Input type="number" min="0" value={r.cost} onChange={(e) => setRow(r.variantId, "cost", e.target.value)} /></Field>
              <button type="button" onClick={() => setRows((rs) => rs.filter((x) => x.variantId !== r.variantId))} className="p-2 text-ink-muted hover:text-danger" aria-label={`Remove ${r.name}`}><X className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
        <p className="text-sm text-ink text-right">Total: <span className="font-medium">{money(total)}</span></p>
      </form>
    </Drawer>
  );
}
