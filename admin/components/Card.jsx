export default function Card({ children, className = "", padded = true }) {
  return (
    <section
      className={[
        "bg-surface border border-border rounded-2xl shadow-card transition-all duration-200 hover:shadow-[var(--shadow-hover)]",
        padded ? "p-5 sm:p-6" : "",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}
