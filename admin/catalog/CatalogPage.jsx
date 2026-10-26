import { useState } from "react";
import { useAuth } from "../../src/auth/AuthContext";
import TaxonomyTab from "./TaxonomyTab";

// Route: /admin/catalog. Fragrance families are permissioned under "categories".
const TABS = [
  { id: "categories", label: "Categories", module: "categories", noun: "category", plural: "categories" },
  { id: "collections", label: "Collections", module: "collections", noun: "collection", plural: "collections" },
  { id: "brands", label: "Brands", module: "brands", noun: "brand", plural: "brands" },
  { id: "fragrance-families", label: "Fragrance families", module: "categories", noun: "fragrance family", plural: "fragrance families" },
];

export default function CatalogPage() {
  const { can } = useAuth();
  const tabs = TABS.filter((t) => can(`${t.module}.view`));
  const [active, setActive] = useState(tabs[0]?.id);
  const cur = tabs.find((t) => t.id === active) || tabs[0];
  if (!cur) return <p className="text-sm text-ink-muted">Your role doesn't include catalog setup.</p>;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Catalog setup</h1>
        <p className="text-sm text-ink-muted mt-1">The groups your products are organised into.</p>
      </div>
      <div className="flex gap-1 border-b border-border" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={t.id === cur.id} onClick={() => setActive(t.id)}
            className={`px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors ${t.id === cur.id ? "border-[var(--gold)] text-ink font-medium" : "border-transparent text-ink-muted hover:text-ink"}`}>{t.label}</button>
        ))}
      </div>
      <TaxonomyTab key={cur.id} type={cur.id} module={cur.module} noun={cur.noun} plural={cur.plural} />
    </div>
  );
}
