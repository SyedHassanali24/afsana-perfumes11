import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import Card from "./Card";

/**
 * @param {string} label - e.g. "Today's revenue"
 * @param {string} value - pre-formatted display value, e.g. "PKR 84,200"
 * @param {number} [changePct] - e.g. 12.4 or -3.1. Omit to hide the trend row.
 * @param {string} [changeLabel] - e.g. "vs yesterday"
 */
export default function StatCard({ label, value, changePct, changeLabel }) {
  const hasChange = typeof changePct === "number";
  const isUp = hasChange && changePct >= 0;

  return (
    <Card>
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-2 font-display text-3xl text-ink">{value}</p>
      {hasChange && (
        <div className="mt-3 flex items-center gap-1 text-sm">
          <span
            className={`inline-flex items-center gap-0.5 ${
              isUp ? "text-success" : "text-danger"
            }`}
          >
            {isUp ? (
              <ArrowUpRight className="w-3.5 h-3.5" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5" />
            )}
            {Math.abs(changePct)}%
          </span>
          {changeLabel && (
            <span className="text-ink-muted">{changeLabel}</span>
          )}
        </div>
      )}
    </Card>
  );
}
