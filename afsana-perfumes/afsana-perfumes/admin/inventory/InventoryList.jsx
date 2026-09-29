import { useState } from "react";
import { SlidersHorizontal, AlertTriangle } from "lucide-react";
import Card from "../components/Card";
import DataTable from "../components/DataTable";
import StatusPill from "../components/StatusPill";
import StockAdjustDrawer from "./StockAdjustDrawer";
import { mockInventory, mockStockHistory } from "./mockInventoryData";

const TABS = [
  { key: "stock", label: "Stock" },
  { key: "history", label: "Stock history" },
];

function stockStatus(item) {
  const available = item.current - item.reserved;
  if (available <= 0) return "Out of Stock";
  if (available <= item.lowStockThreshold) return "Low Stock";
  return "In Stock";
}

export default function InventoryList() {
  // Phase 3: GET /api/inventory (stock tab) and GET /api/inventory/history (history tab)
  const [inventory, setInventory] = useState(mockInventory);
  const [activeTab, setActiveTab] = useState("stock");
  const [adjustingProduct, setAdjustingProduct] = useState(null);

  const handleAdjust = ({ productId, quantity }) => {
    setInventory((prev) =>
      prev.map((item) =>
        item.id === productId
          ? { ...item, current: Math.max(0, item.current + quantity) }
          : item
      )
    );
    setAdjustingProduct(null);
  };

  const lowStockCount = inventory.filter((i) => stockStatus(i) !== "In Stock").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink">Inventory</h1>
          <p className="text-sm text-ink-muted mt-1 flex items-center gap-1.5">
            {lowStockCount > 0 && <AlertTriangle className="w-4 h-4 text-warning" />}
            {lowStockCount > 0
              ? `${lowStockCount} product${lowStockCount > 1 ? "s" : ""} need attention`
              : "All products are well stocked"}
          </p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors ${
              activeTab === tab.key
                ? "border-gold text-ink font-medium"
                : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "stock" && (
        <Card padded={false}>
          <div className="p-5">
            <DataTable
              columns={[
                { key: "name", header: "Product" },
                { key: "sku", header: "SKU" },
                { key: "current", header: "Current", align: "right" },
                { key: "reserved", header: "Reserved", align: "right" },
                {
                  key: "available",
                  header: "Available",
                  align: "right",
                  render: (row) => row.current - row.reserved,
                },
                {
                  key: "status",
                  header: "Status",
                  render: (row) => <StatusPill status={stockStatus(row)} />,
                },
                {
                  key: "actions",
                  header: "",
                  align: "right",
                  render: (row) => (
                    <button
                      onClick={() => setAdjustingProduct(row)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs text-ink-muted hover:bg-bg hover:text-ink transition-colors"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      Adjust
                    </button>
                  ),
                },
              ]}
              rows={inventory}
            />
          </div>
        </Card>
      )}

      {activeTab === "history" && (
        <Card padded={false}>
          <div className="p-5">
            <DataTable
              emptyMessage="No stock movements yet."
              columns={[
                { key: "product", header: "Product" },
                { key: "type", header: "Type" },
                {
                  key: "change",
                  header: "Change",
                  align: "right",
                  render: (row) => (
                    <span className={row.change.startsWith("-") ? "text-danger" : "text-success"}>
                      {row.change}
                    </span>
                  ),
                },
                { key: "reason", header: "Reason" },
                { key: "who", header: "By" },
                { key: "when", header: "When", align: "right" },
              ]}
              rows={mockStockHistory}
            />
          </div>
        </Card>
      )}

      <StockAdjustDrawer
        open={Boolean(adjustingProduct)}
        onClose={() => setAdjustingProduct(null)}
        product={adjustingProduct}
        onSubmit={handleAdjust}
      />
    </div>
  );
}
