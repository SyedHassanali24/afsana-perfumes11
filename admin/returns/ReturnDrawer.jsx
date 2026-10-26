import { useEffect, useState } from "react";
import Button from "../components/Button";
import Drawer from "../components/Drawer";
import StatusPill from "../components/StatusPill";
import ConfirmDialog from "../components/ConfirmDialog";
import ConfirmPasswordModal from "../components/ConfirmPasswordModal";
import { Field, Input, Select, Textarea } from "../components/FormFields";
import { returnsApi } from "../../src/services";
import { useAuth } from "../../src/auth/AuthContext";
import useApi from "../../src/hooks/useApi";

const money = (n) => `PKR ${Number(n || 0).toLocaleString("en-PK")}`;
const when = (d) => (d ? new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");
const METHODS = ["Bank Transfer", "Cash", "Other"];

export default function ReturnDrawer({ returnId, onClose, onChanged }) {
  const { can } = useAuth();
  const { data, loading, error, reload } = useApi(() => (returnId ? returnsApi.get(returnId) : Promise.resolve(null)), [returnId]);
  const r = data?.return;
  const order = data?.order;
  const refund = data?.refund;
  const [mode, setMode] = useState(null); // null | "reject" | "receive" | "refund"
  const [note, setNote] = useState("");
  const [condition, setCondition] = useState("Resellable");
  const [form, setForm] = useState({ amount: "", method: "Bank Transfer", reference: "", reason: "" });
  const [confirm, setConfirm] = useState(null);
  const [askPw, setAskPw] = useState(false);

  useEffect(() => { setMode(null); setNote(""); setCondition("Resellable"); }, [returnId]);
  useEffect(() => { if (mode === "refund" && refund) setForm({ amount: String(refund.suggested || ""), method: order?.paymentMethod === "COD" ? "Cash" : "Bank Transfer", reference: "", reason: r ? `Refund for ${r.returnNumber}` : "" }); }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const after = async () => { setMode(null); setNote(""); await reload(); onChanged?.(); };
  const setStatus = (body) => returnsApi.setStatus(r.id, body);
  const amount = Number(form.amount);
  const amountError = mode === "refund" && refund && (!Number.isInteger(amount) || amount < 1 ? "Enter a whole number of rupees." : amount > refund.cap ? `At most ${money(refund.cap)} can still be refunded on this order.` : form.reason.trim().length < 3 ? "Add a short reason." : "");

  return (
    <>
      <Drawer open={Boolean(returnId)} onClose={onClose} size="lg" title={r ? r.returnNumber : "Return"}>
        {loading && <p className="text-sm text-ink-muted">Loading…</p>}
        {error && <div className="space-y-3"><p className="text-sm text-danger">{error.message}</p><Button variant="secondary" size="sm" onClick={reload}>Try again</Button></div>}
        {r && order && (
          <div className="space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-3"><StatusPill status={r.status} /><span className="text-sm text-ink">{r.customer?.name || "Customer"}</span>{r.source === "staff" && <span className="text-xs text-ink-muted">logged by staff</span>}</div>
              <p className="text-sm text-ink-muted">Order {r.orderNumber} ({order.status}) · requested {when(r.createdAt)}{r.customer?.phone ? ` · ${r.customer.phone}` : ""}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-ink mb-2">Items being returned</h3>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-ink-muted border-b border-border"><th className="py-2 font-medium">Product</th><th className="font-medium text-right">Qty</th><th className="font-medium text-right">Price</th></tr></thead>
                <tbody>
                  {r.items.map((i) => (
                    <tr key={String(i.orderItemId)} className="border-b border-border/60">
                      <td className="py-2 text-ink">{i.name}<span className="block text-xs text-ink-muted">{i.sku}</span></td>
                      <td className="text-right">{i.quantity}</td><td className="text-right">{money(i.unitPrice * i.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-sm space-y-1">
              <p><span className="text-ink-muted">Reason: </span>{r.reason}</p>
              {r.details && <p className="text-ink-muted">“{r.details}”</p>}
              {r.decisionNote && <p><span className="text-ink-muted">Note to customer: </span>{r.decisionNote}</p>}
              {r.condition && <p><span className="text-ink-muted">Condition on arrival: </span>{r.condition}{r.condition === "Damaged" ? " (not restocked)" : " (restocked)"}</p>}
              {r.status === "Refunded" && <p><span className="text-ink-muted">Refunded: </span>{money(r.refundedAmount)}</p>}
            </div>

            {/* ---- actions ---- */}
            {can("returns.changeStatus") && mode === null && (
              <div className="flex flex-wrap gap-2">
                {r.status === "Pending" && <Button size="sm" onClick={() => setConfirm({ title: "Approve this return?", message: "The customer will see it as approved. Ask them to send the items back, then mark them received.", label: "Approve", run: async () => { await setStatus({ status: "Approved" }); await after(); } })}>Approve</Button>}
                {["Pending", "Approved"].includes(r.status) && <Button size="sm" variant="danger" onClick={() => { setMode("reject"); setNote(""); }}>Decline</Button>}
                {r.status === "Approved" && <Button size="sm" onClick={() => setMode("receive")}>Items received</Button>}
              </div>
            )}
            {r.status === "Received" && refund?.canIssue && can("refunds.refund") && mode === null && <Button size="sm" onClick={() => setMode("refund")}>Issue refund</Button>}
            {r.status === "Received" && !refund?.canIssue && mode === null && <p className="text-xs text-ink-muted">Nothing left to refund on this order, or its payment was never confirmed.</p>}

            {mode === "reject" && (
              <div className="space-y-3 border border-border rounded-md p-4">
                <Field label="Reason shown to the customer" hint="Be polite and specific; the customer can read this."><Textarea rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
                <div className="flex gap-2"><Button size="sm" variant="danger" disabled={!note.trim()} onClick={() => setConfirm({ title: "Decline this return?", message: "This cannot be undone.", label: "Decline return", danger: true, run: async () => { await setStatus({ status: "Rejected", note: note.trim() }); await after(); } })}>Decline return</Button><Button size="sm" variant="secondary" onClick={() => setMode(null)}>Back</Button></div>
              </div>
            )}
            {mode === "receive" && (
              <div className="space-y-3 border border-border rounded-md p-4">
                <Field label="Condition of the items" hint="Resellable items go back into stock. Damaged or opened items are only counted as damaged.">
                  <Select value={condition} onChange={(e) => setCondition(e.target.value)}><option value="Resellable">Resellable — put back in stock</option><option value="Damaged">Damaged / opened — do not restock</option></Select>
                </Field>
                <div className="flex gap-2"><Button size="sm" onClick={() => setConfirm({ title: "Mark items as received?", message: condition === "Resellable" ? "The units will be added back to your stock." : "The units will be recorded as damaged and not added to sellable stock.", label: "Mark received", run: async () => { await setStatus({ status: "Received", condition }); await after(); } })}>Mark received</Button><Button size="sm" variant="secondary" onClick={() => setMode(null)}>Back</Button></div>
              </div>
            )}
            {mode === "refund" && refund && (
              <div className="space-y-3 border border-border rounded-md p-4">
                <p className="text-xs text-ink-muted">Order total {money(order.total)} · already refunded {money(refund.alreadyRefunded)} · you can refund up to {money(refund.cap)}.</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Amount (PKR)" hint={`Suggested ${money(refund.suggested)}`}><Input type="number" min="1" max={refund.cap} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
                  <Field label="Paid back by"><Select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>{METHODS.map((m) => <option key={m}>{m}</option>)}</Select></Field>
                </div>
                <Field label="Reference (optional)" hint="Bank transaction id or receipt number"><Input maxLength={100} value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></Field>
                <Field label="Reason"><Input maxLength={300} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
                {amountError && <p className="text-xs text-danger">{amountError}</p>}
                <div className="flex gap-2"><Button size="sm" disabled={Boolean(amountError)} onClick={() => setAskPw(true)}>Refund {money(amount)}</Button><Button size="sm" variant="secondary" onClick={() => setMode(null)}>Back</Button></div>
              </div>
            )}

            {data.refunds?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-ink mb-2">Refunds on this order</h3>
                <ul className="text-sm divide-y divide-border/60">
                  {data.refunds.map((x) => <li key={x.id} className="py-2 flex justify-between gap-3"><span>{money(x.amount)} · {x.method}{x.reference ? ` · ${x.reference}` : ""}</span><span className="text-ink-muted">{when(x.at)}</span></li>)}
                </ul>
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-ink mb-3">History</h3>
              <ol className="space-y-3 border-l border-border ml-2 pl-5">
                {r.timeline.map((t, i) => (
                  <li key={i} className="relative">
                    <span className={`absolute -left-[26px] top-1.5 w-2.5 h-2.5 rounded-full ${i === r.timeline.length - 1 ? "bg-[var(--gold)]" : "bg-border"}`} />
                    <p className="text-sm text-ink">{t.event}</p>
                    {t.note && <p className="text-xs text-ink-muted">{t.note}</p>}
                    <p className="text-xs text-ink-muted">{when(t.at)}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </Drawer>
      <ConfirmDialog open={Boolean(confirm)} title={confirm?.title} message={confirm?.message} confirmLabel={confirm?.label} danger={confirm?.danger} onClose={() => setConfirm(null)} onConfirm={() => confirm.run()} />
      <ConfirmPasswordModal open={askPw} title="Confirm refund" message={`You are refunding ${money(amount)}. This is recorded in the audit log and cannot be undone.`} confirmLabel="Issue refund" danger onClose={() => setAskPw(false)}
        onConfirm={async (pw) => { await returnsApi.refund(r.id, { amount, method: form.method, reference: form.reference.trim() || undefined, reason: form.reason.trim(), confirmPassword: pw }); await after(); }} />
    </>
  );
}
