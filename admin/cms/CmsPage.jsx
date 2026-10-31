import { useState } from "react";
import { useAuth } from "../../src/auth/AuthContext";
import { RESOURCE_KEYS, SECTIONS } from "../../src/services/mappers/cms";
import CmsResource from "./CmsResource";
import HomepageBuilder from "./HomepageBuilder";

// /admin/cms — Banners, FAQs and Announcements as tabs; a tab shows only if the role can view that module.
export default function CmsPage() {
  const { can } = useAuth();
  const tabs = [can('homepage.view') ? { key: 'homepage', tab: 'Website page builder', module: 'homepage' } : null, ...RESOURCE_KEYS.map((k) => SECTIONS[k]).filter((s) => can(`${s.module}.view`))].filter(Boolean);
  const [active, setActive] = useState(tabs[0]?.key);
  const section = tabs.find((t) => t.key === active) || tabs[0];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-[#182308]">Content</h1>
        <p className="text-sm text-[#182308]-muted mt-1">Manage every storefront page, section order, floating assistants, banners, FAQs and announcements from one visual editor.</p>
      </div>
      {!section ? <p className="text-sm text-[#182308]-muted">You do not have access to any content sections.</p> : (<>
        <div className="flex gap-2 overflow-x-auto border-b border-[#263e0e]/10" role="tablist">
          {tabs.map((t) => (
            <button key={t.key} role="tab" aria-selected={t.key === section.key} onClick={() => setActive(t.key)}
              className={`px-4 py-2 text-sm -mb-px border-b-2 ${t.key === section.key ? "border-gold text-[#182308]" : "border-transparent text-[#182308]-muted hover:text-[#182308]"}`}>{t.tab}</button>
          ))}
        </div>
        {section.key === 'homepage' ? <HomepageBuilder /> : <CmsResource key={section.key} section={section} />}
      </>)}
    </div>
  );
}
