// Centered luxury auth shell used by customer authentication pages.
export default function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#263e0e] via-[#344d18] to-[#182308] px-4 py-12 relative overflow-hidden">
      <div className="absolute -top-24 -left-20 h-64 w-64 rounded-full bg-[#b4bf41]/15 blur-3xl" />
      <div className="absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-[#748e40]/20 blur-3xl" />
      <div className="relative w-full max-w-md bg-[#faf8f4]/95 backdrop-blur border border-[#748e40]/25 rounded-3xl p-7 sm:p-9 space-y-6 shadow-2xl luxury-reveal">
        <div className="text-center">
          <div className="mx-auto mb-5 h-12 w-12 rounded-2xl bg-[#263e0e] text-[#b4bf41] flex items-center justify-center font-display text-xl">A</div>
          <h1 className="font-display text-3xl text-[#263e0e]">{title}</h1>
          {subtitle && <p className="text-sm text-[#5f654f] mt-2">{subtitle}</p>}
        </div>
        {children}
        {footer && <div className="text-sm text-[#5f654f] pt-4 border-t border-[#263e0e]/10 text-center">{footer}</div>}
      </div>
    </div>
  );
}
