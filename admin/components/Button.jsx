const VARIANTS = {
  primary: "bg-[var(--primary)] text-white shadow-sm hover:bg-[var(--primary-hover)]",
  secondary: "bg-surface border border-border text-ink hover:bg-bg hover:border-[var(--primary-soft-border)]",
  ghost: "bg-transparent text-ink-muted hover:bg-bg hover:text-ink",
  danger: "bg-danger text-white hover:opacity-90",
};

const SIZES = {
  sm: "text-sm px-3.5 py-2",
  md: "text-sm px-4 py-2.5",
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
      className={"inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 disabled:opacity-40 disabled:pointer-events-none " + VARIANTS[variant] + " " + SIZES[size] + " " + className}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}
