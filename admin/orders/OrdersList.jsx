import { useEffect, useState } from "react";
import Card from "../components/Card";
import Button from "../components/Button";
import { Input, Select } from "../components/FormFields";
import DataTable from "../components/DataTable";
import StatusPill from "../components/StatusPill";
import OrderDetailDrawer from "./OrderDetailDrawer";
import useApi from "../../src/hooks/useApi";
import useDebounce from "../../src/hooks/useDebounce";
import { ordersApi } from "../../src/services";
import { ORDER_STATUSES, PAYMENT_STATUSES, PAYMENT_TONE, money, toRow } from "../../src/services/mappers/orders";

// Route: /admin/orders (permission orders.view). GET /api/orders/admin/list?q=&status=&paymentStatus=&page=&limit=
const LIMIT = 20;

export default function OrdersList() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState(null);
  const q = useDebounce(search);

  const { data, loading, error, reload } = useApi(
    () => ordersApi.adminList({ q, status, paymentStatus, page, limit: LIMIT }),
    [q, status, paymentStatus, page]
  );
  const rows = (data?.orders || []).map(toRow);
  const pg = data?.pagination;

  // If the list got shorter (e.g. after a status change) and we are past the last page, step back.
  useEffect(() => {
    if (pg && pg.pages >= 1 && page > pg.pages) setPage(pg.pages);
  }, [pg, page]);

  const filtered = Boolean(q || status || paymentStatus);
  const resetTo = (setter) => (e) => { setter(e.target.value); setPage(1); };

  const columns = [
    { key: "orderNumber", header: "Order" },
    { key: "customerName", header: "Customer" },
    { key: "city", header: "City", render: (r) => r.city || "—" },
    { key: "total", header: "Total", align: "right", render: (r) => money(r.total) },
    { key: "paymentStatus", header: "Payment", render: (r) => <StatusPill status={r.paymentStatus} tone={PAYMENT_TONE[r.paymentStatus]} /> },
    { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} /> },
    { key: "createdAt", header: "Date", align: "right", render: (r) => new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Orders</h1>
        <p className="text-sm text-ink-muted mt-1">{pg ? `${pg.total} ${pg.total === 1 ? "order" : "orders"}${filtered ? " match these filters" : ""}` : "\u00A0"}</p>
      </div>

      <Card padded={false}>
        <div className="flex flex-wrap gap-3 p-5 border-b border-border">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Search order #, customer name or phone…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="w-48">
            <Select value={status} onChange={resetTo(setStatus)} aria-label="Order status">
              <option value="">All statuses</option>
              {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <div className="w-48">
            <Select value={paymentStatus} onChange={resetTo(setPaymentStatus)} aria-label="Payment status">
              <option value="">All payments</option>
              {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
        </div>

        <div className="p-5">
          {error ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm text-danger">{error.message}</p>
              <Button variant="secondary" onClick={reload}>Try again</Button>
            </div>
          ) : (
            <DataTable
              loading={loading}
              rows={rows}
              columns={columns}
              onRowClick={(r) => setDetailId(r.id)}
              emptyMessage={filtered ? "No orders match these filters." : "No orders yet."}
              pagination={pg && { page: pg.page, totalPages: pg.pages, onPageChange: setPage }}
            />
          )}
        </div>
      </Card>

      <OrderDetailDrawer orderId={detailId} onClose={() => setDetailId(null)} onChanged={reload} />
    </div>
  );
}
