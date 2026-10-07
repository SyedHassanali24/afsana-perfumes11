import { useState } from "react";
import { useAuth } from "../../src/auth/AuthContext";
import { RESOURCE_KEYS, SECTIONS } from "../../src/services/mappers/cms";
import CmsResource from "./CmsResource";

// /admin/cms — Banners, FAQs and Announcements as tabs; a tab shows only if the role can view that module.
export default function CmsPage() {
  const { can } = useAuth();
  const tabs = RESOURCE_KEYS.map((k) => SECTIONS[k]).filter((s) => can(`${s.module}.view`));
  const [active, setActive] = useState(tabs[0]?.key);
  const section = tabs.find((t) => t.key === active) || tabs[0];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Content</h1>
        <p className="text-sm text-ink-muted mt-1">Banners, FAQs and the announcement bar for the shop.</p>
      </div>
      {!section ? <p className="text-sm text-ink-muted">You do not have access to any content sections.</p> : (<>
        <div className="flex gap-2 border-b border-border" role="tablist">
          {tabs.map((t) => (
            <button key={t.key} role="tab" aria-selected={t.key === section.key} onClick={() => setActive(t.key)}
              className={`px-4 py-2 text-sm -mb-px border-b-2 ${t.key === section.key ? "border-gold text-ink" : "border-transparent text-ink-muted hover:text-ink"}`}>{t.tab}</button>
          ))}
        </div>
        <CmsResource key={section.key} section={section} />
      </>)}
    </div>
  );
}
