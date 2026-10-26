import { useState } from "react";
import Card from "../components/Card";
import Button from "../components/Button";
import { Input, Select } from "../components/FormFields";
import DataTable from "../components/DataTable";
import useApi from "../../src/hooks/useApi";
import useDebounce from "../../src/hooks/useDebounce";
import { auditApi, permissionsApi } from "../../src/services";
import { human } from "../../src/auth/fieldLabels";

const when = (d) => new Date(d).toLocaleString();

export default function AuditLogList() {
  const [action, setAction] = useState("");
  const [module, setModule] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const q = useDebounce(action);
  const { data: catalog } = useApi(() => permissionsApi.catalog(), []);
  const { data, loading, error, reload } = useApi(() => auditApi.list({
    q, module, page, limit: 25,
    from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
    to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
  }), [q, module, from, to, page]);
  const modules = catalog ? catalog.groups.flatMap((g) => g.modules) : [];
  const reset = (fn) => (e) => { fn(e.target.value); setPage(1); };
  const pg = data?.pagination;

  const columns = [
    { key: "at", header: "When", render: (r) => when(r.at) },
    { key: "user", header: "Who", render: (r) => r.user?.email || "System" },
    { key: "action", header: "Action" },
    { key: "module", header: "Area", render: (r) => (r.module ? human(r.module) : "—") },
    { key: "ip", header: "IP", render: (r) => r.ip || "—" },
    { key: "d", header: "", align: "right", render: (r) => (r.oldValue || r.newValue) && <Button variant="ghost" size="sm" onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? "Hide" : "Details"}</Button> },
  ];
  const rows = data?.logs || [];
  const openRow = rows.find((r) => r.id === open);

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">A permanent record of sensitive actions. Entries can't be edited or deleted.</p>
      <Card padded={false}>
        <div className="flex flex-wrap gap-3 p-5 border-b border-border">
          <div className="flex-1 min-w-[180px]"><Input placeholder="Action starts with… (e.g. staff.)" value={action} onChange={reset(setAction)} /></div>
          <div className="w-44"><Select value={module} onChange={reset(setModule)}><option value="">All areas</option>{modules.map((m) => <option key={m} value={m}>{human(m)}</option>)}</Select></div>
          <div className="w-40"><Input type="date" aria-label="From date" value={from} onChange={reset(setFrom)} /></div>
          <div className="w-40"><Input type="date" aria-label="To date" value={to} onChange={reset(setTo)} /></div>
        </div>
        <div className="p-5 space-y-3">
          {error ? (
            <div className="py-10 text-center space-y-3"><p className="text-sm text-danger">{error.message}</p><Button variant="secondary" onClick={reload}>Try again</Button></div>
          ) : (
            <DataTable loading={loading} rows={rows} columns={columns} emptyMessage="No activity matches these filters." pagination={pg && { page: pg.page, totalPages: pg.pages, onPageChange: setPage }} />
          )}
          {openRow && (
            <div className="grid md:grid-cols-2 gap-3">
              {["oldValue", "newValue"].map((k) => (
                <div key={k}>
                  <p className="text-xs text-ink-muted mb-1">{k === "oldValue" ? "Before" : "After"}</p>
                  <pre className="text-xs bg-bg border border-border rounded-sm p-3 overflow-auto max-h-64 text-ink">{openRow[k] === undefined ? "—" : JSON.stringify(openRow[k], null, 2)}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
