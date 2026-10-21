import { useEffect, useState } from "react";
import Card from "../components/Card";
import Button from "../components/Button";
import Drawer from "../components/Drawer";
import ConfirmDialog from "../components/ConfirmDialog";
import StatCard from "../components/StatCard";
import DataTable from "../components/DataTable";
import { Field, Input, Select, Textarea } from "../components/FormFields";
import useApi from "../../src/hooks/useApi";
import { useAuth } from "../../src/auth/AuthContext";
import { financeApi } from "../../src/services";

// Route: /admin/finance (finance.view). Expenses table needs expenses.view; add / edit / delete need expenses.create / edit / delete.
// Definitions: revenue = orders placed in the period except Cancelled / Returned / Refunded; refunds = partial refunds on those orders;
// cost of goods = cost price saved on each order line; net profit = revenue - refunds - cost of goods - expenses. Times are Pakistan time.
const LIMIT = 20;
const PERIODS = [["this_month", "This month"], ["last_month", "Last month"], ["last_30", "Last 30 days"], ["this_year", "This year"], ["custom", "Custom dates"]];
const CATEGORIES = ["Shipping", "Packaging", "Advertising", "Salaries", "Rent", "Utilities", "Other"];
const money = (n) => (n === null || n === undefined ? "Hidden" : `PKR ${Number(n).toLocaleString("en-PK")}`);
const today = () => new Date(Date.now() + 5 * 3600 * 1000).toISOString().slice(0, 10); // Pakistan "today" as YYYY-MM-DD
const blank = () => ({ category: "Advertising", amount: "", date: today(), description: "" });

