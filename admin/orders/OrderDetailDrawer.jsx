import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/Button";
import Drawer from "../components/Drawer";
import StatusPill from "../components/StatusPill";
import ConfirmDialog from "../components/ConfirmDialog";
import { Field, Input, Select, Textarea } from "../components/FormFields";
import OrderTimeline from "./OrderTimeline";
import useApi from "../../src/hooks/useApi";
import { useAuth } from "../../src/auth/AuthContext";
import { ordersApi } from "../../src/services";
import {
  EDITABLE_PAYMENT_STATUSES, PAYMENT_TONE, canEditPayment, isReturnsFlow, money, nextStatuses, toDetail,
} from "../../src/services/mappers/orders";

/**
 * Order detail. Loads GET /orders/admin/:id itself.
 * Status: only the moves the server allows (mapper copy of TRANSITIONS). After Delivered there are no buttons - only a Returns link.
 * Fields the role may not see (phone / address / notes / payments / cost) arrive missing and are shown as hidden.
 * @param {string|null} orderId  open when set
 * @param {() => void} onClose
 * @param {() => void} [onChanged]  called after any successful write so the list can refresh
 */
export default function OrderDetailDrawer({ orderId, onClose, onChanged }) {
  const { can } = useAuth();
  const { data, loading, error, reload } = useApi(() => (orderId ? ordersApi.adminGet(orderId) : Promise.resolve(null)), [orderId]);
  const o = data?.order && data.order._id === orderId ? toDetail(data.order) : null;

  const [statusNote, setStatusNote] = useState("");
  const [confirm, setConfirm] = useState(null); // status the person is about to move to
  const [payStatus, setPayStatus] = useState("Pending");
  const [payRef, setPayRef] = useState("");
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState("");
  const [noteText, setNoteText] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteError, setNoteError] = useState("");

  useEffect(() => { setStatusNote(""); setConfirm(null); setNoteText(""); setNoteError(""); setPayError(""); }, [orderId]);
  useEffect(() => { if (o) { setPayStatus(o.paymentStatus); setPayRef(o.paymentReference); } }, [o?.id, o?.paymentStatus, o?.paymentReference]); // eslint-disable-line react-hooks/exhaustive-deps

  const after = async () => { await reload(); onChanged?.(); };

  const changeStatus = async () => {
    try {
      await ordersApi.setStatus(o.id, confirm, statusNote.trim() || undefined);
      setStatusNote("");
      await after();
    } catch (e) {
      reload(); // e.g. "just updated by someone else" -> show the fresh state behind the dialog
      throw e;
    }
  };

  const savePayment = async () => {
    setPayBusy(true); setPayError("");
    try { await ordersApi.setPayment(o.id, payStatus, payRef.trim() || undefined); await after(); }
    catch (e) { setPayError(e.message); }
    finally { setPayBusy(false); }
  };

  const addNote = async () => {
    setNoteBusy(true); setNoteError("");
    try { await ordersApi.addNote(o.id, noteText.trim()); setNoteText(""); await after(); }
    catch (e) { setNoteError(e.details?.[0]?.message || e.message); }
    finally { setNoteBusy(false); }
  };

  const next = o ? nextStatuses(o.status) : [];
  const paymentChanged = o && (payStatus !== o.paymentStatus || payRef.trim() !== o.paymentReference);

  return (
    <>
      <Drawer open={Boolean(orderId)} onClose={onClose} size="lg" title={o ? o.orderNumber : "Order"}
        footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
        {!o && loading && <p className="text-sm text-ink-muted">Loading…</p>}
        {error && <div className="space-y-3"><p className="text-sm text-danger">{error.message}</p><Button variant="secondary" size="sm" onClick={reload}>Try again</Button></div>}

        {o && (
          <div className="space-y-6">
            {/* customer + address */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-sm text-ink">{o.customer.name}</p>
                <p className="text-xs text-ink-muted">{o.customer.phone || "Phone hidden"}</p>
                {o.customer.email && <p className="text-xs text-ink-muted">{o.customer.email}</p>}
                {o.address ? (
                  <div className="text-xs text-ink-muted pt-1">
                    {o.address.fullName && <p>{o.address.fullName}</p>}
                    {o.address.lines.map((l) => <p key={l}>{l}</p>)}
                    {o.address.cityLine && <p>{o.address.cityLine}</p>}
                  </div>
                ) : <p className="text-xs text-ink-muted pt-1">Address hidden</p>}
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusPill status={o.status} />
                <StatusPill status={o.paymentStatus} tone={PAYMENT_TONE[o.paymentStatus]} />
                <span className="text-xs text-ink-muted">{o.methodLabel}</span>
              </div>
            </div>
            {o.status === "Cancelled" && o.cancelledReason && <p className="text-sm text-ink-muted">Cancelled: “{o.cancelledReason}”</p>}

            {/* items + totals */}
            <div>
              <p className="text-sm text-ink mb-2">Items</p>
              <div className="border border-border rounded-sm divide-y divide-border">
                {o.items.length === 0 && <p className="px-3 py-2.5 text-sm text-ink-muted">No items found.</p>}
                {o.items.map((i) => (
                  <div key={i.key} className="flex items-center justify-between px-3 py-2.5 text-sm">
                    <div>
                      <p className="text-ink">{i.name}</p>
                      <p className="text-ink-muted text-xs">
                        {[i.sku, i.sizeMl ? `${i.sizeMl}ml` : ""].filter(Boolean).join(" · ")}{i.sku || i.sizeMl ? " · " : ""}Qty {i.quantity} × {money(i.unitPrice)}
                        {i.costPrice !== null && ` · Cost ${money(i.costPrice)}`}
                      </p>
                    </div>
                    <span className="text-ink">{money(i.lineTotal)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between text-ink-muted"><span>Subtotal</span><span>{money(o.subtotal)}</span></div>
                <div className="flex justify-between text-ink-muted"><span>Shipping</span><span>{money(o.shipping)}</span></div>
                {o.discount > 0 && <div className="flex justify-between text-ink-muted"><span>Discount{o.couponCode ? ` (${o.couponCode})` : ""}</span><span>-{money(o.discount)}</span></div>}
                <div className="flex justify-between text-ink font-medium pt-1 border-t border-border"><span>Total</span><span>{money(o.total)}</span></div>
              </div>
            </div>

            {/* status */}
            <div className="space-y-3">
              <p className="text-sm text-ink">Order status</p>
              {isReturnsFlow(o.status) ? (
                <div className="text-sm text-ink-muted space-y-2">
                  <p>After delivery, the status changes only through Returns.</p>
                  {can("returns.view") && <Link to={`/admin/returns?q=${encodeURIComponent(o.orderNumber)}`} className="inline-block text-gold hover:underline">View returns →</Link>}
                </div>
              ) : next.length === 0 ? (
                <p className="text-sm text-ink-muted">No further status changes are possible.</p>
              ) : can("orders.changeStatus") ? (
                <>
                  <Field label="Note (optional)" hint="Saved on the timeline; for a cancellation it is kept as the reason.">
                    <Input value={statusNote} maxLength={300} onChange={(e) => setStatusNote(e.target.value)} placeholder="e.g. Customer asked to cancel" />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    {next.map((s) => <Button key={s} size="sm" variant={s === "Cancelled" ? "danger" : "primary"} onClick={() => setConfirm(s)}>Mark {s}</Button>)}
                  </div>
                </>
              ) : <p className="text-sm text-ink-muted">You do not have permission to change the status.</p>}
            </div>

            {/* payment */}
            <div className="space-y-3">
              <p className="text-sm text-ink">Payment</p>
              {!canEditPayment(o.paymentStatus) ? (
                <p className="text-sm text-ink-muted">Refunds are recorded from the Returns screen, so this cannot be edited here.</p>
              ) : can("payments.changeStatus") ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Payment status">
                      <Select value={payStatus} onChange={(e) => setPayStatus(e.target.value)}>
                        {EDITABLE_PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </Select>
                    </Field>
                    <Field label="Reference (optional)" hint={o.payments === null ? "Payment details are hidden for your role." : "e.g. bank transaction ID"}>
                      <Input value={payRef} maxLength={100} onChange={(e) => setPayRef(e.target.value)} />
                    </Field>
                  </div>
                  {payError && <p role="alert" className="text-sm text-danger">{payError}</p>}
                  <Button size="sm" onClick={savePayment} disabled={payBusy || !paymentChanged}>{payBusy ? "Saving…" : "Update payment"}</Button>
                </>
              ) : <p className="text-sm text-ink-muted">You do not have permission to change the payment status.</p>}
            </div>

            {/* timeline */}
            <div>
              <p className="text-sm text-ink mb-3">Timeline</p>
              <OrderTimeline steps={o.timeline} />
            </div>

            {/* notes */}
            <div className="space-y-3">
              <p className="text-sm text-ink">Internal notes <span className="text-xs text-ink-muted">(staff only, never shown to the customer)</span></p>
              {o.notes === null ? (
                <p className="text-sm text-ink-muted">Notes are hidden for your role.</p>
              ) : (
                <>
                  {o.notes.length === 0 && <p className="text-sm text-ink-muted">No notes yet.</p>}
                  <ul className="space-y-2">
                    {o.notes.map((n) => (
                      <li key={n.key} className="border border-border rounded-sm px-3 py-2 text-sm">
                        <p className="text-ink whitespace-pre-wrap">{n.text}</p>
                        <p className="text-xs text-ink-muted mt-1">{n.at}</p>
                      </li>
                    ))}
                  </ul>
                  {can("orders.edit") && (
                    <div className="space-y-2">
                      <Textarea rows={3} maxLength={500} value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note…" error={Boolean(noteError)} />
                      {noteError && <p role="alert" className="text-sm text-danger">{noteError}</p>}
                      <Button size="sm" variant="secondary" onClick={addNote} disabled={noteBusy || !noteText.trim()}>{noteBusy ? "Adding…" : "Add note"}</Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(confirm)}
        danger={confirm === "Cancelled"}
        title={confirm ? `Mark order as ${confirm}?` : ""}
        message={confirm === "Cancelled" ? "Stock for this order goes back on the shelf. This cannot be undone." : confirm === "Shipped" ? "Reserved stock is taken off the shelf when an order is shipped." : confirm === "Delivered" ? "A Cash on Delivery order will be marked Paid. After this, only Returns can change the status." : "The customer's tracking page will show this update."}
        confirmLabel={confirm ? `Mark ${confirm}` : "Confirm"}
        onConfirm={changeStatus}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}
