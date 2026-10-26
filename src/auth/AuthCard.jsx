// Centered card used by every sign-in style page (staff and customer).
export default function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-sm bg-surface border border-border rounded-md p-8 space-y-5">
        <div>
          <h1 className="font-display text-2xl" style={{ color: "var(--gold)" }}>{title}</h1>
          {subtitle && <p className="text-sm text-ink-muted mt-1">{subtitle}</p>}
        </div>
        {children}
        {footer && <div className="text-sm text-ink-muted pt-1 border-t border-border">{footer}</div>}
      </div>
    </div>
  );
}
