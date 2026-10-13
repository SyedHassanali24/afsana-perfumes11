import { Check } from "../components/FormFields";
import { useAuth } from "../../src/auth/AuthContext";
import { human } from "../../src/auth/fieldLabels";

const SIMPLE_SCOPES = [["all", "All records"], ["createdByMe", "Only created by them"], ["assigned", "Only assigned to them"]];

/**
 * grants: [{ module, actions[], scope:{kind,values} }]   onChange(nextGrants)
 * Checkboxes for access the current user doesn't hold are disabled (server enforces this too).
 */
export default function PermissionMatrix({ catalog, grants, onChange, readOnly }) {
  const { can } = useAuth();
  const forModule = (m) => grants.filter((g) => g.module === m);
  const actionsOf = (m) => new Set(forModule(m).flatMap((g) => g.actions));
  const scopeOf = (m) => forModule(m)[0]?.scope || { kind: "all", values: [] };

  const write = (m, actions, scope) => {
    const rest = grants.filter((g) => g.module !== m);
    onChange(actions.length ? [...rest, { module: m, actions, scope }] : rest);
  };
  const toggle = (m, a, on) => { const s = actionsOf(m); on ? s.add(a) : s.delete(a); write(m, [...s], scopeOf(m)); };
  const setScope = (m, kind) => write(m, [...actionsOf(m)], { kind, values: [] });
  const risky = new Set(catalog.highRisk);

  return (
    <div className="overflow-x-auto border border-border rounded-sm">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-bg">
            <th className="sticky left-0 bg-bg text-left font-medium text-ink-muted py-2 px-3 min-w-[9rem]">Module</th>
            {catalog.actions.map((a) => <th key={a} className="font-medium text-ink-muted py-2 px-2 whitespace-nowrap">{human(a)}</th>)}
            <th className="font-medium text-ink-muted py-2 px-3 text-left">Applies to</th>
          </tr>
        </thead>
        <tbody>
          {catalog.groups.map((grp) => (
            <Group key={grp.label} label={grp.label} cols={catalog.actions.length + 2}>
              {grp.modules.map((m) => {
                const has = actionsOf(m);
                const scope = scopeOf(m);
                return (
                  <tr key={m} className="border-b border-border/60 last:border-0">
                    <td className="sticky left-0 bg-surface py-1.5 px-3 text-ink whitespace-nowrap">{human(m)}</td>
                    {catalog.actions.map((a) => (
                      <td key={a} className="text-center px-2">
                        <Check label="" checked={has.has(a)} disabled={readOnly || !can(`${m}.${a}`)}
                          title={`${m}.${a}${risky.has(`${m}.${a}`) ? " (high risk: asks for a password)" : ""}${!can(`${m}.${a}`) ? " (you don't have this access)" : ""}`}
                          onChange={(on) => toggle(m, a, on)} className={risky.has(`${m}.${a}`) ? "outline outline-1 outline-[var(--warning)] rounded-sm" : ""} />
                      </td>
                    ))}
                    <td className="px-3">
                      {has.size > 0 && (
                        <select value={scope.kind} disabled={readOnly} onChange={(e) => setScope(m, e.target.value)}
                          className="bg-bg border border-border rounded-sm px-1.5 py-1 text-xs text-ink">
                          {SIMPLE_SCOPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                          {!SIMPLE_SCOPES.some(([k]) => k === scope.kind) && <option value={scope.kind}>{human(scope.kind)}{scope.values.length ? `: ${scope.values.length}` : ""}</option>}
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })}
            </Group>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Group({ label, cols, children }) {
  return (
    <>
      <tr><td colSpan={cols} className="bg-bg text-ink-muted font-medium py-1.5 px-3 border-b border-border">{label}</td></tr>
      {children}
    </>
  );
}
