const VARIANTS = {
  primary: "bg-[#263e0e] text-white shadow-sm hover:bg-[ #748e40]",
  secondary: "bg-[#faf8f4] border border-[#263e0e]/10 text-[#182308] hover:bg-[#f3f1e9] hover:border-[ #b4bf4166]",
  ghost: "bg-transparent text-[#182308]-muted hover:bg-[#f3f1e9] hover:text-[#182308]",
  danger: "bg-[#9b3f3f] text-white hover:opacity-90",
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
      className={"inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[[#263e0e]/30 disabled:opacity-40 disabled:pointer-events-none " + VARIANTS[variant] + " " + SIZES[size] + " " + className}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}
