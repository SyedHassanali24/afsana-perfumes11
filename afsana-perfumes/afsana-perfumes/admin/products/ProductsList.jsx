import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Card from "../components/Card";
import Button from "../components/Button";
import { Input, Select } from "../components/FormFields";
import DataTable from "../components/DataTable";
import StatusPill from "../components/StatusPill";
import ProductFormDrawer from "./ProductFormDrawer";
import { mockProducts, mockCategories } from "./mockProductsData";

export default function ProductsList() {
  // Phase 3: replace this local state with a GET /api/products?search=&category=&status=&page=
  // call (React Query / SWR works well here), and pass loading/rows straight through to DataTable.
  const [products, setProducts] = useState(mockProducts);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const [editingProduct, setEditingProduct] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === "All" || p.category === category;
      const matchesStatus = status === "All" || p.status === status;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, search, category, status]);

  const openAdd = () => {
    setEditingProduct(null);
    setDrawerOpen(true);
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setDrawerOpen(true);
  };

  const handleSave = (values) => {
    if (values.id) {
      setProducts((prev) => prev.map((p) => (p.id === values.id ? { ...p, ...values } : p)));
    } else {
      setProducts((prev) => [...prev, { ...values, id: `p${prev.length + 1}` }]);
    }
    setDrawerOpen(false);
  };

  const handleDelete = (id) => {
    // Phase 3: DELETE /api/products/:id — this should soft-delete (isDeleted: true)
    // per the spec, not remove the row permanently.
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink">Products</h1>
          <p className="text-sm text-ink-muted mt-1">
            {filtered.length} of {products.length} products
          </p>
        </div>
        <Button icon={Plus} onClick={openAdd}>
          Add product
        </Button>
      </div>

      <Card padded={false}>
        <div className="flex flex-wrap gap-3 p-5 border-b border-border">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Search by name or SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-40">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option>All</option>
              {mockCategories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </div>
          <div className="w-40">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option>All</option>
              <option>Draft</option>
              <option>Active</option>
              <option>Inactive</option>
              <option>Out of Stock</option>
              <option>Archived</option>
            </Select>
          </div>
        </div>

        <div className="p-5">
          <DataTable
            emptyMessage="No products match these filters."
            columns={[
              { key: "name", header: "Product" },
              { key: "sku", header: "SKU" },
              { key: "category", header: "Category" },
              { key: "price", header: "Price", align: "right" },
              {
                key: "stock",
                header: "Stock",
                align: "right",
                render: (row) => (
                  <span className={row.stock === 0 ? "text-danger" : row.stock <= 5 ? "text-warning" : "text-ink"}>
                    {row.stock}
                  </span>
                ),
              },
              {
                key: "status",
                header: "Status",
                render: (row) => <StatusPill status={row.status} />,
              },
              {
                key: "actions",
                header: "",
                align: "right",
                render: (row) => (
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => openEdit(row)}
                      className="p-1.5 rounded-sm text-ink-muted hover:bg-bg hover:text-ink transition-colors"
                      aria-label={`Edit ${row.name}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(row.id)}
                      className="p-1.5 rounded-sm text-ink-muted hover:bg-danger-soft hover:text-danger transition-colors"
                      aria-label={`Delete ${row.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ),
              },
            ]}
            rows={filtered}
          />
        </div>
      </Card>

      <ProductFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        product={editingProduct}
        onSave={handleSave}
      />
    </div>
  );
}
