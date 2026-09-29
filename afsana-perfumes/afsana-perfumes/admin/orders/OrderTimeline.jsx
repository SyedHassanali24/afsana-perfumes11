import { Check } from "lucide-react";

/**
 * @param {{event: string, at: string|null, done: boolean}[]} steps
 */
export default function OrderTimeline({ steps }) {
  return (
    <ol className="space-y-0">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        return (
          <li key={step.event} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  step.done ? "bg-success text-white" : "bg-bg border border-border"
                }`}
              >
                {step.done && <Check className="w-3 h-3" />}
              </span>
              {!isLast && (
                <span
                  className={`w-px flex-1 min-h-[20px] ${
                    step.done ? "bg-success" : "bg-border"
                  }`}
                />
              )}
            </div>
            <div className="pb-5">
              <p className={`text-sm ${step.done ? "text-ink" : "text-ink-muted"}`}>
                {step.event}
              </p>
              {step.at && <p className="text-xs text-ink-muted mt-0.5">{step.at}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
