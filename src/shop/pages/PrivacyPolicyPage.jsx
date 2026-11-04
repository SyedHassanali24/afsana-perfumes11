import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Container } from '../ui';
import useTitle from '../useTitle';

function PolicySection({ id, number, title, children }) {
  return (
    <section id={id} className="scroll-mt-28 border-b border-[#100d24]/10 pb-8 sm:pb-10">
      <div className="flex items-start gap-4">
        <span className="mt-1 font-mono text-[10px] tracking-[.2em] text-[#7357ff]">{number}</span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl leading-tight text-[#100d24] sm:text-3xl">{title}</h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-[#514b62]">{children}</div>
        </div>
      </div>
    </section>
  );
}

const contents = [
  ['information-we-collect', 'Information we collect'],
  ['how-we-use-information', 'How we use information'],
  ['cookies-and-storage', 'Cookies and browser storage'],
  ['gmail-api', 'Google and Gmail API use'],
  ['sharing-information', 'When information is shared'],
  ['retention-and-security', 'Retention and security'],
  ['your-choices', 'Your choices and requests'],
  ['children-and-changes', 'Children and policy updates'],
];

export default function PrivacyPolicyPage() {
  useTitle('Privacy Policy');

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
            Your privacy.<br /><em className="text-[#d9ff55]">Treated with care.</em>
          </h1>
          <div className="mt-8 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[.18em] text-white/45">
            <span>Privacy policy</span><span aria-hidden="true">·</span><span>Effective 5 November 2026</span>
          </div>
        </Container>
      </section>

      <Container className="py-12 sm:py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
          <aside className="self-start lg:sticky lg:top-28">
            <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[.25em] text-[#7357ff]">
              <ShieldCheck className="h-4 w-4" /> Your information
            </div>
            <p className="mt-4 text-sm leading-6 text-[#514b62]">This notice explains how AFSANA Perfumes handles information when you browse our store, create an account, place an order or contact us.</p>
            <nav aria-label="Privacy policy contents" className="mt-7 border-l border-[#100d24]/15 pl-4">
              <ul className="space-y-3">
                {contents.map(([id, label], index) => (
                  <li key={id}><a href={'#' + id} className="text-[10px] uppercase tracking-[.12em] text-[#716a80] transition hover:text-[#7357ff]">{String(index + 1).padStart(2, '0')} · {label}</a></li>
                ))}
              </ul>
            </nav>
          </aside>

          <div className="space-y-8 sm:space-y-10">
            <div className="border border-[#7357ff]/15 bg-white/60 p-6 sm:p-8">
              <p className="text-[9px] font-semibold uppercase tracking-[.25em] text-[#7357ff]">Our approach</p>
              <p className="mt-3 font-display text-2xl leading-snug text-[#100d24] sm:text-3xl">We use personal information to serve your orders, protect your account and support your experience — not to sell your personal details.</p>
            </div>

            <PolicySection id="information-we-collect" number="01" title="Information we collect">
              <p>Depending on how you use AFSANA, we may collect information that you provide directly, including your name, email address, phone number, account details, delivery or billing address, order history, product preferences, reviews and messages you send to customer support.</p>
              <p>When you browse the site, our systems may also receive technical information such as your IP address, browser and device type, pages or features requested, timestamps, referring page and security or error logs. Some of this information is generated automatically so the store can operate and be protected.</p>
              <p>Please do not send full payment-card numbers, card security codes or account passwords to us in a message or support request.</p>
            </PolicySection>

            <PolicySection id="how-we-use-information" number="02" title="How we use information">
              <p>We use information for legitimate store and account operations, including to:</p>
              <ul className="list-disc space-y-2 pl-5 marker:text-[#7357ff]">
                <li>create and maintain customer accounts and protect sign-in access;</li>
                <li>confirm, process, fulfil and support orders, deliveries, returns and refunds;</li>
                <li>respond to questions, provide customer service and send service-related updates;</li>
                <li>remember cart, wishlist and other preferences you choose to use;</li>
                <li>detect suspicious activity, prevent misuse, troubleshoot errors and improve reliability; and</li>
                <li>meet applicable record-keeping or legal obligations.</li>
              </ul>
              <p>We do not sell or rent your personal information. We do not use information obtained through a Google account connection for advertising.</p>
            </PolicySection>

            <PolicySection id="cookies-and-storage" number="03" title="Cookies and browser storage">
              <p>AFSANA may use essential cookies, session technologies and local browser storage to keep the site working — for example, to maintain sign-in sessions, remember cart or wishlist contents, retain preferences and support security controls.</p>
              <p>You can manage or clear cookies and site data through your browser settings. Blocking essential browser storage may cause some account, cart or checkout features to stop working as expected.</p>
            </PolicySection>

            <PolicySection id="gmail-api" number="04" title="Google and Gmail API use">
              <p>AFSANA may connect an AFSANA-managed Google account to Gmail for operational email delivery, such as sending login verification codes and password-reset messages. This connection uses the Gmail send permission (<code className="rounded bg-[#100d24]/5 px-1.5 py-0.5 text-[12px] text-[#100d24]">gmail.send</code>) for sending those messages.</p>
              <p>AFSANA does not use this connection to read, search, download or change inbox messages. Gmail message content is not used for advertising, profiling or sale. Google processes information under its own terms and privacy policy when its services are used.</p>
            </PolicySection>

            <PolicySection id="sharing-information" number="05" title="When information is shared">
              <p>We may provide limited information to service providers that help us operate the store, such as website hosting and security providers, database and email services, delivery partners, and payment providers when a payment service is offered. They receive information needed to perform their service and are expected to protect it appropriately.</p>
              <p>We may also disclose information when reasonably necessary to protect the store, our customers or others, respond to lawful requests, resolve disputes, or meet legal obligations. We do not sell personal information to third parties.</p>
              <p>Third-party services and links may have their own privacy practices. Please review their policies when you use those services.</p>
            </PolicySection>

            <PolicySection id="retention-and-security" number="06" title="Retention and security">
              <p>We keep information for as long as it is reasonably needed to provide the store and account features, complete transactions, provide support, maintain appropriate business records, resolve disputes and protect the service. Retention periods can differ depending on the type of record and the reason it is held.</p>
              <p>We use administrative and technical safeguards intended to protect information, including access controls and security monitoring. No website, internet transmission or storage system can be guaranteed to be completely secure.</p>
            </PolicySection>

            <PolicySection id="your-choices" number="07" title="Your choices and requests">
              <p>You may contact us to request access to, correction of or deletion of personal information associated with your account. We may ask for information to verify your identity before acting on a request. Some transaction, security or business records may need to be retained where required or reasonably necessary.</p>
              <p>You can also choose not to provide optional information. Certain details, such as delivery contact information, are necessary to complete an order.</p>
            </PolicySection>

            <PolicySection id="children-and-changes" number="08" title="Children and policy updates">
              <p>The AFSANA store is not designed for children, and we do not knowingly seek to collect personal information from children. A parent or guardian who believes a child has provided information to us can contact us using the details below.</p>
              <p>We may update this policy when our services or practices change. The effective date at the top of this page shows when this version was last updated. Any revised policy will be published on this page.</p>
            </PolicySection>

            <section className="border border-[#7357ff]/20 bg-[#100d24] p-6 text-white sm:p-8">
              <p className="text-[9px] font-semibold uppercase tracking-[.28em] text-[#d9ff55]">Questions about privacy?</p>
              <h2 className="mt-3 font-display text-3xl sm:text-4xl">Speak to the AFSANA team.</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-white/65">For privacy questions or a request about your information, email our support team.</p>
              <a href="mailto:eastwala12@gmail.com?subject=AFSANA%20Privacy%20Request" className="mt-6 inline-flex items-center gap-2 border border-[#d9ff55]/50 px-5 py-3 text-[10px] font-semibold uppercase tracking-[.18em] text-[#d9ff55] transition hover:bg-[#d9ff55] hover:text-[#100d24]">eastwala12@gmail.com <span aria-hidden="true">↗</span></a>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-[10px] uppercase tracking-[.15em] text-[#80798f]">
              <span>© 2026 AFSANA PERFUMES</span>
              <Link to="/" className="text-[#7357ff] transition hover:text-[#100d24]">Return to the store ↗</Link>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
