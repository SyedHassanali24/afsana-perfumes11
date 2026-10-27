// Centered luxury auth shell used by customer authentication pages.
export default function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#24152b] via-[#38203d] to-[#171018] px-4 py-12 relative overflow-hidden">
      <div className="absolute -top-24 -left-20 h-64 w-64 rounded-full bg-[#b4874b]/20 blur-3xl" />
      <div className="absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-[#8d5c91]/25 blur-3xl" />
      <div className="relative w-full max-w-md bg-surface/95 backdrop-blur border border-[#d8b477]/30 rounded-3xl p-7 sm:p-9 space-y-6 shadow-2xl luxury-reveal">
        <div className="text-center">
          <div className="mx-auto mb-5 h-12 w-12 rounded-2xl bg-[#24152b] text-[#f3d59e] flex items-center justify-center font-display text-xl">A</div>
          <h1 className="font-display text-3xl text-primary">{title}</h1>
          {subtitle && <p className="text-sm text-ink-muted mt-2">{subtitle}</p>}
        </div>
        {children}
        {footer && <div className="text-sm text-ink-muted pt-4 border-t border-border text-center">{footer}</div>}
      </div>
    </div>
  );
}
