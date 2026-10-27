import { X } from "lucide-react";

const SIZES = {
  md: "max-w-md",
  lg: "max-w-xl",
  xl: "max-w-5xl",
};

export default function Drawer({ open, onClose, title, children, footer, size = "md" }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-[#182308]/55" onClick={onClose} aria-hidden="true" />
      <div className={`relative w-full ${SIZES[size]} h-full bg-[#faf8f4] border-l border-[#263e0e]/10 flex flex-col shadow-2xl`}>
        <div className="flex items-center justify-between px-5 h-16 border-b border-[#263e0e]/10 shrink-0">
          <h2 className="font-display text-lg text-[#182308]">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl text-[#5f654f] hover:bg-[#f3f1e9] hover:text-[#182308] transition-colors" aria-label="Close">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-[#263e0e]/10 shrink-0 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
