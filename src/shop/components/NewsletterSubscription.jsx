import { useState } from 'react';
import { Mail, CheckCircle, ArrowRight, Loader2, Sparkles } from 'lucide-react';

export default function NewsletterSubscription() {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [subscribedEmail, setSubscribedEmail] = useState('');

  const validateEmail = (value) => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(value).trim().toLowerCase());

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    const trimmed = email.trim().toLowerCase();
    if (!validateEmail(trimmed)) {
      setStatus('error');
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!consent) {
      setStatus('error');
      setErrorMessage('Please confirm that AFSANA may email you about news and offers.');
      return;
    }

    setStatus('loading');
    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'afsana' },
        body: JSON.stringify({ email: trimmed, consent: true, website }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data?.error?.message || 'We could not save your subscription. Please try again.');
      setSubscribedEmail(trimmed);
      setStatus('success');
      setEmail('');
      setConsent(false);
      setWebsite('');
    } catch (error) {
      setStatus('error');
      setErrorMessage(error.message || 'Network error. Please try again.');
    }
  };

  const reset = () => {
    setStatus('idle');
    setErrorMessage('');
    setEmail('');
    setConsent(false);
  };

  return (
    <div className="w-full border-y border-[#263e0e]/10 bg-gradient-to-br from-[#263e0e]/5 via-[#faf8f4] to-[#b4bf41]/10 py-16 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto text-center space-y-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#263e0e]/10 border border-[#263e0e]/10 text-[#263e0e] text-[11px] uppercase tracking-widest">
          <Sparkles className="w-3.5 h-3.5" />
          <span>The Olfactory Circular · Privé</span>
        </div>
        <div className="space-y-2">
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl tracking-tight text-[#263e0e]">Join The Afsana Inner Circle</h2>
          <p className="text-xs sm:text-sm text-[#5f654f] max-w-xl mx-auto font-light leading-relaxed">
            Receive AFSANA collection news, fragrance stories and occasional private offers by email.
          </p>
        </div>

        {status === 'success' ? (
          <div role="status" className="mt-6 p-6 sm:p-8 rounded-2xl bg-[#faf8f4] border border-[#263e0e]/10 shadow-[0_18px_45px_rgba(24,35,8,.08)] max-w-lg mx-auto text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#3d6b3d]/10 border border-[#3d6b3d]/30 flex items-center justify-center text-[#748e40] mx-auto"><CheckCircle className="w-6 h-6"/></div>
            <div className="space-y-1.5">
              <h3 className="font-display text-xl text-[#182308] font-medium">You're on the list.</h3>
              <p className="text-xs sm:text-sm text-[#5f654f] leading-relaxed">The email address <strong className="text-[#263e0e] font-medium">{subscribedEmail}</strong> has been saved for AFSANA updates.</p>
            </div>
            <button type="button" onClick={reset} className="text-xs text-[#5f654f] hover:text-[#748e40] transition-colors underline underline-offset-4">Add another email address</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="max-w-md mx-auto mt-6">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 text-[#5f654f] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"/>
                <input
                  type="email" value={email}
                  onChange={(event) => { setEmail(event.target.value); if (status === 'error') { setStatus('idle'); setErrorMessage(''); } }}
                  placeholder="Enter your email address..." disabled={status === 'loading'}
                  className={`w-full pl-10 pr-4 py-3 bg-[#faf8f4] border rounded-sm text-xs sm:text-sm text-[#182308] placeholder:text-[#5f654f]/60 focus:outline-none transition-colors ${status === 'error' ? 'border-[#9b3f3f] focus:border-[#9b3f3f]' : 'border-[#263e0e]/10 focus:border-[#263e0e]'}`}
                  aria-label="Email address for newsletter" aria-invalid={status === 'error'} aria-describedby={status === 'error' ? 'newsletter-error' : undefined}
                  autoComplete="email" required
                />
              </div>
              <button type="submit" disabled={status === 'loading'} className="px-6 py-3 bg-[#263e0e] hover:bg-[#748e40] text-white font-semibold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-60 shadow-sm">
                {status === 'loading' ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/><span>Saving…</span></> : <><span>Subscribe</span><ArrowRight className="w-3.5 h-3.5"/></>}
              </button>
            </div>
            <label className="mt-4 flex items-start gap-2 text-left text-[11px] leading-5 text-[#5f654f]">
              <input type="checkbox" checked={consent} onChange={(event)=>setConsent(event.target.checked)} disabled={status==='loading'} className="mt-1 accent-[#263e0e]"/>
              <span>I agree to receive AFSANA news and offers by email.</span>
            </label>
            <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
              <label>Leave this field empty<input tabIndex={-1} autoComplete="off" value={website} onChange={(event)=>setWebsite(event.target.value)}/></label>
            </div>
            {status === 'error' && <p id="newsletter-error" role="alert" className="mt-2.5 text-xs text-[#9b3f3f] text-left font-medium">{errorMessage}</p>}
            <p className="mt-3 text-[11px] text-[#5f654f]/80">Your email is stored securely for AFSANA updates. No welcome discount is applied automatically.</p>
          </form>
        )}
      </div>
    </div>
  );
}
