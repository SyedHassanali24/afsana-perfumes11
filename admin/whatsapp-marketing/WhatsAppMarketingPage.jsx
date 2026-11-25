import { useState } from 'react';
import { MessageCircle, RefreshCw, Users, Tag, ShieldCheck, ExternalLink } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import StatusPill from '../components/StatusPill';
import { Field, Input, Textarea } from '../components/FormFields';
import useApi from '../../src/hooks/useApi';
import { useAuth } from '../../src/auth/AuthContext';
import { whatsappMarketingApi } from '../../src/services';

const ADMIN_WHATSAPP = '923132956206';
const initialDraft = {
  name: '',
  message: '',
  promoCode: '',
  ctaUrl: 'https://afsanaperfumes.store/shop',
};
const formatDate = (value) => value
  ? new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—';

function offerText(campaign) {
  return [
    'Hello from AFSANA Perfumes!',
    `AFSANA offer: ${campaign.name || 'Special fragrance offer'}`,
    campaign.message || '',
    campaign.promoCode ? `Promo code: ${campaign.promoCode}` : '',
    `Shop: ${campaign.ctaUrl || 'https://afsanaperfumes.store/shop'}`,
  ].filter(Boolean).join('\n');
}
function shareUrl(campaign) {
  return 'https://wa.me/?text=' + encodeURIComponent(offerText(campaign));
}

