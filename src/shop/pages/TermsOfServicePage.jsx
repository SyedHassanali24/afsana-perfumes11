import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { Container } from '../ui';
import useTitle from '../useTitle';

function TermsSection({ id, number, title, children }) {
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
  ['acceptance', 'Acceptance of these terms'],
  ['accounts', 'Customer accounts'],
  ['products', 'Products and product information'],
  ['orders-payments', 'Orders and payment'],
  ['pricing-delivery', 'Prices, offers and delivery'],
  ['returns-refunds', 'Returns, exchanges and refunds'],
  ['website-use', 'Website use and intellectual property'],
  ['availability-liability', 'Availability and responsibility'],
  ['privacy-law-updates', 'Privacy, applicable law and updates'],
];

export default function TermsOfServicePage() {
  useTitle('Terms of Service');

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
            A considered<br /><em className="text-[#d9ff55]">way to shop.</em>
          </h1>
          <div className="mt-8 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[.18em] text-white/45">
            <span>Terms of service</span><span aria-hidden="true">·</span><span>Effective 18 November 2026</span>
          </div>
        </Container>
      </section>

      <Container className="py-12 sm:py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
          <aside className="self-start lg:sticky lg:top-28">
            <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[.25em] text-[#7357ff]">
              <FileText className="h-4 w-4" /> Shopping terms
            </div>
            <p className="mt-4 text-sm leading-6 text-[#514b62]">These terms explain the main conditions for browsing AFSANA, placing an order, arranging delivery and requesting support or a return.</p>
            <nav aria-label="Terms of service contents" className="mt-7 border-l border-[#100d24]/15 pl-4">
              <ul className="space-y-3">
                {contents.map(([id, label], index) => (
                  <li key={id}><a href={'#' + id} className="text-[10px] uppercase tracking-[.12em] text-[#716a80] transition hover:text-[#7357ff]">{String(index + 1).padStart(2, '0')} · {label}</a></li>
                ))}
              </ul>
            </nav>
          </aside>

          <div className="space-y-8 sm:space-y-10">
            <div className="border border-[#7357ff]/15 bg-white/60 p-6 sm:p-8">
              <p className="text-[9px] font-semibold uppercase tracking-[.25em] text-[#7357ff]">The AFSANA promise</p>
              <p className="mt-3 font-display text-2xl leading-snug text-[#100d24] sm:text-3xl">Clear product information, thoughtful service and straightforward support from selection to delivery.</p>
            </div>

            <TermsSection id="acceptance" number="01" title="Acceptance of these terms">
              <p>These Terms of Service apply when you visit or use <strong>afsanaperfumes.store</strong>, create an AFSANA customer account, contact our team or place an order through the website. By using the website or placing an order, you agree to these terms.</p>
              <p>These terms should be read together with our <Link to="/privacy-policy" className="font-semibold text-[#7357ff] underline underline-offset-4">Privacy Policy</Link> and the product, promotion and delivery information displayed at the time you shop. If a specific offer or written order confirmation sets out a more specific condition, that condition applies to that offer or order.</p>
            </TermsSection>

            <TermsSection id="accounts" number="02" title="Customer accounts">
              <p>Please provide accurate, current contact, account and delivery information. You are responsible for keeping your sign-in details secure and for activity carried out through your account. Tell us promptly if you believe someone has accessed your account without permission.</p>
              <p>Do not create an account using another person's details, impersonate another customer, or use the website for unlawful or fraudulent activity. We may restrict access where reasonably necessary to protect customers, the store or our systems, while respecting rights available under applicable law.</p>
            </TermsSection>

            <TermsSection id="products" number="03" title="Products and product information">
              <p>We aim to present product names, descriptions, fragrance notes, sizes, prices and images as accurately as reasonably possible. Product images and colours may look slightly different depending on your screen and device. Fragrance experience can also vary between individuals and according to skin, environment and method of use.</p>
              <p>Please review the product details, quantity, size and total price before submitting an order. Contact us before ordering if you need clarification about a product or its use. Nothing in this section removes any right or remedy you may have if goods are defective or materially different from their description.</p>
            </TermsSection>

            <TermsSection id="orders-payments" number="04" title="Orders and payment">
              <p>When you submit an order, please check the items, quantities, delivery details and total shown at checkout. We may contact you to confirm an order or clarify information needed for fulfilment. If an item is unavailable or we cannot fulfil an order, we will contact you and arrange the appropriate next step, including return of any amount paid in advance where required.</p>
              <p>Available payment options are shown at checkout and may include Cash on Delivery and Bank Transfer. For a bank transfer, an order may remain pending until the payment is verified. For Cash on Delivery, the displayed order total is payable to the delivery representative when the order is delivered.</p>
              <p>Never share your account password, one-time verification code, card PIN or banking credentials with anyone claiming to represent AFSANA.</p>
            </TermsSection>

            <TermsSection id="pricing-delivery" number="05" title="Prices, offers and delivery">
              <p>Website prices are displayed in Pakistani Rupees (PKR), unless a page clearly states otherwise. Applicable delivery charges and the order total are shown before you submit your order. AFSANA currently advertises complimentary delivery on qualifying orders above PKR 7,500; any qualifying conditions or exclusions displayed at checkout or with an offer will apply.</p>
              <p>Delivery estimates are provided in good faith but may change because of courier operations, weather, access restrictions or other circumstances outside our reasonable control. Please provide a complete delivery address and a working phone number, and remain available to receive the parcel.</p>
              <p>Discount codes, influencer or referral codes, limited-time offers and other promotions are subject to the specific conditions and expiry dates shown with each offer. A code may not apply to excluded products or be combined with another offer unless the offer says otherwise.</p>
            </TermsSection>

            <TermsSection id="returns-refunds" number="06" title="Returns, exchanges and refunds">
              <p><strong>15-day return window.</strong> AFSANA advertises a 15-day return policy. Please contact us within 15 calendar days after the order is delivered to request a return or exchange. Include your order number and a short description of the reason so our team can guide you.</p>
              <p>For a change-of-mind request, the item should be unused, unopened and in its original packaging, with any original seals intact. Because fragrance products are personal-use goods, opened or used items are generally not eligible for a change-of-mind return. This condition does not remove your rights where an item is defective, damaged in transit, incorrect, not as described, or where applicable law provides a remedy.</p>
              <p>If your order arrives damaged, incorrect or appears defective, please contact us as soon as reasonably possible and share your order number and clear photos where helpful. Keep the item and its packaging until our team advises you on the next step. Please do not send an item back before receiving return instructions from AFSANA.</p>
              <p>After reviewing a request, we will confirm whether a return, exchange, replacement or refund is appropriate and explain the return arrangements and any applicable return-delivery cost before you send the item. Approved refunds will be arranged using the original payment method where reasonably available, or another method agreed with you. Timing may depend on the payment or banking provider.</p>
              <p>Nothing in these terms limits a consumer right or remedy that cannot lawfully be excluded. Where a mandatory legal right gives you a remedy, that right takes priority over any inconsistent wording in this section.</p>
            </TermsSection>

            <TermsSection id="website-use" number="07" title="Website use and intellectual property">
              <p>AFSANA names, logos, brand presentation, photographs, videos, product copy, designs and other website content belong to AFSANA or are used with permission. You may browse the website and use it for personal, non-commercial shopping. You may not copy, republish, sell or commercially exploit website content without prior written permission.</p>
              <p>You must not interfere with the website, attempt unauthorised access, introduce malicious code, scrape customer or business data, or use the website in a way that disrupts service or infringes another person's rights.</p>
            </TermsSection>

            <TermsSection id="availability-liability" number="08" title="Availability and responsibility">
              <p>We work to keep the website and its information available and accurate, but online services may occasionally be interrupted for maintenance, security, updates or reasons outside our control. We may update, suspend or discontinue a feature where reasonably necessary.</p>
              <p>To the extent permitted by law, AFSANA is not responsible for indirect losses that could not reasonably have been anticipated when an order was placed. Nothing in these terms excludes or limits liability for fraud, deliberate misconduct, defective products, faulty services, or any consumer right or liability that applicable law does not allow us to exclude or limit.</p>
            </TermsSection>

            <TermsSection id="privacy-law-updates" number="09" title="Privacy, applicable law and updates">
              <p>Our <Link to="/privacy-policy" className="font-semibold text-[#7357ff] underline underline-offset-4">Privacy Policy</Link> explains how information is handled when you browse, create an account, place an order or contact us.</p>
              <p>These terms are interpreted subject to the laws of Pakistan and the consumer-protection laws that apply to your transaction. Any mandatory rights available to you remain unaffected. We may revise these terms when our services or practices change. The effective date at the top of this page identifies the current version; updated terms will be published here.</p>
            </TermsSection>

            <section className="border border-[#7357ff]/20 bg-[#100d24] p-6 text-white sm:p-8">
              <p className="text-[9px] font-semibold uppercase tracking-[.28em] text-[#d9ff55]">Need help with an order?</p>
              <h2 className="mt-3 font-display text-3xl sm:text-4xl">Speak to the AFSANA team.</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-white/65">For questions about these terms, an order, delivery or a return request, contact our support team.</p>
              <a href="mailto:eastwala12@gmail.com?subject=AFSANA%20Terms%20and%20Order%20Support" className="mt-6 inline-flex items-center gap-2 border border-[#d9ff55]/50 px-5 py-3 text-[10px] font-semibold uppercase tracking-[.18em] text-[#d9ff55] transition hover:bg-[#d9ff55] hover:text-[#100d24]">eastwala12@gmail.com <span aria-hidden="true">↗</span></a>
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
