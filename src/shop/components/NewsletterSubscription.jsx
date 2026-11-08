import { useState } from 'react';
import { Mail, CheckCircle, ArrowRight, Loader2, Sparkles, Gift, ShieldCheck } from 'lucide-react';

export default function NewsletterSubscription() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [subscribedEmail, setSubscribedEmail] = useState('');

  const validateEmail = (value) => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(value).trim().toLowerCase());

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    const trimmed = email.trim();
    if (!trimmed) {
      setStatus('error');
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!validateEmail(trimmed)) {
      setStatus('error');
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    setStatus('loading');
    try {
      const existing = JSON.parse(localStorage.getItem('afsana_newsletter_subscribers') || '[]');
      if (!existing.includes(trimmed.toLowerCase())) {
        existing.push(trimmed.toLowerCase());
        localStorage.setItem('afsana_newsletter_subscribers', JSON.stringify(existing));
      }
      await new Promise((resolve) => setTimeout(resolve, 350));
      setSubscribedEmail(trimmed);
      setStatus('success');
      setEmail('');
    } catch (error) {
      setStatus('error');
      setErrorMessage(error.message || 'Something went wrong. Please try again.');
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setErrorMessage('');
    setEmail('');
  };

  return (
    <section className="afsana-newsletter-card relative isolate overflow-hidden px-4 py-16 text-white sm:px-6 sm:py-20">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-[430px] w-[430px] rounded-full bg-[#7357ff]/25 blur-[100px]" />
        <div className="absolute -bottom-48 right-[-4rem] h-[500px] w-[500px] rounded-full bg-[#d9ff55]/10 blur-[110px]" />
        <div className="absolute inset-0 opacity-[.09]" style={{backgroundImage:'linear-gradient(rgba(255,255,255,.22) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.22) 1px,transparent 1px)',backgroundSize:'54px 54px'}} />
      </div>
      <div className="afsana-newsletter-layout container-xl relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[.9fr_1.1fr] lg:gap-16">
        <div className="afsana-newsletter-intro max-w-2xl">
          <div className="afsana-newsletter-badge inline-flex items-center gap-2 rounded-full px-4 py-2 text-[9px] font-semibold uppercase tracking-[.2em]">
            <Sparkles className="h-3.5 w-3.5" />
            AFSANA PRIVÉ · THE INNER CIRCLE
          </div>
          <p className="afsana-newsletter-overline mt-8 text-[10px] font-semibold uppercase tracking-[.28em]">A little closer to the house</p>
          <h2 className="afsana-newsletter-main-title mt-5 font-display text-5xl leading-[.98] tracking-[-.045em] sm:text-6xl lg:text-7xl">
            Join the
            <br />
            Afsana <em className="text-[#d9ff55]">Inner Circle.</em>
          </h2>
          <p className="afsana-newsletter-main-copy mt-6 max-w-xl text-sm leading-7 sm:text-base">
            Be first to discover new fragrances, private releases, scent stories and invitations from the House of AFSANA.
          </p>
          <div className="afsana-newsletter-benefits mt-8 flex flex-wrap gap-x-6 gap-y-3 text-[9px] uppercase tracking-[.12em]">
            <span className="inline-flex items-center gap-2"><Gift className="h-4 w-4 text-[#d9ff55]"/> Private launches</span>
            <span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#d9ff55]"/> Curated scent notes</span>
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#d9ff55]"/> No unwanted noise</span>
          </div>
        </div>

        <div className="afsana-newsletter-letter-wrap relative">
          <div className="afsana-newsletter-letter-outline absolute -inset-3 rounded-[2rem] rotate-2" />
          <div className="afsana-newsletter-letter relative overflow-hidden rounded-[1.4rem] p-6 sm:p-9">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <p className="afsana-newsletter-letter-kicker text-[9px] font-semibold uppercase tracking-[.2em]">The private list</p>
                <h3 className="afsana-newsletter-letter-title mt-3 text-3xl sm:text-4xl">A note from AFSANA.</h3>
                <p className="afsana-newsletter-letter-copy mt-3 max-w-sm text-sm leading-6">Occasional letters for people who believe a fragrance should mean something.</p>
              </div>
              <div className="afsana-newsletter-letter-icon grid h-12 w-12 shrink-0 place-items-center rounded-2xl">
                <Mail className="h-5 w-5"/>
              </div>
            </div>

            {status === 'success' ? (
              <div role="status" className="rounded-2xl border border-[#d9ff55]/25 bg-[#d9ff55]/[.07] p-6 text-center animate-fade-in">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#d9ff55] text-[#100d24]">
                  <CheckCircle className="h-7 w-7"/>
                </div>
                <h4 className="mt-5 font-display text-2xl">You’re on the list.</h4>
                <p className="mt-2 break-all text-xs leading-6 text-white/55">{subscribedEmail}</p>
                <button type="button" onClick={handleReset} className="mt-5 text-[9px] font-semibold uppercase tracking-[.2em] text-[#d9ff55] underline underline-offset-4">Add another email</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <label htmlFor="afsana-inner-circle-email" className="afsana-newsletter-field-label mb-2 block text-[10px] font-semibold uppercase tracking-[.12em]">Your email address</label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="afsana-newsletter-input-wrap relative min-w-0 flex-1">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"/>
                    <input
                      id="afsana-inner-circle-email"
                      type="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        if (status === 'error') { setStatus('idle'); setErrorMessage(''); }
                      }}
                      placeholder="you@example.com"
                      disabled={status === 'loading'}
                      autoComplete="email"
                      className={`afsana-newsletter-input w-full rounded-xl border py-4 pl-11 pr-4 text-sm outline-none transition ${status === 'error' ? 'border-red-400' : ''}`}
                      aria-invalid={status === 'error'}
                      aria-describedby={status === 'error' ? 'afsana-newsletter-error' : 'afsana-newsletter-privacy'}
                    />
                  </div>
                  <button type="submit" disabled={status === 'loading'} className="afsana-newsletter-submit inline-flex min-h-[52px] items-center justify-center gap-3 rounded-xl px-6 text-[11px] font-bold uppercase tracking-[.1em] transition disabled:cursor-wait disabled:opacity-60">
                    {status === 'loading' ? <><Loader2 className="h-4 w-4 animate-spin"/> Joining</> : <>Join the circle <ArrowRight className="h-4 w-4"/></>}
                  </button>
                </div>
                {status === 'error' && <p id="afsana-newsletter-error" role="alert" className="mt-3 text-xs text-red-300">{errorMessage}</p>}
                <p id="afsana-newsletter-privacy" className="afsana-newsletter-privacy mt-4 text-[11px] leading-6">By joining, you agree to receive occasional AFSANA updates. You can unsubscribe at any time.</p>
              </form>
            )}
            <div className="afsana-newsletter-signoff mt-8 border-t pt-5">
              <div className="flex items-center justify-between gap-3 text-[9px] uppercase tracking-[.14em]">
                <span>AFSANA · THE ART OF SCENT</span>
                <span>EST. WITH INTENTION</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
