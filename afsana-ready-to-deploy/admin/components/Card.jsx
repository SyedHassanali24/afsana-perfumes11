export default function Card({ children, className = "", padded = true }) {
  return (
    <div
      className={`bg-surface border border-border rounded-md shadow-card ${
        padded ? "p-5" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