export default function WhatsAppMarketingPage() {
  const { can } = useAuth();
  const [draft, setDraft] = useState(initialDraft);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const summaryQuery = useApi(() => whatsappMarketingApi.summary(), []);
  const summary = summaryQuery.data || {};
  const campaigns = summary.campaigns || [];
  const audienceCount = Number(summary.eligibleCount || 0);
  const canCreate = can('campaigns.create');
  const setField = (key) => (event) => setDraft((old) => ({ ...old, [key]: event.target.value }));
  const refresh = () => summaryQuery.reload();
  const flash = (type, text) => setNotice({ type, text });

  const prepareCampaign = async (event) => {
    event.preventDefault();
    if (busy || !canCreate || audienceCount < 1) return;
    setBusy(true);
    setNotice(null);
    try {
      const created = await whatsappMarketingApi.createCampaign(draft);
      setDraft(initialDraft);
      await refresh();
      flash('success', `Offer draft saved for ${created.recipientCount} contacts who opted in. Nothing was sent. Open WhatsApp from Campaign history to share it manually.`);
    } catch (error) {
      flash('error', error.message || 'Could not save the WhatsApp offer draft.');
    } finally {
      setBusy(false);
    }
  };

  const messageCountLabel = audienceCount === 1 ? 'contact' : 'contacts';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl text-[#182308]">WhatsApp Marketing</h1>
          <p className="mt-1 text-sm text-[#5f654f]">Free manual sharing for AFSANA offers and customer support.</p>
        </div>
        <Button variant="secondary" icon={RefreshCw} onClick={refresh} disabled={summaryQuery.loading}>Refresh audience</Button>
      </div>

      {notice && (
        <p role="status" className={`rounded-xl border px-4 py-3 text-sm ${
          notice.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
        }`}>{notice.text}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Metric icon={Users} label="Eligible WhatsApp audience" value={summaryQuery.loading ? '…' : audienceCount.toLocaleString('en-PK')} detail="Unique contacts with recorded marketing consent" />
        <Metric icon={MessageCircle} label="WhatsApp delivery mode" value="Manual · Free" detail="No automatic API sending or Meta message billing" />
      </div>

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <span className="rounded-xl bg-[#e7ead9] p-2 text-[#263e0e]"><ShieldCheck className="h-5 w-5" /></span>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-[#182308]">Website alerts and order support</h2>
            <p className="mt-1 text-xs leading-5 text-[#5f654f]">
              Website alerts remain in the admin dashboard and existing email notifications. Automatic WhatsApp alerts and order messages are turned off to keep AFSANA in zero-cost mode. Open a WhatsApp chat only when you choose to contact someone manually.
            </p>
          </div>
          <a href={`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent('Assalam-o-Alaikum! I am contacting you from the AFSANA admin team.')}`} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#263e0e]/15 px-3 py-2 text-xs font-semibold text-[#263e0e] hover:bg-[#faf8f4]">
            Open admin WhatsApp <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </Card>

      <Card>
        <div className="mb-5 flex items-start gap-3">
          <span className="rounded-xl bg-[#e7ead9] p-2 text-[#263e0e]"><Tag className="h-5 w-5" /></span>
          <div>
            <h2 className="text-base font-semibold text-[#182308]">Prepare a sale offer</h2>
            <p className="mt-1 text-xs leading-5 text-[#5f654f]">Save an offer draft, then open WhatsApp and choose a contact or a broadcast list yourself. You press Send manually.</p>
          </div>
        </div>
        <form onSubmit={prepareCampaign} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Campaign name">
              <Input required minLength={2} maxLength={100} value={draft.name} onChange={setField('name')} placeholder="Weekend fragrance offer" />
            </Field>
            <Field label="Promo code (optional)">
              <Input maxLength={40} value={draft.promoCode} onChange={setField('promoCode')} placeholder="AFSANA15" />
            </Field>
          </div>
          <Field label="Offer message">
            <Textarea required minLength={5} maxLength={500} rows={4} value={draft.message} onChange={setField('message')} placeholder="Enjoy 15% off selected fragrances this weekend…" />
          </Field>
          <Field label="Shop link (HTTPS)">
            <Input required type="url" value={draft.ctaUrl} onChange={setField('ctaUrl')} placeholder="https://afsanaperfumes.store/shop" />
          </Field>
          <div className="rounded-xl border border-[#263e0e]/10 bg-[#faf8f4] p-3 text-xs leading-5 text-[#5f654f]">
            <p className="font-semibold text-[#182308]">Zero-cost sharing</p>
            <p>Only contacts with recorded marketing consent are counted. Drafting never messages anyone. WhatsApp opens with your offer text ready; choose the recipient or broadcast list and press Send yourself.</p>
            <p className="mt-1">No WhatsApp Cloud API token, paid sender, automated campaign or Meta message charge is used. Your normal internet/data plan may still apply.</p>
          </div>
          <div className="flex flex-col gap-3 border-t border-[#263e0e]/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[#5f654f]">Current audience: <strong className="text-[#182308]">{audienceCount.toLocaleString('en-PK')} opted-in {messageCountLabel}</strong></p>
            <Button type="submit" icon={MessageCircle} disabled={busy || !canCreate || audienceCount < 1}>
              {busy ? 'Saving draft…' : 'Save offer draft'}
            </Button>
          </div>
          {audienceCount < 1 && <p className="text-xs text-[#8b6a28]">No customers have opted in to WhatsApp offers yet. No customer will be messaged.</p>}
          {!canCreate && <p className="text-xs text-[#9b3f3f]">Your staff role does not have campaign creation permission.</p>}
        </form>
      </Card>

      <Card padded={false}>
        <div className="border-b border-[#263e0e]/10 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-[#182308]">Offer draft history</h2>
          <p className="mt-1 text-xs text-[#5f654f]">Every item here is a manual share draft. Nothing is automatically delivered.</p>
        </div>
        <div className="space-y-3 p-4 sm:p-5">
          {campaigns.length === 0
            ? <p className="py-8 text-center text-sm text-[#5f654f]">No WhatsApp offer drafts yet.</p>
            : campaigns.map((campaign) => (
              <div key={campaign.id} className="flex flex-col gap-3 rounded-xl border border-[#263e0e]/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#182308]">{campaign.name}</p>
                  <p className="mt-1 text-xs text-[#5f654f]">{formatDate(campaign.createdAt)} · {campaign.recipientCount} opted-in contacts in the audience snapshot</p>
                  <p className="mt-1 text-xs text-[#5f654f]">{campaign.message || 'Offer details are saved in this draft.'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status="Draft" />
                  <a href={shareUrl(campaign)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-[#263e0e] px-3 py-2 text-xs font-semibold text-white hover:bg-[#38591b]">
                    <MessageCircle className="h-4 w-4" /> Open WhatsApp to share
                  </a>
                </div>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail }) {
  return (
    <Card className="min-w-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-[#5f654f]">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-[#182308]">{value}</p>
          <p className="mt-1 text-[11px] leading-5 text-[#5f654f]">{detail}</p>
        </div>
        <span className="rounded-xl bg-[#e7ead9] p-2 text-[#263e0e]"><Icon className="h-4 w-4" /></span>
      </div>
    </Card>
  );
}
