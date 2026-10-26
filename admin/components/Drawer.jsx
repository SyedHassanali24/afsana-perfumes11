import { X } from "lucide-react";

const SIZES = {
  md: "max-w-md",
  lg: "max-w-xl",
  xl: "max-w-5xl",
};

/**
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {string} title
 * @param {React.ReactNode} footer - typically Cancel + Save buttons
 * @param {"md"|"lg"|"xl"} [size] - md (default) for forms, lg for detail views
 */
export default function Drawer({ open, onClose, title, children, footer, size = "md" }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className={`relative w-full ${SIZES[size]} h-full bg-surface border-l border-border flex flex-col shadow-card`}>
        <div className="flex items-center justify-between px-5 h-16 border-b border-border shrink-0">
          <h2 className="font-display text-lg text-ink">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-sm text-ink-muted hover:bg-bg transition-colors"
            aria-label="Close"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && (
          <div className="px-5 py-4 border-t border-border shrink-0 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
