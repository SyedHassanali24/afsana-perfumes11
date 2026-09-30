import { useState } from "react";
import { Plus, Pencil, Trash2, RotateCcw } from "lucide-react";
import Card from "../components/Card";
import Button from "../components/Button";
import { Input, Select } from "../components/FormFields";
import DataTable from "../components/DataTable";
import StatusPill from "../components/StatusPill";
import ConfirmPasswordModal from "../components/ConfirmPasswordModal";
import ProductFormDrawer from "./ProductFormDrawer";
import { useAuth } from "../../src/auth/AuthContext";
import useApi from "../../src/hooks/useApi";
import useDebounce from "../../src/hooks/useDebounce";
import { productsApi } from "../../src/services";
import { toRow } from "../../src/services/mappers/products";

const STATUSES = ["Draft", "Active", "Inactive", "Out of Stock", "Archived"];

export default function ProductsList() {
  const { can } = useAuth();
  const [tab, setTab] = useState("active"); // 'active' | 'trash'
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [drawer, setDrawer] = useState({ open: false, productId: null });
  const [toDelete, setToDelete] = useState(null);
  const [notice, setNotice] = useState(null); // { type: 'ok'|'error', text }

  const q = useDebounce(search);
  const inTrash = tab === "trash";

  const { data, loading, error, reload } = useApi(
    () => (inTrash ? productsApi.adminTrash : productsApi.adminList)({ q, category, status, page, limit: 20 }),
    [inTrash, q, category, status, page]
  );
  const { data: catData } = useApi(() => productsApi.categories(), []);
  const categories = catData?.categories || [];

  const rows = (data?.products || []).map(toRow);
  const pg = data?.pagination;
  const resetPage = (fn) => (e) => { fn(e.target.value); setPage(1); };
  const flash = (type, text) => { setNotice({ type, text }); setTimeout(() => setNotice(null), 4000); };

  const restore = async (row) => {
    try { await productsApi.restore(row.id); flash("ok", `${row.name} restored.`); reload(); }
    catch (e) { flash("error", e.message); }
  };

  const columns = [
    { key: "name", header: "Product" },
    { key: "sku", header: "SKU" },
    { key: "category", header: "Category" },
    { key: "price", header: "Price", align: "right" },
    {
      key: "stock", header: "Stock", align: "right",
      render: (r) => <span className={r.stock === 0 ? "text-danger" : r.stock <= 5 ? "text-warning" : "text-ink"}>{r.stock}</span>,
    },
    { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} /> },
    {
      key: "actions", header: "", align: "right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          {inTrash ? (
            can("products.restore") && (
              <button onClick={() => restore(r)} className="p-1.5 rounded-sm text-ink-muted hover:bg-bg hover:text-ink transition-colors" aria-label={`Restore ${r.name}`}>
                <RotateCcw className="w-4 h-4" />
              </button>
            )
          ) : (
            <>
              {can("products.edit") && (
                <button onClick={() => setDrawer({ open: true, productId: r.id })} className="p-1.5 rounded-sm text-ink-muted hover:bg-bg hover:text-ink transition-colors" aria-label={`Edit ${r.name}`}>
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              {can("products.delete") && (
                <button onClick={() => setToDelete(r)} className="p-1.5 rounded-sm text-ink-muted hover:bg-danger-soft hover:text-danger transition-colors" aria-label={`Delete ${r.name}`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink">{inTrash ? "Deleted products" : "Products"}</h1>
          <p className="text-sm text-ink-muted mt-1">{pg ? `${pg.total} ${pg.total === 1 ? "product" : "products"}` : "\u00A0"}</p>
        </div>
        <div className="flex items-center gap-2">
          {can("products.restore") && (
            <Button variant="secondary" onClick={() => { setTab(inTrash ? "active" : "trash"); setPage(1); }}>
              {inTrash ? "Back to products" : "Trash"}
            </Button>
          )}
          {!inTrash && can("products.create") && (
            <Button icon={Plus} onClick={() => setDrawer({ open: true, productId: null })}>Add product</Button>
          )}
        </div>
      </div>

      {notice && (
        <p role="status" className={`text-sm rounded-sm px-3 py-2 ${notice.type === "ok" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>{notice.text}</p>
      )}

      <Card padded={false}>
        <div className="flex flex-wrap gap-3 p-5 border-b border-border">
          <div className="flex-1 min-w-[200px]">
            <Input placeholder="Search by name or SKU…" value={search} onChange={resetPage(setSearch)} />
          </div>
          <div className="w-44">
            <Select value={category} onChange={resetPage(setCategory)}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div className="w-40">
            <Select value={status} onChange={resetPage(setStatus)}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </Select>
          </div>
        </div>

        <div className="p-5">
          {error ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm text-danger">{error.status === 403 ? "You don't have access to products." : error.message}</p>
              <Button variant="secondary" onClick={reload}>Try again</Button>
            </div>
          ) : (
            <DataTable
              loading={loading}
              rows={rows}
              emptyMessage={inTrash ? "Trash is empty." : q || category || status ? "No products match these filters." : "No products yet. Add your first perfume."}
              columns={columns}
              pagination={pg && { page: pg.page, totalPages: pg.pages, onPageChange: setPage }}
            />
          )}
        </div>
      </Card>

      <ProductFormDrawer
        open={drawer.open}
        productId={drawer.productId}
        categories={categories}
        canPrice={can("products.managePrice")}
        onClose={() => setDrawer({ open: false, productId: null })}
        onSaved={() => { setDrawer({ open: false, productId: null }); flash("ok", "Product saved."); reload(); }}
      />

      <ConfirmPasswordModal
        open={Boolean(toDelete)}
        danger
        title={`Delete ${toDelete?.name || "product"}?`}
        message="It will be hidden from the store and moved to Trash. You can restore it later."
        confirmLabel="Delete"
        onClose={() => setToDelete(null)}
        onConfirm={async (pw) => { await productsApi.remove(toDelete.id, pw); flash("ok", `${toDelete.name} moved to Trash.`); reload(); }}
      />
    </div>
  );
}