export default function FinancePage() {
  const { can } = useAuth();
  const [period, setPeriod] = useState("this_month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const [drawer, setDrawer] = useState(null);   // null | { id?: string, form }
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [removing, setRemoving] = useState(null);

  const customReady = period !== "custom" || (from && to);
  const range = period === "custom" ? { period, from, to } : { period };
  const sum = useApi(() => (customReady ? financeApi.summary(range) : Promise.resolve(null)), [period, from, to]);
  const showExpenses = can("expenses.view");
  const listQuery = { category: category || undefined, ...(period === "custom" ? { from, to } : {}), page, limit: LIMIT };
  const exp = useApi(() => (showExpenses && customReady && (period === "custom" || sum.data) ? financeApi.expenses({ ...listQuery, ...(period !== "custom" && sum.data ? { from: sum.data.range.from, to: sum.data.range.to } : {}) }) : Promise.resolve(null)), [showExpenses, category, page, period, from, to, sum.data?.range?.from, sum.data?.range?.to]);
  const s = sum.data; const pg = exp.data?.pagination;

  useEffect(() => { if (pg && pg.pages >= 1 && page > pg.pages) setPage(pg.pages); }, [pg, page]);
  const reloadAll = async () => { await Promise.all([sum.reload(), exp.reload()]); };

  const open = (e) => { setProblem(""); setDrawer(e ? { id: e._id, form: { category: e.category, amount: String(e.amount), date: e.date, description: e.description } } : { form: blank() }); };
  const set = (k) => (ev) => setDrawer((d) => ({ ...d, form: { ...d.form, [k]: ev.target.value } }));
  const save = async () => {
    setBusy(true); setProblem("");
    const body = { category: drawer.form.category, amount: Number(drawer.form.amount), date: drawer.form.date, description: drawer.form.description.trim() || undefined };
    try { drawer.id ? await financeApi.updateExpense(drawer.id, body) : await financeApi.createExpense(body); setDrawer(null); await reloadAll(); }
    catch (e) { setProblem(e.details?.[0]?.message || e.message || "Could not save."); }
    finally { setBusy(false); }
  };

  const columns = [
    { key: "date", header: "Date" },
    { key: "category", header: "Category" },
    { key: "description", header: "Note", render: (r) => <span className="text-ink-muted">{r.description || "—"}</span> },
    { key: "amount", header: "Amount", align: "right", render: (r) => money(r.amount) },
    ...(can("expenses.edit") || can("expenses.delete") ? [{ key: "actions", header: "", align: "right", render: (r) => (
      <span className="inline-flex gap-3">
        {can("expenses.edit") && <button type="button" className="text-xs text-gold hover:underline" onClick={(ev) => { ev.stopPropagation(); open(r); }}>Edit</button>}
        {can("expenses.delete") && <button type="button" className="text-xs text-danger hover:underline" onClick={(ev) => { ev.stopPropagation(); setRemoving(r); }}>Delete</button>}
      </span>) }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-ink">Finance</h1>
          <p className="text-sm text-ink-muted mt-1">{s ? `${s.range.from} to ${s.range.to} (Pakistan time)` : " "}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-44"><Select value={period} onChange={(e) => { setPeriod(e.target.value); setPage(1); }} aria-label="Period">{PERIODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></div>
          {period === "custom" && <>
            <div className="w-40"><Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} aria-label="From date" /></div>
            <div className="w-40"><Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} aria-label="To date" /></div>
          </>}
        </div>
      </div>

      {!customReady && <p className="text-sm text-ink-muted">Pick both dates to see the numbers.</p>}
      {sum.error && <div className="space-y-3"><p className="text-sm text-danger">{sum.error.message}</p><Button variant="secondary" onClick={sum.reload}>Try again</Button></div>}

      {s && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label={`Revenue (${s.orders} ${s.orders === 1 ? "order" : "orders"})`} value={money(s.revenue)} />
            <StatCard label="Refunds" value={money(s.refunds)} />
            <StatCard label="Cost of goods" value={money(s.cogs)} />
            <StatCard label="Gross profit" value={money(s.grossProfit)} />
            <StatCard label="Expenses" value={money(s.expenses.total)} />
            <StatCard label={s.margin === null ? "Net profit" : `Net profit (${s.margin}% margin)`} value={money(s.netProfit)} />
          </div>
          {s.missingCost > 0 && <p className="text-xs text-warning" role="note">{s.missingCost} order {s.missingCost === 1 ? "line has" : "lines have"} no cost price, so profit is shown higher than it really is. Add the cost price to those products.</p>}

          <Card>
            <p className="text-sm text-ink mb-3">Expenses by category</p>
            {!s.expenses.byCategory.length ? <p className="text-sm text-ink-muted">No expenses in this period.</p> : (
              <ul className="space-y-2">{s.expenses.byCategory.map((c) => (
                <li key={c.category} className="text-sm">
                  <div className="flex justify-between"><span className="text-ink">{c.category}</span><span className="text-ink-muted">{money(c.total)}{c.share !== null ? ` · ${c.share}%` : ""}</span></div>
                  <div className="h-1.5 mt-1 rounded-full bg-border overflow-hidden"><div className="h-full bg-gold" style={{ width: `${c.share || 0}%` }} /></div>
                </li>))}</ul>
            )}
          </Card>
        </>
      )}

      {showExpenses && (
        <Card padded={false}>
          <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-border">
            <div className="flex items-center gap-3">
              <p className="text-sm text-ink">Expenses</p>
              <div className="w-44"><Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} aria-label="Category"><option value="">All categories</option>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select></div>
              {exp.data && <span className="text-xs text-ink-muted">Total shown: {money(exp.data.total)}</span>}
            </div>
            {can("expenses.create") && <Button size="sm" onClick={() => open(null)}>Add expense</Button>}
          </div>
          <div className="p-5">
            {exp.error ? <div className="py-8 text-center space-y-3"><p className="text-sm text-danger">{exp.error.message}</p><Button variant="secondary" onClick={exp.reload}>Try again</Button></div> : (
              <DataTable loading={exp.loading} rows={(exp.data?.expenses || []).map((r) => ({ ...r, id: r._id }))} columns={columns} emptyMessage="No expenses in this period."
                pagination={pg && { page: pg.page, totalPages: pg.pages, onPageChange: setPage }} />
            )}
          </div>
        </Card>
      )}

      <Drawer open={Boolean(drawer)} onClose={() => setDrawer(null)} size="md" title={drawer?.id ? "Edit expense" : "Add expense"}
        footer={<><Button variant="secondary" onClick={() => setDrawer(null)}>Cancel</Button><Button onClick={save} disabled={busy || !drawer?.form.amount || !drawer?.form.date}>{busy ? "Saving…" : "Save"}</Button></>}>
        {drawer && (
          <div className="space-y-4">
            <Field label="Category"><Select value={drawer.form.category} onChange={set("category")}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
            <Field label="Amount (PKR)"><Input type="number" inputMode="numeric" min="1" step="1" value={drawer.form.amount} onChange={set("amount")} /></Field>
            <Field label="Date"><Input type="date" value={drawer.form.date} onChange={set("date")} /></Field>
            <Field label="Note (optional)"><Textarea rows={3} maxLength={200} value={drawer.form.description} onChange={set("description")} placeholder="Example: Facebook ads for Eid" /></Field>
            {problem && <p role="alert" className="text-sm text-danger">{problem}</p>}
          </div>
        )}
      </Drawer>

      <ConfirmDialog open={Boolean(removing)} danger title="Delete this expense?" message={removing ? `${removing.category} · ${money(removing.amount)} · ${removing.date}. This cannot be undone.` : ""} confirmLabel="Delete"
        onConfirm={async () => { await financeApi.deleteExpense(removing._id); await reloadAll(); }} onClose={() => setRemoving(null)} />
    </div>
  );
}
