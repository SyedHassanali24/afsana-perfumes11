import { useEffect, useState } from "react";
import Button from "../components/Button";
import Drawer from "../components/Drawer";
import StatusPill from "../components/StatusPill";
import ConfirmDialog from "../components/ConfirmDialog";
import ConfirmPasswordModal from "../components/ConfirmPasswordModal";
import { Input } from "../components/FormFields";
import { purchaseOrdersApi } from "../../src/services";
import { useAuth } from "../../src/auth/AuthContext";
import { fieldHidden } from "../../src/auth/permissions";
import useApi from "../../src/hooks/useApi";

const money = (n) => (n === undefined ? "—" : `PKR ${Number(n || 0).toLocaleString("en-PK")}`);

export default function PurchaseOrderDrawer({ poId, version = 0, onClose, onEdit, onChanged }) {
  const { can, permissions } = useAuth();
  const { data, loading, error, reload } = useApi(() => (poId ? purchaseOrdersApi.get(poId) : Promise.resolve(null)), [poId, version]);
  const po = data?.order;
  const [receiving, setReceiving] = useState(false);
  const [qty, setQty] = useState({});
  const [msg, setMsg] = useState("");
  const [confirm, setConfirm] = useState(null); // { title, message, label, danger, run }
  const [ask, setAsk] = useState(false);

  useEffect(() => { setReceiving(false); setQty({}); setMsg(""); }, [poId]);
  useEffect(() => { if (po && receiving) setQty(Object.fromEntries(po.items.map((i) => [String(i.variantId), String(i.quantity - i.receivedQuantity)]))); }, [receiving, po]);

  const costsHidden = fieldHidden(permissions, "product.costPrice");
  const after = async () => { await reload(); onChanged(); };
  const lines = po ? po.items.map((i) => ({ variantId: String(i.variantId), quantity: Number(qty[String(i.variantId)] || 0), max: i.quantity - i.receivedQuantity })).filter((l) => l.quantity > 0) : [];
  const receiveError = po && receiving && (!lines.length ? "Enter how many units arrived." : lines.find((l) => !Number.isInteger(l.quantity) || l.quantity > l.max) ? "A quantity is more than what's still expected." : "");
  const openStates = po && ["Ordered", "Partially Received"].includes(po.status);

  return (
    <>
      <Drawer open={Boolean(poId)} onClose={onClose} size="lg" title={po ? po.poNumber : "Purchase order"}>
        {loading && <p className="text-sm text-ink-muted">Loading…</p>}
        {error && <p className="text-sm text-danger">{error.message}</p>}
        {po && (
          <div className="space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-3"><StatusPill status={po.status} /><span className="text-sm text-ink">{po.supplier.name}</span></div>
              <p className="text-sm text-ink-muted">Created {new Date(po.createdAt).toLocaleDateString()}{po.expectedDate ? ` · expected ${new Date(po.expectedDate).toLocaleDateString()}` : ""} · total {money(po.totalCost)}</p>
            </div>
            {msg && <p role="alert" className="text-sm text-danger bg-danger-soft rounded-sm px-3 py-2">{msg}</p>}
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-ink-muted border-b border-border"><th className="py-2 font-medium">Product</th><th className="font-medium text-right">Ordered</th><th className="font-medium text-right">Received</th><th className="font-medium text-right">Cost</th>{receiving && <th className="font-medium text-right w-24">Arrived now</th>}</tr></thead>
              <tbody>
                {po.items.map((i) => (
                  <tr key={String(i.variantId)} className="border-b border-border/60">
                    <td className="py-2 text-ink">{i.productName} · {i.label}<span className="block text-xs text-ink-muted">{i.sku}</span></td>
                    <td className="text-right">{i.quantity}</td><td className="text-right">{i.receivedQuantity}</td><td className="text-right">{money(i.costPerUnit)}</td>
                    {receiving && <td className="text-right"><Input type="number" min="0" max={i.quantity - i.receivedQuantity} disabled={i.quantity - i.receivedQuantity === 0} value={qty[String(i.variantId)] ?? ""} onChange={(e) => setQty((q) => ({ ...q, [String(i.variantId)]: e.target.value }))} /></td>}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-wrap gap-2">
              {po.status === "Draft" && can("purchaseOrders.edit") && !costsHidden && <Button variant="secondary" size="sm" onClick={() => onEdit(po)}>Edit</Button>}
              {po.status === "Draft" && can("purchaseOrders.edit") && <Button size="sm" onClick={() => setConfirm({ title: "Mark as ordered?", message: "Use this once the order has been sent to the supplier. The units will show as incoming stock.", label: "Mark as ordered", run: async () => { await purchaseOrdersApi.markOrdered(po.id); await after(); } })}>Mark as ordered</Button>}
              {openStates && can("purchaseOrders.manageStock") && !receiving && <Button size="sm" onClick={() => setReceiving(true)}>Receive stock</Button>}
              {receiving && <><Button size="sm" disabled={Boolean(receiveError)} onClick={() => setAsk(true)}>Confirm receipt</Button><Button variant="secondary" size="sm" onClick={() => setReceiving(false)}>Cancel</Button></>}
              {["Draft", "Ordered", "Partially Received"].includes(po.status) && can("purchaseOrders.edit") && !receiving && (
                <Button variant="danger" size="sm" onClick={() => setConfirm({ title: `Cancel ${po.poNumber}?`, message: po.status === "Draft" ? "This draft will be marked as cancelled." : "Units not yet received stop counting as incoming. Stock already received stays.", label: "Cancel order", danger: true, run: async () => { await purchaseOrdersApi.cancel(po.id); await after(); } })}>Cancel order</Button>
              )}
            </div>
            {receiving && receiveError && <p className="text-xs text-ink-muted">{receiveError}</p>}
          </div>
        )}
      </Drawer>
      <ConfirmDialog open={Boolean(confirm)} title={confirm?.title} message={confirm?.message} confirmLabel={confirm?.label} danger={confirm?.danger} onClose={() => setConfirm(null)} onConfirm={() => confirm.run()} />
      <ConfirmPasswordModal open={ask} title="Confirm stock received" message="This adds the units to your stock and is recorded in the audit log." confirmLabel="Add to stock" onClose={() => setAsk(false)}
        onConfirm={async (pw) => { await purchaseOrdersApi.receive(po.id, lines.map(({ variantId, quantity }) => ({ variantId, quantity })), pw); setReceiving(false); await after(); }} />
    </>
  );
}
