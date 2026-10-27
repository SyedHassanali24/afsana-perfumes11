export default function Card({ children, className = "", padded = true }) {
  return (
    <section
      className={[
        "bg-[#faf8f4] border border-[#263e0e]/10 rounded-2xl shadow-[var(--shadow-card)] transition-all duration-200 hover:shadow-[var(--shadow-hover)]",
        padded ? "p-5 sm:p-6" : "",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}
