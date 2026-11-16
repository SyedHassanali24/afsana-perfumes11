import Dashboard from "./Dashboard";
import TrafficAnalytics from "./TrafficAnalytics";

export default function AnalyticsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl text-ink">Analytics</h1>
        <p className="text-sm text-ink-muted mt-1">Audience sources, visits, revenue, stock and product sales.</p>
      </div>
      <TrafficAnalytics />
      <Dashboard />
    </div>
  );
}
