export default function Card({ children, className = "", padded = true }) {
  return <section className={[\"bg-surface border border-border rounded-md shadow-card transition-shadow duration-200 hover:shadow-[var(--shadow-hover)]\",padded ? \"p-5\" : \"\",className].join(\" \")}>{children}</section>;
}
