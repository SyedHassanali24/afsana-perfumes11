import { useMemo, useState } from "react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import { BarChart3, Copy, ExternalLink, Link2, RefreshCw, Users, Eye, Globe2 } from "lucide-react";
import Card from "../components/Card";
import Button from "../components/Button";
import useApi from "../../src/hooks/useApi";
import { analyticsApi } from "../../src/services";

const SOURCE_COLORS = {
  instagram: "#d946ef",
  tiktok: "#111827",
  youtube: "#ef4444",
  facebook: "#3b82f6",
  whatsapp: "#16a34a",
  search: "#8b5cf6",
  direct: "#64748b",
  email: "#0d9488",
  other_social: "#ec4899",
  referral: "#d97706",
  other: "#94a3b8",
};
const number = (value) => new Intl.NumberFormat("en").format(Number(value) || 0);
const dateLabel = (value) => String(value || "").slice(5);
const slug = (value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);

function Metric({ icon: Icon, label, value, detail }) {
  return (
    <div className="rounded-2xl border border-[#1e1b4b]/10 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-[#64748b]">{label}</span>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#4f46e5]/10 text-[#4f46e5]"><Icon className="h-4 w-4" /></span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-[#172033]">{typeof value === "number" ? number(value) : value}</p>
      {detail && <p className="mt-1 text-[11px] text-[#64748b]">{detail}</p>}
    </div>
  );
}

