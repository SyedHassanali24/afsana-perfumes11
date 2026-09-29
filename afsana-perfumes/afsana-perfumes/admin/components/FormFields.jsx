export function Field({ label, error, hint, children }) {
  return (
    <label className="block">
      <span className="block text-sm text-ink mb-1.5">{label}</span>
      {children}
      {error ? (
        <span className="block text-xs text-danger mt-1">{error}</span>
      ) : hint ? (
        <span className="block text-xs text-ink-muted mt-1">{hint}</span>
      ) : null}
    </label>
  );
}

const baseInputClasses =
  "w-full px-3 py-2 bg-bg border rounded-sm text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-gold transition-colors";

export function Input({ error, className = "", ...props }) {
  return (
    <input
      className={`${baseInputClasses} ${
        error ? "border-danger" : "border-border"
      } ${className}`}
      {...props}
    />
  );
}

export function Textarea({ error, className = "", ...props }) {
  return (
    <textarea
      className={`${baseInputClasses} resize-none ${
        error ? "border-danger" : "border-border"
      } ${className}`}
      {...props}
    />
  );
}

export function Select({ error, className = "", children, ...props }) {
  return (
    <select
      className={`${baseInputClasses} ${
        error ? "border-danger" : "border-border"
      } ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}
