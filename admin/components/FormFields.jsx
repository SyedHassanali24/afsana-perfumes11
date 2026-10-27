export function Field({ label, error, hint, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-[#182308] mb-1.5">{label}</span>
      {children}
      {error ? <span className="block text-xs text-[#9b3f3f] mt-1.5">{error}</span> : hint ? <span className="block text-xs text-[#5f654f] mt-1.5">{hint}</span> : null}
    </label>
  );
}

const baseInputClasses =
  "w-full px-3.5 py-2.5 bg-[#faf8f4] border rounded-xl text-sm text-[#182308] placeholder:text-[#5f654f] focus:outline-none focus:ring-2 focus:ring-[#263e0e]/15 focus:border-[#263e0e] transition-all";

export function Input({ error, className = "", ...props }) {
  return <input className={baseInputClasses + " " + (error ? "border-[#9b3f3f]" : "border-[#263e0e]/15") + " " + className} {...props} />;
}

export function Textarea({ error, className = "", ...props }) {
  return <textarea className={baseInputClasses + " resize-none " + (error ? "border-[#9b3f3f]" : "border-[#263e0e]/15") + " " + className} {...props} />;
}

export function Select({ error, className = "", children, ...props }) {
  return <select className={baseInputClasses + " " + (error ? "border-[#9b3f3f]" : "border-[#263e0e]/15") + " " + className} {...props}>{children}</select>;
}

export function Check({ label, checked, onChange, disabled, title, className = "" }) {
  return (
    <label title={title} className={"inline-flex items-center gap-2 text-sm " + (disabled ? "text-[#5f654f]" : "text-[#182308]") + " " + className}>
      <input type="checkbox" checked={!!checked} disabled={disabled} onChange={(e) => onChange?.(e.target.checked)} className="accent-[#263e0e]" />
      {label}
    </label>
  );
}
