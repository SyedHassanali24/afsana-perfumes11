import { useMemo, useState } from "react";
import Card from "../components/Card";
import { Input, Select } from "../components/FormFields";
import DataTable from "../components/DataTable";
import StatusPill from "../components/StatusPill";
import OrderDetailDrawer from "./OrderDetailDrawer";
import { mockOrders } from "./mockOrdersData";

const STATUS_FILTERS = [
  "All",
  "New",
  "Confirmed",
  "Processing",
  "Packed",
  "Shipped",
  "Out For Delivery",
  "Delivered",
  "Cancelled",
  "Return Requested",
  "Returned",
  "Refunded",
];

export default function OrdersList() {
  // Phase 3: GET /api/orders?search=&status=&paymentStatus=&page=
  const [orders, setOrders] = useState(mockOrders);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch =
        !search ||
        o.id.toLowerCase().includes(search.toLowerCase()) ||
        o.customer.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = status === "All" || o.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [orders, search, status]);

  const handleUpdate = (orderId, newStatus, internalNotes) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus, internalNotes } : o))
    );
    setSelectedOrder(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Orders</h1>
        <p className="text-sm text-ink-muted mt-1">
          {filtered.length} of {orders.length} orders
        </p>
      </div>

      <Card padded={false}>
        <div className="flex flex-wrap gap-3 p-5 border-b border-border">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Search by order # or customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-48">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_FILTERS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="p-5">
          <DataTable
            emptyMessage="No orders match these filters."
            columns={[
              { key: "id", header: "Order" },
              { key: "customer", header: "Customer" },
              { key: "total", header: "Total", align: "right" },
              {
                key: "paymentStatus",
                header: "Payment",
                render: (row) => <StatusPill status={row.paymentStatus} />,
              },
              {
                key: "status",
                header: "Status",
                render: (row) => <StatusPill status={row.status} />,
              },
              { key: "date", header: "Date", align: "right" },
            ]}
            rows={filtered}
            onRowClick={(row) => setSelectedOrder(row)}
          />
        </div>
      </Card>

      <OrderDetailDrawer
        open={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        order={selectedOrder}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
