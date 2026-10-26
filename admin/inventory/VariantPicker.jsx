import { useState } from "react";
import { Input } from "../components/FormFields";
import useApi from "../../src/hooks/useApi";
import useDebounce from "../../src/hooks/useDebounce";
import { inventoryApi } from "../../src/services";

/** Search products by name/SKU and pick one size. `exclude` = variantIds already chosen. */
export default function VariantPicker({ onPick, exclude = [] }) {
  const [text, setText] = useState("");
  const q = useDebounce(text);
  const { data, loading } = useApi(() => (q.trim().length >= 2 ? inventoryApi.list({ q: q.trim(), limit: 8 }) : Promise.resolve({ items: [] })), [q]);
  const items = (data?.items || []).filter((i) => !exclude.includes(String(i.variantId)));
  return (
    <div className="relative">
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search product or SKU to add…" aria-label="Add product" />
      {q.trim().length >= 2 && (
        <ul className="absolute z-10 left-0 right-0 mt-1 bg-surface border border-border rounded-sm shadow-card max-h-56 overflow-auto">
          {loading && <li className="px-3 py-2 text-sm text-ink-muted">Searching…</li>}
          {!loading && items.length === 0 && <li className="px-3 py-2 text-sm text-ink-muted">No matching sizes.</li>}
          {items.map((i) => (
            <li key={i.variantId}>
              <button type="button" onClick={() => { onPick(i); setText(""); }} className="w-full text-left px-3 py-2 text-sm hover:bg-bg text-ink">
                {i.productName} · {i.label} <span className="text-xs text-ink-muted">{i.sku} · {i.current} on hand</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
