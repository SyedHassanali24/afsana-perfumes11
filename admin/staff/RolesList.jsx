import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Card from "../components/Card";
import Button from "../components/Button";
import DataTable from "../components/DataTable";
import ConfirmPasswordModal from "../components/ConfirmPasswordModal";
import RoleEditorDrawer from "./RoleEditorDrawer";
import { useAuth } from "../../src/auth/AuthContext";
import useApi from "../../src/hooks/useApi";
import { rolesApi, permissionsApi } from "../../src/services";

export default function RolesList() {
  const { can } = useAuth();
  const { data, loading, error, reload } = useApi(() => rolesApi.list(), []);
  const { data: catalog } = useApi(() => permissionsApi.catalog(), []);
  const [editor, setEditor] = useState({ open: false, role: null });
  const [toDelete, setToDelete] = useState(null);
  const [notice, setNotice] = useState(null);
  const flash = (type, text) => { setNotice({ type, text }); setTimeout(() => setNotice(null), 4000); };
  const roles = data?.roles || [];

  const columns = [
    { key: "name", header: "Role", render: (r) => <span>{r.name}{r.isSystem && <span className="ml-2 text-xs text-ink-muted">system</span>}</span> },
    { key: "level", header: "Level", align: "right" },
    { key: "modules", header: "Modules", align: "right", render: (r) => (r.isUnrestricted ? "All" : new Set(r.grants.map((g) => g.module)).size) },
    { key: "staffCount", header: "Staff", align: "right" },
    { key: "actions", header: "", align: "right", render: (r) => (
      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => setEditor({ open: true, role: r })} className="p-1.5 rounded-sm text-ink-muted hover:bg-bg hover:text-ink" aria-label={`${r.editable ? "Edit" : "View"} ${r.name}`}><Pencil className="w-4 h-4" /></button>
        {can("roles.delete") && !r.isSystem && r.editable && (
          <button onClick={() => setToDelete(r)} className="p-1.5 rounded-sm text-ink-muted hover:bg-danger-soft hover:text-danger" aria-label={`Delete ${r.name}`}><Trash2 className="w-4 h-4" /></button>
        )}
      </div>
    ) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">Roles decide what staff can see and do. Changes apply immediately.</p>
        {can("roles.create") && <Button icon={Plus} onClick={() => setEditor({ open: true, role: null })}>New role</Button>}
      </div>
      {notice && <p role="status" className={`text-sm rounded-sm px-3 py-2 ${notice.type === "ok" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>{notice.text}</p>}
      <Card padded={false}>
        <div className="p-5">
          {error ? (
            <div className="py-10 text-center space-y-3"><p className="text-sm text-danger">{error.message}</p><Button variant="secondary" onClick={reload}>Try again</Button></div>
          ) : (
            <DataTable loading={loading} rows={roles} columns={columns} onRowClick={(r) => setEditor({ open: true, role: r })} emptyMessage="No roles yet." />
          )}
        </div>
      </Card>
      <RoleEditorDrawer open={editor.open} role={editor.role} catalog={catalog} onClose={() => setEditor({ open: false, role: null })}
        onSaved={() => { setEditor({ open: false, role: null }); flash("ok", "Role saved."); reload(); }} />
      <ConfirmPasswordModal open={Boolean(toDelete)} danger title={`Delete ${toDelete?.name || "role"}?`} message="Roles that still have staff can't be deleted." confirmLabel="Delete"
        onClose={() => setToDelete(null)} onConfirm={async (pw) => { await rolesApi.remove(toDelete.id, pw); flash("ok", "Role deleted."); reload(); }} />
    </div>
  );
}
