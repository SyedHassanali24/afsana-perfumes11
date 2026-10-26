const VARIANTS = {
  primary: "bg-[var(--gold)] text-[var(--bg)] hover:opacity-90",
  secondary: "bg-transparent border border-border text-ink hover:bg-bg",
  ghost: "bg-transparent text-ink-muted hover:bg-bg",
  danger: "bg-danger text-white hover:opacity-90",
};

const SIZES = {
  sm: "text-sm px-3 py-1.5",
  md: "text-sm px-4 py-2",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  icon: Icon,
  className = "",
  ...props
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-sm font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}
