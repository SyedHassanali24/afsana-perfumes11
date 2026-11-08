import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import Card from "./Card";

export default function StatCard({ label, value, changePct, changeLabel }) {
  const hasChange = typeof changePct === "number";
  const isUp = hasChange && changePct > 0;
  const isFlat = hasChange && changePct === 0;

  return (
    <Card className="group min-h-[132px] border border-[#eadfec] bg-white hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#76677b]">{label}</p>
        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#743d78]/20 ring-4 ring-[#743d78]/10" />
      </div>
      <p className="mt-3 text-[27px] leading-none font-semibold tracking-[-0.03em] text-[#24152b]">{value}</p>
      {hasChange && (
        <div className="mt-4 flex items-center gap-1.5 text-xs">
          <span className={"inline-flex items-center gap-0.5 font-semibold " + (isFlat ? "text-[#76677b]" : isUp ? "text-emerald-700" : "text-rose-600")}>
            {isFlat ? <Minus className="h-3.5 w-3.5" /> : isUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {Math.abs(changePct)}%
          </span>
          {changeLabel && <span className="text-[#76677b]">{changeLabel}</span>}
        </div>
      )}
    </Card>
  );
}