export default function TrafficAnalytics() {
  const [days, setDays] = useState(30);
  const { data, loading, error, reload } = useApi(() => analyticsApi.traffic(days), [days]);
  const [platform, setPlatform] = useState("instagram");
  const [campaign, setCampaign] = useState("profile-link");
  const [destination, setDestination] = useState("/");
  const [copyState, setCopyState] = useState("");
  const traffic = data?.traffic;
  const nonZeroSources = useMemo(() => (traffic?.sources || []).filter((item) => item.visits > 0), [traffic?.sources]);
  const topSource = nonZeroSources[0];
  const campaignUrl = useMemo(() => {
    const entered = destination.trim() || "/";
    const path = entered.startsWith("/") && !entered.startsWith("//") ? entered : "/";
    const target = new URL(path, window.location.origin);
    target.searchParams.set("utm_source", platform);
    target.searchParams.set("utm_medium", platform === "youtube" ? "video" : platform === "whatsapp" ? "messaging" : "social");
    target.searchParams.set("utm_campaign", slug(campaign) || "afsana-campaign");
    return target.toString();
  }, [platform, campaign, destination]);

  const copyCampaignUrl = async () => {
    try {
      await navigator.clipboard.writeText(campaignUrl);
      setCopyState("Campaign link copied.");
    } catch {
      setCopyState("Copy is unavailable in this browser. Select and copy the link above.");
    }
  };

  return (
    <section className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#4f46e5]">Audience acquisition</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#172033]">Where visitors come from</h2>
          <p className="mt-1 text-xs leading-5 text-[#64748b]">Anonymous visits grouped by their first known traffic source.</p>
        </div>
        <div className="flex items-center gap-2">
          <select aria-label="Traffic date range" value={days} onChange={(e) => setDays(Number(e.target.value))} className="min-h-10 rounded-xl border border-[#1e1b4b]/15 bg-white px-3 text-sm text-[#172033]">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <Button type="button" variant="secondary" size="sm" onClick={reload} disabled={loading} icon={RefreshCw}>Refresh</Button>
        </div>
      </div>

      {error && <Card><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-[#b42318]">{error.message || "Traffic analytics could not be loaded."}</p><Button type="button" variant="secondary" onClick={reload}>Try again</Button></div></Card>}

      {loading && !traffic ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3"><Card><div className="h-20 animate-pulse rounded-xl bg-[#eef2ff]"/></Card><Card><div className="h-20 animate-pulse rounded-xl bg-[#eef2ff]"/></Card><Card className="col-span-2 lg:col-span-1"><div className="h-20 animate-pulse rounded-xl bg-[#eef2ff]"/></Card></div>
      ) : traffic ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Metric icon={Users} label="Visits" value={traffic.visits} detail="Anonymous browser sessions" />
            <Metric icon={Eye} label="Page views" value={traffic.pageViews} detail="Storefront pages opened" />
            <Metric icon={Globe2} label="Top source" value={topSource?.label || "—"} detail={topSource ? number(topSource.visits) + " visits" : "No visits recorded yet"} />
          </div>

          {traffic.visits === 0 && (
            <div className="rounded-2xl border border-[#8b5cf6]/20 bg-[#f5f3ff] px-4 py-3 text-xs leading-5 text-[#514b75]">
              Traffic tracking is now installed. New visits will appear here from this deployment onward; earlier visits cannot be attributed retroactively.
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
            <Card className="xl:col-span-2">
              <div className="mb-3"><h3 className="text-sm font-semibold text-[#172033]">Visits by source</h3><p className="mt-1 text-[11px] text-[#64748b]">Share of anonymous visits in this period</p></div>
              {nonZeroSources.length ? (
                <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(150px,.9fr)_minmax(0,1fr)] xl:grid-cols-1 2xl:grid-cols-[minmax(150px,.9fr)_minmax(0,1fr)]">
                  <div className="h-[210px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={nonZeroSources} dataKey="visits" nameKey="label" innerRadius={48} outerRadius={78} paddingAngle={2} stroke="none">
                          {nonZeroSources.map((entry) => <Cell key={entry.key} fill={SOURCE_COLORS[entry.key] || "#94a3b8"} />)}
                        </Pie>
                        <Tooltip formatter={(value, name) => [number(value), name]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {nonZeroSources.slice(0, 7).map((source) => (
                      <div key={source.key} className="flex items-center justify-between gap-3 text-xs">
                        <span className="flex min-w-0 items-center gap-2 text-[#475569]"><i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: SOURCE_COLORS[source.key] || "#94a3b8" }}/><span className="truncate">{source.label}</span></span>
                        <span className="shrink-0 font-semibold tabular-nums text-[#172033]">{number(source.visits)} <small className="font-normal text-[#64748b]">({source.share}%)</small></span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <div className="grid h-[210px] place-items-center text-center text-xs text-[#64748b]">Source chart will appear when new visits arrive.</div>}
            </Card>

            <Card className="xl:col-span-3">
              <div className="mb-3"><h3 className="text-sm font-semibold text-[#172033]">Visits over time</h3><p className="mt-1 text-[11px] text-[#64748b]">Daily anonymous sessions · Pakistan time</p></div>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={traffic.daily || []} margin={{ left: -18, right: 8, top: 8, bottom: 0 }}>
                    <defs><linearGradient id="trafficVisitsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7357ff" stopOpacity={0.28}/><stop offset="100%" stopColor="#7357ff" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid stroke="#1e1b4b1a" vertical={false}/>
                    <XAxis dataKey="date" tickFormatter={dateLabel} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#64748b" }} minTickGap={24}/>
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#64748b" }} width={32}/>
                    <Tooltip labelFormatter={(label) => "Date: " + label} formatter={(value) => [number(value), "Visits"]} contentStyle={{ background: "#fff", border: "1px solid #1e1b4b1a", borderRadius: 10, fontSize: 12 }}/>
                    <Area type="monotone" dataKey="visits" stroke="#7357ff" strokeWidth={2.5} fill="url(#trafficVisitsFill)" activeDot={{ r: 4 }}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card>
            <div className="mb-3"><h3 className="text-sm font-semibold text-[#172033]">Channel breakdown</h3><p className="mt-1 text-[11px] text-[#64748b]">Platforms you asked to compare, plus search, direct and referrals</p></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead><tr className="border-b border-[#1e1b4b]/10 text-[#64748b]"><th className="py-3 pr-3 font-medium">Source</th><th className="py-3 px-3 text-right font-medium">Visits</th><th className="py-3 px-3 text-right font-medium">Page views</th><th className="py-3 pl-3 text-right font-medium">Share</th></tr></thead>
                <tbody>{(traffic.sources || []).map((source) => (
                  <tr key={source.key} className="border-b last:border-0 border-[#1e1b4b]/5">
                    <td className="py-3 pr-3"><span className="inline-flex items-center gap-2 text-[#172033]"><i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SOURCE_COLORS[source.key] || "#94a3b8" }}/>{source.label}</span></td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums text-[#172033]">{number(source.visits)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-[#475569]">{number(source.pageViews)}</td>
                    <td className="py-3 pl-3 text-right tabular-nums text-[#475569]">{source.share}%</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </Card>

          <Card>
            <div className="mb-3"><h3 className="text-sm font-semibold text-[#172033]">Top landing pages</h3><p className="mt-1 text-[11px] text-[#64748b]">The first page a visit opened</p></div>
            {(traffic.landingPages || []).length ? <div className="space-y-3">{traffic.landingPages.map((page) => (
              <div key={page.path} className="flex items-center justify-between gap-4 border-b border-[#1e1b4b]/5 pb-3 last:border-0 last:pb-0"><span className="min-w-0 truncate font-mono text-xs text-[#475569]">{page.path}</span><span className="shrink-0 text-xs font-semibold tabular-nums text-[#172033]">{number(page.visits)} visits</span></div>
            ))}</div> : <p className="py-6 text-center text-xs text-[#64748b]">Landing page data will appear after the first visits.</p>}
          </Card>

          <Card>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div><div className="flex items-center gap-2"><Link2 className="h-4 w-4 text-[#7357ff]"/><h3 className="text-sm font-semibold text-[#172033]">Create a trackable campaign link</h3></div><p className="mt-1 max-w-2xl text-xs leading-5 text-[#64748b]">Use these links in social bios, posts and WhatsApp messages. UTM tags help identify the source even when an app hides its referrer.</p></div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block"><span className="mb-1.5 block text-xs font-medium text-[#334155]">Platform</span><select value={platform} onChange={(e) => { setPlatform(e.target.value); setCopyState(""); }} className="min-h-10 w-full rounded-xl border border-[#1e1b4b]/15 bg-white px-3 text-sm text-[#172033]"><option value="instagram">Instagram</option><option value="tiktok">TikTok</option><option value="youtube">YouTube</option><option value="facebook">Facebook</option><option value="whatsapp">WhatsApp</option></select></label>
              <label className="block"><span className="mb-1.5 block text-xs font-medium text-[#334155]">Campaign name</span><input value={campaign} onChange={(e) => { setCampaign(e.target.value); setCopyState(""); }} placeholder="e.g. winter-launch" className="min-h-10 w-full rounded-xl border border-[#1e1b4b]/15 bg-white px-3 text-sm text-[#172033]"/></label>
              <label className="block"><span className="mb-1.5 block text-xs font-medium text-[#334155]">Landing page</span><input value={destination} onChange={(e) => { setDestination(e.target.value); setCopyState(""); }} placeholder="/" className="min-h-10 w-full rounded-xl border border-[#1e1b4b]/15 bg-white px-3 text-sm text-[#172033]"/></label>
              <div className="flex items-end"><Button type="button" onClick={copyCampaignUrl} icon={Copy} className="w-full">Copy trackable link</Button></div>
            </div>
            <div className="mt-3 break-all rounded-xl border border-[#1e1b4b]/10 bg-[#f8f9ff] p-3 font-mono text-[11px] leading-5 text-[#514b75]">{campaignUrl}</div>
            {copyState && <p role="status" className="mt-2 text-xs text-[#166534]">{copyState}</p>}
          </Card>
          <p className="text-[10px] leading-5 text-[#64748b]">Visits are anonymous sessions within a page visit sequence, not verified unique people. Some social apps hide referrer information; use the trackable links above for the most reliable attribution. Traffic collection starts with this release, so historical visits are not reconstructed.</p>
        </>
      ) : null}
    </section>
  );
}
