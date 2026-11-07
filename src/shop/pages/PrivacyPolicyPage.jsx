import { Link } from "react-router-dom";

const sections = [
  {
    title: "Information we collect",
    text: "When you browse or place an order, we may collect information you provide, such as your name, phone number, email address, delivery address, order details and messages sent to our support channels. We also receive basic technical information needed to operate and protect the website, such as device/browser details and request or security logs.",
  },
  {
    title: "How we use information",
    text: "We use information to process and deliver orders, contact you about an order, provide customer support, manage returns or refunds, maintain your account and wishlist, improve the store, prevent fraud and meet applicable legal obligations. We only send promotional messages where permitted and where the required consent has been obtained.",
  },
  {
    title: "Payments",
    text: "Payment options and instructions are shown during checkout. If a payment is processed by a third-party provider, that provider handles the payment information under its own privacy terms. Afsana does not intend to collect or store your full payment-card credentials through this website.",
  },
  {
    title: "Cookies and local storage",
    text: "The website may use browser storage and similar technologies to keep essential shopping functions working, such as your cart, preferences, session and security state. You can manage or clear browser storage through your browser settings; some features may not work as expected afterwards.",
  },
  {
    title: "Sharing information",
    text: "We may share the minimum information needed with service providers that help operate the store, process payments, deliver orders, provide communications or protect the website. We may also disclose information where required by law or to protect customers, the business or the public. We do not sell customer personal information.",
  },
  {
    title: "Retention and security",
    text: "We retain information for as long as reasonably needed for the purposes described here, including order records, customer support, accounting and legal requirements. We use reasonable administrative and technical safeguards, but no website or transmission method can be guaranteed completely secure.",
  },
  {
    title: "Your choices and requests",
    text: "You may contact us to request access to, correction of or deletion of personal information, subject to records we must retain for legal, security or transaction purposes. You may also opt out of promotional communications using the instructions in the message or by contacting us.",
  },
  {
    title: "Children",
    text: "This store is intended for general retail customers and is not designed to knowingly collect personal information from children without appropriate consent.",
  },
  {
    title: "Changes to this policy",
    text: "We may update this policy when our services or legal requirements change. The latest version will be published on this page with its updated effective date.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-16 sm:px-8">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.28em] text-current/60">Afsana Perfumes</p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl">Privacy Policy</h1>
        <p className="mt-4 text-sm text-current/65">Effective date: 7 November 2026</p>
        <p className="mt-6 max-w-3xl leading-7 text-current/75">
          This policy explains how Afsana Perfumes collects, uses and protects information when you visit
          our website, create an account, contact us or place an order.
        </p>
      </div>

      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.title} className="border-t border-current/15 pt-5">
            <h2 className="font-display text-2xl">{section.title}</h2>
            <p className="mt-3 leading-7 text-current/75">{section.text}</p>
          </section>
        ))}
      </div>

      <div className="mt-10 border-t border-current/15 pt-6">
        <h2 className="font-display text-2xl">Contact Afsana</h2>
        <p className="mt-3 leading-7 text-current/75">
          For privacy questions or requests, contact Afsana on WhatsApp at{" "}
          <a
            href="https://wa.me/923132956206"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 hover:text-current"
          >
            +92 313 2956206
          </a>
          . Please do not send passwords, payment-card details or other sensitive credentials in chat.
        </p>
        <Link to="/" className="mt-5 inline-flex underline underline-offset-4">Return to Afsana Perfumes</Link>
      </div>
    </main>
  );
}
