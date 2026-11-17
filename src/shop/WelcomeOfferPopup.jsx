import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, Gift, ArrowRight, Loader2, CheckCircle, Copy } from 'lucide-react';
import { accountApi } from '../services';
import { useCart } from './CartContext';

const CLAIMED_KEY = 'afsana_welcome_offer_claimed_v1';
const DISMISSED_KEY = 'afsana_welcome_offer_dismissed_v1';

export default function WelcomeOfferPopup() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: '', phone: '', marketingConsent: false });
  const [coupon, setCoupon] = useState('');
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const { setCoupon: applyCoupon } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (['/login', '/register', '/forgot-password', '/reset-password', '/checkout'].includes(location.pathname)) return undefined;
    try {
      if (localStorage.getItem(CLAIMED_KEY) === '1' || localStorage.getItem(DISMISSED_KEY) === '1') return undefined;
    } catch {}
    const timer = window.setTimeout(() => setOpen(true), 1100);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  const dismiss = () => {
    setOpen(false);
    try { localStorage.setItem(DISMISSED_KEY, '1'); } catch {}
  };

  const submit = async (event) => {
    event.preventDefault();
    setProblem('');
    if (!form.marketingConsent) {
      setProblem('Please agree to receive AFSANA offers to claim your welcome code.');
      return;
    }
    setBusy(true);
    try {
      const result = await accountApi.captureOfferLead({
        email: form.email.trim(),
        phone: form.phone.trim(),
        marketingConsent: true,
        source: `welcome-popup:${location.pathname || '/'}`,
      });
      const code = String(result.couponCode || '').trim().toUpperCase();
      if (!code) throw new Error('Your welcome code could not be created. Please try again.');
      setCoupon(code);
      applyCoupon(code);
      try { localStorage.setItem(CLAIMED_KEY, '1'); } catch {}
    } catch (error) {
      setProblem(error.details?.[0]?.message || error.message || 'Could not claim the offer. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(coupon);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const shopNow = () => {
    setOpen(false);
    navigate('/shop');
  };

  if (!open) return null;

  return (
    <div className="afsana-welcome-offer-backdrop fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto p-3 sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) dismiss(); }}>
      <section className="afsana-welcome-offer-panel relative my-auto w-full max-w-[520px] overflow-hidden rounded-[24px] bg-white text-[#20251d] shadow-[0_30px_100px_rgba(0,0,0,.4)]" role="dialog" aria-modal="true" aria-labelledby="afsana-welcome-title">
        <button type="button" onClick={dismiss} aria-label="Close welcome offer" className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-black/10 text-white transition hover:bg-black/20">
          <X className="h-5 w-5"/>
        </button>
        <div className="afsana-welcome-offer-hero relative overflow-hidden bg-[#194629] px-6 pb-7 pt-9 text-white sm:px-9 sm:pt-11">
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border border-[#ffbd37]/25 shadow-[0_0_0_22px_rgba(255,189,55,.05),0_0_0_48px_rgba(255,189,55,.035)]"/>
          <p className="relative text-[9px] font-bold uppercase tracking-[.32em] text-[#ffcf73]">AFSANA · A FIRST GESTURE</p>
          <div className="relative mt-5 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#ffbd37] text-[#194629]"><Gift className="h-5 w-5"/></span>
            <span className="text-[10px] font-semibold uppercase tracking-[.2em] text-white/75">A welcome gift for you</span>
          </div>
          <h2 id="afsana-welcome-title" className="relative mt-5 font-display text-5xl font-medium leading-[.92] tracking-[-.04em] sm:text-6xl">Enjoy <span className="text-[#ffbd37]">10% off.</span></h2>
          <p className="relative mt-4 max-w-sm text-sm leading-6 text-white/75">A little something for discovering your next signature fragrance.</p>
        </div>

        <div className="px-6 py-6 sm:px-9 sm:py-8">
          {!coupon ? (
            <>
              <p className="mb-5 text-xs leading-5 text-[#6e7569]">Enter your email and mobile number to receive a personal 10% welcome code. It can be used once on any AFSANA perfume and expires in 7 days.</p>
              <form onSubmit={submit} className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.12em] text-[#52604e]">Email address</span>
                  <input type="email" required autoComplete="email" maxLength={200} value={form.email} onChange={(e) => setForm((x) => ({ ...x, email: e.target.value }))} placeholder="you@example.com" className="w-full rounded-xl border border-[#dfe5db] bg-[#fafbf8] px-4 py-3.5 text-sm outline-none transition focus:border-[#194629] focus:ring-2 focus:ring-[#194629]/10"/>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.12em] text-[#52604e]">WhatsApp / mobile number</span>
                  <input type="tel" required autoComplete="tel" maxLength={18} value={form.phone} onChange={(e) => setForm((x) => ({ ...x, phone: e.target.value }))} placeholder="03XX XXXXXXX" className="w-full rounded-xl border border-[#dfe5db] bg-[#fafbf8] px-4 py-3.5 text-sm outline-none transition focus:border-[#194629] focus:ring-2 focus:ring-[#194629]/10"/>
                </label>
                <label className="flex items-start gap-3 rounded-xl bg-[#f5f7f2] p-3.5">
                  <input type="checkbox" checked={form.marketingConsent} onChange={(e) => setForm((x) => ({ ...x, marketingConsent: e.target.checked }))} className="mt-0.5 h-4 w-4 accent-[#194629]"/>
                  <span className="text-[11px] leading-5 text-[#596353]">I agree to receive occasional AFSANA offers and fragrance updates by email or WhatsApp. I can opt out at any time.</span>
                </label>
                {problem && <p role="alert" className="rounded-lg bg-[#fff1ef] px-3 py-2 text-xs text-[#a03d33]">{problem}</p>}
                <button type="submit" disabled={busy} className="inline-flex min-h-[50px] w-full items-center justify-center gap-3 rounded-xl bg-[#194629] px-5 text-[10px] font-bold uppercase tracking-[.16em] text-white transition hover:bg-[#123a22] disabled:cursor-wait disabled:opacity-60">
                  {busy ? <><Loader2 className="h-4 w-4 animate-spin"/> Claiming your gift</> : <>Unlock my 10% code <ArrowRight className="h-4 w-4"/></>}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#eaf3e8] text-[#194629]"><CheckCircle className="h-6 w-6"/></span>
              <h3 className="mt-4 font-display text-3xl text-[#20251d]">Your welcome gift is ready.</h3>
              <p className="mt-2 text-xs leading-5 text-[#6e7569]">Your code has been saved to your basket and is valid for 7 days. It can be redeemed once on any perfume.</p>
              <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-dashed border-[#a7b7a0] bg-[#f5f8f2] px-4 py-4">
                <strong className="font-mono text-lg tracking-[.08em] text-[#194629]">{coupon}</strong>
                <button type="button" onClick={copyCode} className="inline-flex items-center gap-2 rounded-lg border border-[#d7e0d2] bg-white px-3 py-2 text-[10px] font-bold uppercase text-[#194629]"><Copy className="h-3.5 w-3.5"/>{copied ? 'Copied' : 'Copy'}</button>
              </div>
              <button type="button" onClick={shopNow} className="mt-5 inline-flex min-h-[50px] w-full items-center justify-center gap-3 rounded-xl bg-[#194629] px-5 text-[10px] font-bold uppercase tracking-[.16em] text-white transition hover:bg-[#123a22]">Explore fragrances <ArrowRight className="h-4 w-4"/></button>
            </div>
          )}
          <p className="mt-4 text-center text-[9px] leading-4 text-[#90978d]">Offer terms: one use per code, valid for 7 days, on AFSANA perfumes only.</p>
        </div>
      </section>
    </div>
  );
}
