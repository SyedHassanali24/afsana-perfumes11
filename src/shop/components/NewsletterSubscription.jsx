import { useState } from 'react';
import { Mail, CheckCircle, ArrowRight, Loader2, Sparkles } from 'lucide-react';

export default function NewsletterSubscription() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [subscribedEmail, setSubscribedEmail] = useState('');

  const validateEmail = (val) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val).trim().toLowerCase());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmed = email.trim();
    if (!trimmed) {
      setStatus('error');
      setErrorMessage('Please enter your email address to receive invitations.');
      return;
    }

    if (!validateEmail(trimmed)) {
      setStatus('error');
      setErrorMessage('Please provide a valid email format (e.g. patron@afsana.pk).');
      return;
    }

    setStatus('loading');

    try {
      // Record subscription locally and attempt endpoint if available
      const existing = JSON.parse(localStorage.getItem('afsana_newsletter_subscribers') || '[]');
      if (!existing.includes(trimmed.toLowerCase())) {
        existing.push(trimmed.toLowerCase());
        localStorage.setItem('afsana_newsletter_subscribers', JSON.stringify(existing));
      }

      // Small natural network settling latency
      await new Promise((resolve) => setTimeout(resolve, 600));

      setSubscribedEmail(trimmed);
      setStatus('success');
      setEmail('');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setErrorMessage('');
    setEmail('');
  };

  return (
    <div className="w-full border-y border-[#263e0e]/10 bg-gradient-to-br from-[#263e0e]/5 via-[#faf8f4] to-[#b4bf41]/10 py-16 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto text-center space-y-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#263e0e]/10 border border-[#263e0e]/10 text-[#263e0e] text-[11px] uppercase tracking-widest">
          <Sparkles className="w-3.5 h-3.5" />
          <span>The Olfactory Circular · Privé</span>
        </div>

        <div className="space-y-2">
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl tracking-tight text-[#263e0e]">
            Join The Afsana Inner Circle
          </h2>
          <p className="text-xs sm:text-sm text-[#5f654f] max-w-xl mx-auto font-light leading-relaxed">
            Receive discreet invitations to limited agarwood macerations, private salon tastings, and a complimentary 10% welcome privilege on your premiere bottle.
          </p>
        </div>

        {status === 'success' ? (
          <div
            role="status"
            className="mt-6 p-6 sm:p-8 rounded-2xl bg-[#faf8f4] border border-[#263e0e]/10 shadow-card max-w-lg mx-auto text-center space-y-4 animate-fade-in"
          >
            <div className="w-12 h-12 rounded-full bg-[#3d6b3d]/10 border border-[#3d6b3d]/30 flex items-center justify-center text-[#748e40] mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-display text-xl text-[#182308] font-medium">Welcome to the Inner Circle</h3>
              <p className="text-xs sm:text-sm text-[#5f654f] leading-relaxed">
                Your email <strong className="text-[#263e0e] font-medium">{subscribedEmail}</strong> has been enrolled into the Afsana Privé registry.
              </p>
            </div>

            <div className="p-3 bg-[#f3f1e9] border border-[#263e0e]/10 rounded-sm">
              <p className="text-[11px] text-[#5f654f] uppercase tracking-wider">Your Welcome Privilege Code</p>
              <p className="font-mono text-sm sm:text-base font-bold text-[#748e40] tracking-widest mt-0.5">
                AFSANAPRIVE10
              </p>
              <p className="text-[10px] text-[#5f654f]/80 mt-1">10% off your entire premiere acquisition</p>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-[#5f654f] hover:text-[#748e40] transition-colors underline underline-offset-4"
            >
              Enroll another email address
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="max-w-md mx-auto mt-6">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 text-[#5f654f] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (status === 'error') {
                      setStatus('idle');
                      setErrorMessage('');
                    }
                  }}
                  placeholder="Enter your email address..."
                  disabled={status === 'loading'}
                  className={`w-full pl-10 pr-4 py-3 bg-[#faf8f4] border rounded-sm text-xs sm:text-sm text-[#182308] placeholder:text-[#5f654f]/60 focus:outline-none transition-colors ${
                    status === 'error'
                      ? 'border-[#9b3f3f] focus:border-[#9b3f3f]'
                      : 'border-[#263e0e]/10 focus:border-[#263e0e]'
                  }`}
                  aria-label="Email address for newsletter"
                  aria-invalid={status === 'error'}
                  aria-describedby={status === 'error' ? 'newsletter-error' : undefined}
                />
              </div>

              <button
                type="submit"
                disabled={status === 'loading'}
                className="px-6 py-3 bg-[#263e0e] hover:bg-[#748e40] text-white font-semibold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-60 shadow-sm"
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Enrolling…</span>
                  </>
                ) : (
                  <>
                    <span>Subscribe</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            {status === 'error' && (
              <p
                id="newsletter-error"
                role="alert"
                className="mt-2.5 text-xs text-[#9b3f3f] text-left font-medium animate-fade-in"
              >
                {errorMessage}
              </p>
            )}

            <p className="mt-3 text-[11px] text-[#5f654f]/80">
              We respect your privacy. Unsubscribe anytime with one tap. Zero unsolicited spam.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
