import { useEffect, useState } from "react";
import Button from "../components/Button";
import Drawer from "../components/Drawer";
import { Field, Input, Select, Textarea } from "../components/FormFields";
import { returnsApi } from "../../src/services";

const REASONS = ["Wrong Product", "Damaged", "Not Satisfied", "Other"];
const money = (n) => `PKR ${Number(n || 0).toLocaleString("en-PK")}`;

// Log a return on behalf of a customer (phone / WhatsApp request, or a guest who cannot sign in). Late returns are allowed for staff.
export default function NewReturnDrawer({ open, onClose, onCreated }) {
  const [orderNo, setOrderNo] = useState("");
  const [info, setInfo] = useState(null);      // eligibility answer for the order
  const [qty, setQty] = useState({});          // orderItemId -> quantity to return
  const [reason, setReason] = useState("Damaged");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (open) { setOrderNo(""); setInfo(null); setQty({}); setReason("Damaged"); setDetails(""); setError(""); setBusy(false); } }, [open]);

  const find = async (e) => {
    e?.preventDefault();
    setError(""); setInfo(null); setQty({}); setBusy(true);
    try { setInfo(await returnsApi.eligibility(orderNo.trim().toUpperCase())); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const lines = info ? info.lines.map((l) => ({ orderItemId: String(l.orderItemId), quantity: Number(qty[String(l.orderItemId)] || 0), max: l.remaining })).filter((l) => l.quantity > 0) : [];
  const bad = lines.find((l) => !Number.isInteger(l.quantity) || l.quantity > l.max);
  const problem = !info?.eligible ? "" : !lines.length ? "Choose at least one item." : bad ? "A quantity is more than what can still be returned." : reason === "Other" && details.trim().length < 5 ? "Add a few words of detail." : "";

  const submit = async () => {
    setBusy(true); setError("");
    try {
      const out = await returnsApi.create({ orderNumber: info.orderNumber, items: lines.map(({ orderItemId, quantity }) => ({ orderItemId, quantity })), reason, details: details.trim() || undefined });
      onCreated(out.return);
    } catch (err) { setError(err.details?.length ? err.details.map((d) => d.message).join(" ") : err.message); }
    finally { setBusy(false); }
  };

  return (
    <Drawer open={open} onClose={onClose} title="New return" size="lg"
      footer={info?.eligible ? <><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button><Button onClick={submit} disabled={busy || Boolean(problem)}>{busy ? "Saving…" : "Create return"}</Button></> : undefined}>
      <div className="space-y-5">
        <form onSubmit={find} className="flex items-end gap-3">
          <div className="flex-1"><Field label="Order number"><Input placeholder="AFS-000123" value={orderNo} onChange={(e) => setOrderNo(e.target.value)} autoFocus /></Field></div>
          <Button type="submit" variant="secondary" disabled={busy || orderNo.trim().length < 4}>Find order</Button>
        </form>
        {error && <p role="alert" className="text-sm text-danger bg-danger-soft rounded-sm px-3 py-2">{error}</p>}

        {info && !info.eligible && <p className="text-sm text-ink-muted bg-bg border border-border rounded-sm px-3 py-2">{info.message}</p>}
        {info?.eligible && (
          <>
            <p className="text-sm text-ink-muted">{info.customer?.name || "Customer"} · delivered {new Date(info.window.deliveredAt).toLocaleDateString()}{new Date() > new Date(info.window.deadline) ? " · outside the normal return period (allowed for staff)" : ""}</p>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-ink-muted border-b border-border"><th className="py-2 font-medium">Product</th><th className="font-medium text-right">Price</th><th className="font-medium text-right">Can return</th><th className="font-medium text-right w-24">Return</th></tr></thead>
              <tbody>
                {info.lines.map((l) => (
                  <tr key={String(l.orderItemId)} className="border-b border-border/60">
                    <td className="py-2 text-ink">{l.name}<span className="block text-xs text-ink-muted">{l.sku}</span></td>
                    <td className="text-right">{money(l.unitPrice)}</td><td className="text-right">{l.remaining}</td>
                    <td className="text-right"><Input type="number" min="0" max={l.remaining} disabled={l.remaining === 0} value={qty[String(l.orderItemId)] ?? ""} onChange={(e) => setQty((q) => ({ ...q, [String(l.orderItemId)]: e.target.value }))} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Field label="Reason"><Select value={reason} onChange={(e) => setReason(e.target.value)}>{REASONS.map((x) => <option key={x}>{x}</option>)}</Select></Field>
            <Field label="Details" hint={reason === "Other" ? "Required for “Other”" : "Optional"}><Textarea rows={3} maxLength={500} value={details} onChange={(e) => setDetails(e.target.value)} /></Field>
            {problem && <p className="text-xs text-ink-muted">{problem}</p>}
          </>
        )}
      </div>
    </Drawer>
  );
}
