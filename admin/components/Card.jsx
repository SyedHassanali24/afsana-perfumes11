export default function Card({ children, className = "", padded = true }) {
  return (
    <section
      className={[
        "admin-card rounded-2xl transition-all duration-200",
        padded ? "p-5 sm:p-6" : "",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}
