import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import Card from "./Card";

export default function StatCard({ label, value, changePct, changeLabel }) {
  const hasChange = typeof changePct === "number";
  const isUp = hasChange && changePct > 0;
  const isFlat = hasChange && changePct === 0;

  return (
    <Card className="group min-h-[132px] hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5f654f]">{label}</p>
        <span className="h-2.5 w-2.5 rounded-full bg-[[#263e0e]]/15 ring-4 ring-[[#263e0e]]/5 mt-1 shrink-0" />
      </div>
      <p className="mt-3 text-[27px] leading-none font-semibold tracking-[-0.03em] text-[#182308]">{value}</p>
      {hasChange && (
        <div className="mt-4 flex items-center gap-1.5 text-xs">
          <span className={"inline-flex items-center gap-0.5 font-semibold " + (isFlat ? "text-[#5f654f]" : isUp ? "text-[#3d6b3d]" : "text-[#9b3f3f]")}>
            {isFlat ? <Minus className="w-3.5 h-3.5" /> : isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {Math.abs(changePct)}%
          </span>
          {changeLabel && <span className="text-[#5f654f]">{changeLabel}</span>}
        </div>
      )}
    </Card>
  );
}
