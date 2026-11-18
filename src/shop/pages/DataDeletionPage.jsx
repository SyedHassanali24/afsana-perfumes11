import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, ShieldCheck, Trash2 } from 'lucide-react';
import { Container } from '../ui';
import useTitle from '../useTitle';

export default function DataDeletionPage() {
  useTitle('User Data Deletion');

  return (
    <div className="min-h-screen bg-[#f7f4ed] text-[#100d24]">
      <section className="relative isolate overflow-hidden bg-[#100d24] text-white">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_78%_25%,rgba(115,87,255,.32),transparent_28%),radial-gradient(circle_at_12%_85%,rgba(217,255,85,.10),transparent_30%)]" />
        <Container className="py-16 sm:py-24 lg:py-28">
          <Link to="/" className="inline-flex items-center gap-2 text-[9px] uppercase tracking-[.22em] text-white/55 transition hover:text-[#d9ff55]">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to AFSANA
          </Link>
          <p className="mt-14 text-[9px] font-semibold uppercase tracking-[.38em] text-[#d9ff55]">AFSANA PERFUMES · THE ART OF SCENT</p>
          <h1 className="mt-5 max-w-4xl font-display text-5xl leading-[.98] tracking-tight sm:text-7xl lg:text-8xl">
            Your data.<br /><em className="text-[#d9ff55]">Your choice.</em>
          </h1>
          <div className="mt-8 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[.18em] text-white/45">
            <span>User data deletion</span><span aria-hidden="true">·</span><span>Effective 18 November 2026</span>
          </div>
        </Container>
      </section>

      <Container className="py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="border border-[#7357ff]/15 bg-white/60 p-6 sm:p-8">
            <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[.25em] text-[#7357ff]">
              <ShieldCheck className="h-4 w-4" /> Data deletion instructions
            </div>
            <p className="mt-4 font-display text-2xl leading-snug text-[#100d24] sm:text-3xl">
              You can ask AFSANA to delete your customer account and personal information associated with it.
            </p>
          </div>

          <section className="border-b border-[#100d24]/10 pb-8 sm:pb-10">
            <div className="flex items-start gap-4">
              <span className="mt-1 font-mono text-[10px] tracking-[.2em] text-[#7357ff]">01</span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-2xl leading-tight text-[#100d24] sm:text-3xl">How to request deletion</h2>
                <div className="mt-4 space-y-4 text-sm leading-7 text-[#514b62]">
                  <p>Send an email to our support team from the email address associated with your AFSANA customer account. Use the subject line <strong className="text-[#100d24]">AFSANA Account and Data Deletion Request</strong>.</p>
                  <p>In your message, provide the email address registered with AFSANA and state that you want your customer account and associated personal data deleted. You may include your name or phone number to help us identify the account.</p>
                  <p>For your security, do not send your password, Facebook password, one-time verification codes, full payment-card details or banking credentials.</p>
                </div>
                <a href="mailto:eastwala12@gmail.com?subject=AFSANA%20Account%20and%20Data%20Deletion%20Request" className="mt-6 inline-flex items-center gap-2 border border-[#7357ff]/30 bg-white px-5 py-3 text-[10px] font-semibold uppercase tracking-[.18em] text-[#100d24] transition hover:border-[#7357ff] hover:text-[#7357ff]">
                  <Mail className="h-4 w-4" /> Email AFSANA support
                </a>
              </div>
            </div>
          </section>

          <section className="border-b border-[#100d24]/10 pb-8 sm:pb-10">
            <div className="flex items-start gap-4">
              <span className="mt-1 font-mono text-[10px] tracking-[.2em] text-[#7357ff]">02</span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-2xl leading-tight text-[#100d24] sm:text-3xl">What happens next</h2>
                <div className="mt-4 space-y-4 text-sm leading-7 text-[#514b62]">
                  <p>We will review the request and may contact you to verify that you control the account before deleting it. Once verified, we will delete or de-identify personal information that we are not required or otherwise permitted to retain.</p>
                  <p>Deleting your account may remove access to saved profile details, addresses, wishlist items and account sign-in. You may need to create a new account to use those features again.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="border-b border-[#100d24]/10 pb-8 sm:pb-10">
            <div className="flex items-start gap-4">
              <span className="mt-1 font-mono text-[10px] tracking-[.2em] text-[#7357ff]">03</span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-2xl leading-tight text-[#100d24] sm:text-3xl">Information that may be retained</h2>
                <div className="mt-4 space-y-4 text-sm leading-7 text-[#514b62]">
                  <p>Some records, such as order, payment, delivery, tax, fraud-prevention, security or dispute records, may need to be retained for legal, accounting, safety or legitimate business reasons. Where appropriate, we will restrict their use and keep them only for the relevant purpose and period.</p>
                  <p>Submitting a deletion request does not cancel an order that is already being processed. Please contact support separately about any open order, return or refund.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="border-b border-[#100d24]/10 pb-8 sm:pb-10">
            <div className="flex items-start gap-4">
              <span className="mt-1 font-mono text-[10px] tracking-[.2em] text-[#7357ff]">04</span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-2xl leading-tight text-[#100d24] sm:text-3xl">Facebook Login data</h2>
                <div className="mt-4 space-y-4 text-sm leading-7 text-[#514b62]">
                  <p>If you used Facebook Login, include the email address associated with your AFSANA account and mention that you signed in with Facebook. We may use the information permitted by your Facebook authorisation, such as your basic profile and email details, to create or operate your AFSANA customer account.</p>
                  <p>You can also remove AFSANA from the Apps and Websites section of your Facebook settings to stop future access. Removing the connection from Facebook does not by itself submit a request to delete information already held by AFSANA; use the email process above for that request.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="border border-[#7357ff]/20 bg-[#100d24] p-6 text-white sm:p-8">
            <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[.28em] text-[#d9ff55]">
              <Trash2 className="h-4 w-4" /> Need help?
            </div>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl">Your request matters.</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-white/65">For a deletion request or a question about how your information is handled, contact the AFSANA support team.</p>
            <a href="mailto:eastwala12@gmail.com?subject=AFSANA%20Account%20and%20Data%20Deletion%20Request" className="mt-6 inline-flex items-center gap-2 border border-[#d9ff55]/50 px-5 py-3 text-[10px] font-semibold uppercase tracking-[.18em] text-[#d9ff55] transition hover:bg-[#d9ff55] hover:text-[#100d24]">eastwala12@gmail.com <span aria-hidden="true">↗</span></a>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-[10px] uppercase tracking-[.15em] text-[#80798f]">
            <Link to="/privacy-policy" className="text-[#7357ff] transition hover:text-[#100d24]">Read our Privacy Policy ↗</Link>
            <Link to="/" className="text-[#7357ff] transition hover:text-[#100d24]">Return to the store ↗</Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
