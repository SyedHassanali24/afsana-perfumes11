import Dashboard from "./Dashboard";
import TrafficAnalytics from "./TrafficAnalytics";
import Card from "../components/Card";
import useApi from "../../src/hooks/useApi";
import { analyticsApi } from "../../src/services";

const number = (value) => Number(value || 0).toLocaleString("en-PK");

function TrafficSources() {
  const { data, loading, error, reload } = useApi(() => analyticsApi.sources({ days: 30 }), []);
  const traffic = data?.traffic || {};
  const sources = traffic.sources || [];
  const maxViews = Math.max(1, ...sources.map((item) => Number(item.views) || 0));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl text-[#24152b]">Audience acquisition</h2>
        <p className="mt-1 text-sm text-[#76677b]">Where visitors are finding AFSANA · last 30 days</p>
      </div>
      {error ? (
        <Card><div className="py-6 text-center space-y-3"><p className="text-sm text-rose-600">{error.message || "Traffic analytics could not be loaded."}</p><button type="button" onClick={reload} className="text-sm font-semibold text-[#743d78] underline">Try again</button></div></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Card><p className="text-xs text-[#76677b]">Page views</p><p className="mt-2 font-display text-3xl text-[#24152b]">{loading ? "—" : number(traffic.totalViews)}</p></Card>
            <Card><p className="text-xs text-[#76677b]">Visitor sessions</p><p className="mt-2 font-display text-3xl text-[#24152b]">{loading ? "—" : number(traffic.uniqueSessions)}</p></Card>
          </div>
          <Card>
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-[#24152b]">Traffic by source</h3>
              <span className="text-[10px] uppercase tracking-[.15em] text-[#76677b]">30 days</span>
            </div>
            {loading ? <p className="py-8 text-sm text-[#76677b]">Loading traffic sources…</p> : sources.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#76677b]">No visits have been recorded yet. New visits will appear here after this analytics fix is deployed.</p>
            ) : (
              <div className="mt-5 space-y-5">
                {sources.map((item) => (
                  <div key={item.source}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-[#24152b]">{item.source}</span>
                      <span className="shrink-0 text-xs tabular-nums text-[#76677b]">{number(item.views)} views · {number(item.uniqueSessions)} sessions</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#eadfec]">
                      <div className="h-full rounded-full bg-[#743d78]" style={{ width: ((Number(item.views) || 0) / maxViews * 100) + "%" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-5 border-t border-[#eadfec] pt-4 text-xs leading-5 text-[#76677b]">Sources are identified from campaign UTM tags and referring domains. For reliable WhatsApp and social-app attribution, share website links with utm_source tags; apps that hide referrers may otherwise appear as Direct.</p>
          </Card>
        </>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <div className="space-y-7">
      <div>
        <h1 className="font-display text-2xl text-[#24152b]">Analytics</h1>
        <p className="mt-1 text-sm text-[#76677b]">Audience acquisition and store performance.</p>
      </div>
      <TrafficSources />
      <TrafficAnalytics />
      <Dashboard />
    </div>
  );
}
