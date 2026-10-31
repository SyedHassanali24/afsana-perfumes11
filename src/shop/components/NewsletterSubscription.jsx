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
    <section className="relative isolate overflow-hidden bg-[#100d24] px-4 py-20 text-white sm:px-6 sm:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-[430px] w-[430px] rounded-full bg-[#7357ff]/25 blur-[100px]" />
        <div className="absolute -bottom-48 right-[-4rem] h-[500px] w-[500px] rounded-full bg-[#d9ff55]/10 blur-[110px]" />
        <div className="absolute inset-0 opacity-[.09]" style={{backgroundImage:'linear-gradient(rgba(255,255,255,.22) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.22) 1px,transparent 1px)',backgroundSize:'54px 54px'}} />
      </div>
      <div className="container-xl relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1fr_.92fr] lg:gap-20">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d9ff55]/30 bg-[#d9ff55]/[.08] px-4 py-2 text-[9px] font-semibold uppercase tracking-[.28em] text-[#d9ff55]">
            <Sparkles className="h-3.5 w-3.5" />
            AFSANA PRIVÉ · THE INNER CIRCLE
          </div>
          <p className="mt-8 text-[10px] font-semibold uppercase tracking-[.38em] text-white/45">A little closer to the house</p>
          <h2 className="mt-5 font-display text-5xl leading-[.92] tracking-[-.035em] sm:text-7xl lg:text-[5.6rem]">
            Join the
            <br />
            Afsana <em className="text-[#d9ff55]">Inner Circle.</em>
          </h2>
          <p className="mt-7 max-w-xl text-sm leading-8 text-white/60 sm:text-base">
            Be first to discover new fragrances, private releases, scent stories and invitations from the House of AFSANA.
          </p>
          <div className="mt-9 flex flex-wrap gap-x-7 gap-y-3 text-[9px] uppercase tracking-[.18em] text-white/55">
            <span className="inline-flex items-center gap-2"><Gift className="h-4 w-4 text-[#d9ff55]"/> Private launches</span>
            <span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#d9ff55]"/> Curated scent notes</span>
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#d9ff55]"/> No unwanted noise</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-3 rounded-[2rem] border border-[#7357ff]/35 rotate-2" />
          <div className="relative overflow-hidden rounded-[1.65rem] border border-white/10 bg-[#19152f]/90 p-6 shadow-[0_35px_100px_rgba(0,0,0,.4)] backdrop-blur-xl sm:p-9">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[.3em] text-[#d9ff55]">The private list</p>
                <h3 className="mt-3 font-display text-3xl sm:text-4xl">A note from AFSANA.</h3>
                <p className="mt-3 max-w-sm text-xs leading-6 text-white/50">Occasional letters for people who believe a fragrance should mean something.</p>
              </div>
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#d9ff55]/25 bg-[#d9ff55]/10 text-[#d9ff55]">
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
                <label htmlFor="afsana-inner-circle-email" className="mb-2 block text-[9px] font-semibold uppercase tracking-[.2em] text-white/55">Your email address</label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative min-w-0 flex-1">
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
                      className={`w-full rounded-xl border bg-white/[.06] py-4 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#d9ff55]/70 focus:bg-white/[.09] ${status === 'error' ? 'border-red-400' : 'border-white/15'}`}
                      aria-invalid={status === 'error'}
                      aria-describedby={status === 'error' ? 'afsana-newsletter-error' : 'afsana-newsletter-privacy'}
                    />
                  </div>
                  <button type="submit" disabled={status === 'loading'} className="inline-flex min-h-[52px] items-center justify-center gap-3 rounded-xl bg-[#d9ff55] px-6 text-[10px] font-bold uppercase tracking-[.16em] text-[#100d24] transition hover:bg-white disabled:cursor-wait disabled:opacity-60">
                    {status === 'loading' ? <><Loader2 className="h-4 w-4 animate-spin"/> Joining</> : <>Join the circle <ArrowRight className="h-4 w-4"/></>}
                  </button>
                </div>
                {status === 'error' && <p id="afsana-newsletter-error" role="alert" className="mt-3 text-xs text-red-300">{errorMessage}</p>}
                <p id="afsana-newsletter-privacy" className="mt-4 text-[10px] leading-5 text-white/35">By joining, you agree to receive occasional AFSANA updates. You can unsubscribe at any time.</p>
              </form>
            )}
            <div className="mt-8 border-t border-white/10 pt-5">
              <div className="flex items-center justify-between text-[8px] uppercase tracking-[.2em] text-white/30">
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
