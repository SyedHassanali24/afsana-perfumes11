import { useState } from "react";
import { Plus } from "lucide-react";
import Card from "../components/Card";
import Button from "../components/Button";
import { Input, Select } from "../components/FormFields";
import DataTable from "../components/DataTable";
import StatusPill from "../components/StatusPill";
import TempPasswordModal from "../components/TempPasswordModal";
import StaffFormDrawer from "./StaffFormDrawer";
import StaffDetailDrawer from "./StaffDetailDrawer";
import { useAuth } from "../../src/auth/AuthContext";
import useApi from "../../src/hooks/useApi";
import useDebounce from "../../src/hooks/useDebounce";
import { staffApi, permissionsApi } from "../../src/services";

const when = (d) => (d ? new Date(d).toLocaleDateString() : "Never");

export default function StaffList() {
  const { can } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState(null);
  const [form, setForm] = useState({ open: false, staffId: null });
  const [temp, setTemp] = useState(null); // { email, password }
  const [ver, setVer] = useState(0); // bumps to refresh the open detail drawer after an edit
  const [notice, setNotice] = useState(null);
  const q = useDebounce(search);

  const { data, loading, error, reload } = useApi(() => staffApi.list({ q, status, page, limit: 20 }), [q, status, page]);
  const { data: rolesData } = useApi(() => staffApi.assignableRoles(), []);
  const { data: catalog } = useApi(() => permissionsApi.catalog(), []);
  const roles = rolesData?.roles || [];
  const flash = (text) => { setNotice(text); setTimeout(() => setNotice(null), 4000); };
  const pg = data?.pagination;

  const columns = [
    { key: "name", header: "Name" },
    { key: "email", header: "Email" },
    { key: "role", header: "Role", render: (r) => r.role?.name || "—" },
    { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} /> },
    { key: "lastLoginAt", header: "Last sign-in", render: (r) => when(r.lastLoginAt) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">{pg ? `${pg.total} ${pg.total === 1 ? "person" : "people"} with admin access` : "\u00A0"}</p>
        {can("staff.create") && <Button icon={Plus} onClick={() => setForm({ open: true, staffId: null })}>Add staff</Button>}
      </div>
      {notice && <p role="status" className="text-sm rounded-sm px-3 py-2 bg-success-soft text-success">{notice}</p>}
      <Card padded={false}>
        <div className="flex flex-wrap gap-3 p-5 border-b border-border">
          <div className="flex-1 min-w-[200px]"><Input placeholder="Search name or email…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
          <div className="w-40"><Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option><option>Active</option><option>Suspended</option><option>Disabled</option></Select></div>
        </div>
        <div className="p-5">
          {error ? (
            <div className="py-10 text-center space-y-3"><p className="text-sm text-danger">{error.status === 403 ? "You don't have access to staff." : error.message}</p><Button variant="secondary" onClick={reload}>Try again</Button></div>
          ) : (
            <DataTable loading={loading} rows={data?.staff || []} columns={columns} onRowClick={(r) => setDetailId(r.id)}
              emptyMessage={q || status ? "No staff match these filters." : "No staff yet."}
              pagination={pg && { page: pg.page, totalPages: pg.pages, onPageChange: setPage }} />
          )}
        </div>
      </Card>

      <StaffDetailDrawer staffId={detailId} version={ver} catalog={catalog} onClose={() => setDetailId(null)} onChanged={reload}
        onEdit={(id) => setForm({ open: true, staffId: id })} onTempPassword={setTemp} />
      <StaffFormDrawer open={form.open} staffId={form.staffId} roles={roles} restrictableFields={catalog?.restrictableFields} onClose={() => setForm({ open: false, staffId: null })}
        onSaved={(r) => { const wasCreate = !form.staffId; setForm({ open: false, staffId: null }); reload(); flash(wasCreate ? "Staff member added." : "Changes saved."); if (r?.tempPassword) setTemp({ email: r.staff.email, password: r.tempPassword }); setVer((n) => n + 1); }} />
      <TempPasswordModal open={Boolean(temp)} email={temp?.email} password={temp?.password} onClose={() => setTemp(null)} />
    </div>
  );
}
