import { useState } from "react";
import Card from "../components/Card";
import Button from "../components/Button";
import { Select } from "../components/FormFields";
import DataTable from "../components/DataTable";
import useApi from "../../src/hooks/useApi";
import { inventoryApi } from "../../src/services";

const TYPE_LABELS = { opening: "Opening stock", restock: "Restock", order: "Sold (shipped)", order_cancel: "Order cancelled", damaged: "Damaged", adjustment: "Correction", return: "Customer return", po_receive: "Purchase order received" };

export default function HistoryTab() {
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi(() => inventoryApi.history({ type: type || undefined, page, limit: 25 }), [type, page]);
  const pg = data?.pagination;
  const columns = [
    { key: "product", header: "Product", render: (r) => <span>{r.productName}<span className="block text-xs text-ink-muted">{r.sku}</span></span> },
    { key: "type", header: "Type", render: (r) => TYPE_LABELS[r.type] || r.type },
    { key: "delta", header: "Change", align: "right", render: (r) => <span className={r.delta < 0 ? "text-danger" : "text-success"}>{r.delta > 0 ? `+${r.delta}` : r.delta}</span> },
    { key: "ba", header: "Before → after", align: "right", render: (r) => `${r.before} → ${r.after}` },
    { key: "reason", header: "Reason", render: (r) => r.reason || "—" },
    { key: "by", header: "By", render: (r) => r.by || "System" },
    { key: "at", header: "When", align: "right", render: (r) => new Date(r.at).toLocaleString() },
  ];
  return (
    <Card padded={false}>
      <div className="p-5 border-b border-border w-64">
        <Select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
          <option value="">All movements</option>
          {Object.entries(TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </Select>
      </div>
      <div className="p-5">
        {error ? <div className="py-10 text-center space-y-3"><p className="text-sm text-danger">{error.message}</p><Button variant="secondary" onClick={reload}>Try again</Button></div>
          : <DataTable loading={loading} rows={data?.history || []} columns={columns} emptyMessage="No stock movements yet." pagination={pg && { page: pg.page, totalPages: pg.pages, onPageChange: setPage }} />}
      </div>
    </Card>
  );
}
