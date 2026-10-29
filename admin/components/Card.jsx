export default function Card({ children, className = "", padded = true }) {
  return (
    <section
      className={[
        "bg-white border border-[#e8eaf2] rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,.03),0_8px_24px_rgba(15,23,42,.045)] transition-shadow duration-200 hover:shadow-[0_12px_32px_rgba(15,23,42,.07)]",
        padded ? "p-5 sm:p-6" : "",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}
