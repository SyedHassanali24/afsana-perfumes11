import { useEffect, useState } from "react";
import Button from "../components/Button";
import Drawer from "../components/Drawer";
import StatusPill from "../components/StatusPill";
import { Field, Select, Textarea } from "../components/FormFields";
import useApi from "../../src/hooks/useApi";
import { useAuth } from "../../src/auth/AuthContext";
import { customersApi } from "../../src/services";
import { day, money } from "./CustomersList";

const GROUPS = ["New", "Repeat", "VIP", "Inactive"];

// Profile, last orders, and the two things staff may change: group + private notes (never shown to the shopper).
export default function CustomerDrawer({ customerId, onClose, onChanged }) {
  const { can } = useAuth();
  const { data, loading, error, reload } = useApi(() => (customerId ? customersApi.get(customerId) : Promise.resolve(null)), [customerId]);
  const c = data?.customer && data.customer._id === customerId ? data.customer : null;
  const hidden = data?.hidden || {};
  const [segment, setSegment] = useState("New");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => { setProblem(""); setSaved(false); }, [customerId]);
  useEffect(() => { if (c) { setSegment(c.segment); setNotes(c.notes || ""); } }, [c?._id, c?.segment, c?.notes]); // eslint-disable-line react-hooks/exhaustive-deps

  const changed = c && (segment !== c.segment || notes.trim() !== (c.notes || ""));
  const save = async () => {
    setBusy(true); setProblem(""); setSaved(false);
    try { await customersApi.update(c._id, { segment, notes: notes.trim() }); setSaved(true); await reload(); onChanged?.(); }
    catch (e) { setProblem(e.details?.[0]?.message || e.message || "Could not save."); }
    finally { setBusy(false); }
  };

  return (
    <Drawer open={Boolean(customerId)} onClose={onClose} size="lg" title={c ? c.name : "Customer"} footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
      {!c && loading && <p className="text-sm text-[#182308]-muted">Loading…</p>}
      {error && <div className="space-y-3"><p className="text-sm text-[#9b3f3f]">{error.message}</p><Button variant="secondary" size="sm" onClick={reload}>Try again</Button></div>}
      {c && (
        <div className="space-y-6">
          <div className="space-y-0.5 text-sm">
            <p className="text-[#182308]">{c.name}</p>
            <p className="text-xs text-[#182308]-muted">{hidden.phone ? "Phone hidden" : c.phone || "No phone"}</p>
            {c.email && <p className="text-xs text-[#182308]-muted">{c.email}</p>}
            <p className="text-xs text-[#182308]-muted">{c.city || "City not set"} · Customer since {day(c.createdAt)}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
            {[["Orders", c.stats.ordersCount], ["Spent", money(c.stats.totalSpent)], ["Points", c.loyaltyPoints]].map(([l, v]) => (
              <div key={l} className="border border-[#263e0e]/10 rounded-sm p-3"><p className="text-xs text-[#182308]-muted">{l}</p><p className="text-sm text-[#182308] mt-1">{v}</p></div>
            ))}
          </div>

          <div className="space-y-1">
            <p className="text-sm text-[#182308]">Addresses</p>
            {hidden.address ? <p className="text-sm text-[#182308]-muted">Addresses are hidden for your role.</p>
              : !(c.addresses || []).length ? <p className="text-sm text-[#182308]-muted">No saved addresses.</p>
              : <ul className="space-y-2">{c.addresses.map((a, i) => (
                  <li key={a._id || i} className="border border-[#263e0e]/10 rounded-sm px-3 py-2 text-xs text-[#182308]-muted">
                    {[a.line1, a.line2, a.city, a.postalCode].filter(Boolean).join(", ")}{a.isDefault ? " (default)" : ""}
                  </li>))}</ul>}
          </div>

          <div className="space-y-3">
            <p className="text-sm text-[#182308]">Group and notes <span className="text-xs text-[#182308]-muted">(staff only, never shown to the customer)</span></p>
            {can("customers.edit") ? (
              <>
                <Field label="Group"><Select value={segment} onChange={(e) => setSegment(e.target.value)}>{GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}</Select></Field>
                <Field label="Notes"><Textarea rows={4} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Example: prefers oud, call before delivery" error={Boolean(problem)} /></Field>
                {problem && <p role="alert" className="text-sm text-[#9b3f3f]">{problem}</p>}
                {saved && !changed && <p className="text-sm text-[#3d6b3d]">Saved.</p>}
                <Button size="sm" onClick={save} disabled={busy || !changed}>{busy ? "Saving…" : "Save"}</Button>
              </>
            ) : (
              <div className="text-sm text-[#182308]-muted space-y-1"><p>Group: <StatusPill status={c.segment} /></p><p className="whitespace-pre-wrap">{c.notes || "No notes."}</p></div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm text-[#182308]">Recent orders</p>
            {!data.orders.length ? <p className="text-sm text-[#182308]-muted">No orders yet.</p> : (
              <ul className="space-y-2">{data.orders.map((o) => (
                <li key={o._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 border border-[#263e0e]/10 rounded-sm px-3 py-2 text-sm">
                  <span className="text-[#182308]">{o.orderNumber}<span className="block text-xs text-[#182308]-muted">{day(o.createdAt)} · {money(o.total)}</span></span>
                  <StatusPill status={o.status} />
                </li>))}</ul>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
