import { useState } from "react";
import { useAuth } from "../../src/auth/AuthContext";
import StockTab from "./StockTab";
import HistoryTab from "./HistoryTab";
import SuppliersTab from "./SuppliersTab";
import PurchaseOrdersTab from "./PurchaseOrdersTab";

// Route: /admin/inventory. Tabs the user has no permission for are hidden (the API enforces it as well).
const TABS = [
  { id: "stock", label: "Stock", permission: "inventory.view", View: StockTab },
  { id: "history", label: "Stock history", permission: "inventory.view", View: HistoryTab },
  { id: "po", label: "Purchase orders", permission: "purchaseOrders.view", View: PurchaseOrdersTab },
  { id: "suppliers", label: "Suppliers", permission: "suppliers.view", View: SuppliersTab },
];

export default function InventoryList() {
  const { can } = useAuth();
  const tabs = TABS.filter((t) => can(t.permission));
  const [active, setActive] = useState(tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) || tabs[0];
  if (!current) return <p className="text-sm text-ink-muted">Your role doesn't include inventory.</p>;
  const { View } = current;
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-ink">Inventory</h1>
      <div className="flex gap-1 border-b border-border" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={t.id === current.id} onClick={() => setActive(t.id)}
            className={`px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors ${t.id === current.id ? "border-[var(--gold)] text-ink font-medium" : "border-transparent text-ink-muted hover:text-ink"}`}>{t.label}</button>
        ))}
      </div>
      <View />
    </div>
  );
}
