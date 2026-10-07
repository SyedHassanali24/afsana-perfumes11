import { useState } from "react";
import { useAuth } from "../../src/auth/AuthContext";
import StaffList from "./StaffList";
import RolesList from "./RolesList";
import AuditLogList from "./AuditLogList";

const TABS = [
  { id: "staff", label: "Staff", permission: "staff.view", View: StaffList },
  { id: "roles", label: "Roles & permissions", permission: "roles.view", View: RolesList },
  { id: "audit", label: "Audit log", permission: "auditLogs.view", View: AuditLogList },
];

// Route: /admin/staff  (guard with any of the three permissions; tabs the user can't open are hidden)
export default function StaffPage() {
  const { can } = useAuth();
  const tabs = TABS.filter((t) => can(t.permission));
  const [active, setActive] = useState(tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) || tabs[0];
  if (!current) return <p className="text-sm text-ink-muted">Your role doesn't include team management.</p>;
  const { View } = current;
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-ink">Staff &amp; access</h1>
      <div className="flex gap-1 border-b border-border" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={t.id === current.id} onClick={() => setActive(t.id)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${t.id === current.id ? "border-[var(--gold)] text-ink" : "border-transparent text-ink-muted hover:text-ink"}`}>{t.label}</button>
        ))}
      </div>
      <View />
    </div>
  );
}
