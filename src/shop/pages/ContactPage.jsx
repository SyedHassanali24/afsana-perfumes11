import "../../styles/afsana-dashboard-contact-reference.css";
import { useMemo, useState } from 'react';
import { ArrowRight, MapPin, Phone, Mail, Clock3, Instagram, Facebook, MessageCircle, Youtube, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import useShopSettings from '../useShopSettings';
import useTitle from '../useTitle';

export default function ContactPage() {
  useTitle('Contact AFSANA');
  const settings = useShopSettings();
  const store = settings?.store || {};
  const address = String(store.address || '').trim();
  const phone = String(store.phone || '').trim();
  const whatsapp = String(store.whatsapp || '').trim();
  const email = String(store.email || '').trim();
  const socials = [
    ['Instagram', store.instagram, Instagram],
    ['Facebook', store.facebook, Facebook],
    ['YouTube', store.youtube, Youtube],
  ].filter(([, url]) => /^https?:\/\//i.test(String(url || '')));
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);
  const canEmail = Boolean(email);
  const mapQuery = useMemo(() => encodeURIComponent(address), [address]);
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = (event) => {
    event.preventDefault();
    if (!canEmail) return;
    const body = `Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`;
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(form.subject || 'AFSANA customer enquiry')}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  return (
    <main className="afsana-contact-page">
      <section className="afsana-contact-hero">
        <div className="afsana-contact-hero-inner">
          <p>AFSANA · THE ART OF SCENT</p>
          <h1>Contact Us</h1>
          <div><Link to="/">Home</Link><span>/</span><span>Contact Us</span></div>
        </div>
      </section>

      <section className="afsana-contact-main">
        <div className="afsana-contact-form-wrap">
          <p className="afsana-contact-eyebrow"><i /> CONTACT US</p>
          <h2>Let’s make your <em>next impression</em>.</h2>
          <p className="afsana-contact-intro">Questions about a fragrance, an order or a gift? Send a message and the AFSANA team will be happy to help.</p>
          <form className="afsana-contact-form" onSubmit={submit}>
            <div className="afsana-contact-two">
              <label>Your Name *<input required autoComplete="name" value={form.name} onChange={update('name')} placeholder="Your name" /></label>
              <label>Email *<input required type="email" autoComplete="email" value={form.email} onChange={update('email')} placeholder="you@example.com" /></label>
            </div>
            <label>Subject *<input required value={form.subject} onChange={update('subject')} placeholder="How can we help?" /></label>
            <label>Your Message *<textarea required rows="5" value={form.message} onChange={update('message')} placeholder="Tell us a little about your enquiry..." /></label>
            <button type="submit" disabled={!canEmail}><span><ArrowRight size={18}/></span> Send Message</button>
            {!canEmail && <p className="afsana-contact-note">Please contact us using the phone or WhatsApp details shown here. An email address has not been added in store settings yet.</p>}
            {sent && <p className="afsana-contact-note" role="status">Your email app should open with the message ready to send.</p>}
          </form>
        </div>

        <aside className="afsana-contact-card">
          <div><h3>Address</h3><p>{address || 'Contact AFSANA for our current business address.'}</p></div>
          <div><h3>Contact</h3>
            {phone && <a href={`tel:${phone.replace(/[^+\d]/g, '')}`}><Phone size={14}/> {phone}</a>}
            {email && <a href={`mailto:${email}`}><Mail size={14}/> {email}</a>}
            {whatsapp && <a href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"><MessageCircle size={14}/> WhatsApp support</a>}
            {!phone && !email && !whatsapp && <p>Contact details will appear here when added in store settings.</p>}
          </div>
          <div><h3>Customer Care</h3><p>For fragrance advice, gifting assistance and order support, reach out through the contact details above.</p></div>
          <div><h3>Stay Connected</h3><div className="afsana-contact-socials">
            {socials.map(([label, url, Icon]) => <a key={label} href={url} aria-label={label} target="_blank" rel="noreferrer"><Icon size={17}/></a>)}
            {whatsapp && <a href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`} aria-label="WhatsApp" target="_blank" rel="noreferrer"><MessageCircle size={17}/></a>}
          </div></div>
        </aside>
      </section>

      {address && <section className="afsana-contact-map" aria-label="AFSANA location map"><iframe title="AFSANA location map" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={`https://www.google.com/maps?q=${mapQuery}&output=embed`} /></section>}

      <section className="afsana-contact-benefits">
        <div><span><MessageCircle/></span><p><strong>Fragrance Guidance</strong><small>Help choosing a scent that feels like you.</small></p></div>
        <div><span><Send/></span><p><strong>Order Assistance</strong><small>Support with orders and delivery updates.</small></p></div>
        <div><span><Clock3/></span><p><strong>Personal Support</strong><small>We’re here to help with your AFSANA experience.</small></p></div>
      </section>
    </main>
  );
}
