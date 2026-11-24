import { useState } from 'react';
import { MessageCircle, RefreshCw, Send, Users, Tag, ShieldCheck } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import StatusPill from '../components/StatusPill';
import { Field, Input, Textarea } from '../components/FormFields';
import useApi from '../../src/hooks/useApi';
import { useAuth } from '../../src/auth/AuthContext';
import { whatsappMarketingApi } from '../../src/services';

const initialDraft = {
  name: '',
  message: '',
  promoCode: '',
  ctaUrl: 'https://afsanaperfumes.store/shop',
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const formatDate = (value) => value
  ? new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—';

export default function WhatsAppMarketingPage() {
  const { can } = useAuth();
  const [draft, setDraft] = useState(initialDraft);
  const [busy, setBusy] = useState(false);
  const [runningId, setRunningId] = useState('');
  const [progress, setProgress] = useState(null);
  const [notice, setNotice] = useState(null);
  const summaryQuery = useApi(() => whatsappMarketingApi.summary(), []);
  const summary = summaryQuery.data || {};
  const campaigns = summary.campaigns || [];
  const audienceCount = Number(summary.eligibleCount || 0);
  const senderReady = summary.senderConfigured === true;
  const canCreate = can('campaigns.create');
  const canProcess = can('campaigns.edit');
  const activeCampaign = campaigns.find((campaign) => campaign.status === 'Active');

  const setField = (key) => (event) => setDraft((old) => ({ ...old, [key]: event.target.value }));
  const refresh = () => summaryQuery.reload();
  const flash = (type, text) => setNotice({ type, text });

  const prepareCampaign = async (event) => {
    event.preventDefault();
    if (busy || !canCreate || !senderReady || audienceCount < 1) return;
    setBusy(true);
    setNotice(null);
    try {
      const created = await whatsappMarketingApi.createCampaign(draft);
      setDraft(initialDraft);
      await refresh();
      flash('success', `Draft prepared for ${created.recipientCount} WhatsApp numbers with active marketing permission. No messages have been sent yet.`);
    } catch (error) {
      flash('error', error.message || 'Could not prepare the WhatsApp campaign.');
    } finally {
      setBusy(false);
    }
  };

  const runCampaign = async (campaign, start = true) => {
    if (busy || !canCreate || !canProcess) return;
    const confirmed = window.confirm(
      `Send “${campaign.name}” to ${campaign.recipientCount} opted-in WhatsApp numbers? Meta may charge for delivered marketing messages. Check the current price in WhatsApp Manager before confirming. Only contacts whose permission is still active will be messaged.`
    );
    if (!confirmed) return;

    setBusy(true);
    setRunningId(campaign.id);
    setNotice(null);
    try {
      let current = start
        ? await whatsappMarketingApi.startCampaign(campaign.id)
        : await whatsappMarketingApi.getCampaign(campaign.id).then((result) => result.progress);
      setProgress(current);

      let batches = 0;
      while (current.status === 'Active' && !current.paused && (current.pendingCount || 0) > 0 && batches < 700) {
        await sleep(6000);
        current = await whatsappMarketingApi.processBatch(campaign.id);
        setProgress(current);
        batches += 1;
      }

      if (current.paused) {
        flash('warning', current.pauseReason || 'Meta is rate limiting this campaign. It is paused and can be resumed later.');
      } else if ((current.pendingCount || 0) > 0) {
        flash('warning', 'Campaign is still active. Resume it from Campaign history to continue sending.');
      } else {
        flash('success', `Campaign completed: ${current.sentCount} accepted by WhatsApp, ${current.failedCount} failed, ${current.skippedCount} skipped.`);
      }
      await refresh();
    } catch (error) {
      flash('error', error.message || 'Campaign could not continue. You can resume it from Campaign history.');
      await refresh();
    } finally {
      setBusy(false);
      setRunningId('');
    }
  };

  const messageCountLabel = audienceCount === 1 ? 'number' : 'numbers';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl text-[#182308]">WhatsApp Marketing</h1>
          <p className="mt-1 text-sm text-[#5f654f]">Website alerts, opted-in audience and AFSANA sale campaigns.</p>
        </div>
        <Button variant="secondary" icon={RefreshCw} onClick={refresh} disabled={summaryQuery.loading}>Refresh audience</Button>
      </div>

      {notice && (
        <p role="status" className={`rounded-xl border px-4 py-3 text-sm ${
          notice.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700'
            : notice.type === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
        }`}>{notice.text}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Metric icon={Users} label="Eligible WhatsApp audience" value={summaryQuery.loading ? '…' : audienceCount.toLocaleString('en-PK')} detail="Unique numbers with active marketing consent" />
        <Metric icon={MessageCircle} label="WhatsApp sender" value={senderReady ? 'Configured' : 'Setup required'} detail={senderReady ? 'Cloud API credentials are present' : 'Check Worker credentials before sending'} />
      </div>

      <Card>
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-[#e7ead9] p-2 text-[#263e0e]"><ShieldCheck className="h-5 w-5" /></span>
          <div>
            <h2 className="text-sm font-semibold text-[#182308]">Automatic website alerts</h2>
            <p className="mt-1 text-xs leading-5 text-[#5f654f]">
              AFSANA dashboard alerts are automatically routed to the configured admin WhatsApp. New orders use
              <strong> afsana_new_order_alert</strong>; low-stock, review, return and staff/profile alerts use the
              approved UTILITY template <strong>afsana_site_alert</strong>. The existing dashboard bell and email alerts stay enabled.
            </p>
          </div>
        </div>
      </Card>

      {!senderReady && (
        <Card className="border border-amber-200">
          <p className="text-sm font-semibold text-[#182308]">WhatsApp sender is not ready</p>
          <p className="mt-1 text-sm text-[#5f654f]">Campaigns cannot be prepared until the WhatsApp Cloud API sender credentials are configured on the Worker.</p>
        </Card>
      )}

      <Card>
        <div className="mb-5 flex items-start gap-3">
          <span className="rounded-xl bg-[#e7ead9] p-2 text-[#263e0e]"><Tag className="h-5 w-5" /></span>
          <div>
            <h2 className="text-base font-semibold text-[#182308]">Prepare a sale offer</h2>
            <p className="mt-1 text-xs leading-5 text-[#5f654f]">Create a draft first. A separate confirmation is required before any WhatsApp message is sent.</p>
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
          <Field label="Offer message" hint="Keep it clear and short. The approved AFSANA marketing template wraps this message.">
            <Textarea required minLength={5} maxLength={500} rows={4} value={draft.message} onChange={setField('message')} placeholder="Enjoy 15% off selected fragrances this weekend…" />
          </Field>
          <Field label="Shop link (HTTPS)">
            <Input required type="url" value={draft.ctaUrl} onChange={setField('ctaUrl')} placeholder="https://afsanaperfumes.store/shop" />
          </Field>
          <div className="rounded-xl border border-[#263e0e]/10 bg-[#faf8f4] p-3 text-xs leading-5 text-[#5f654f]">
            <p className="font-semibold text-[#182308]">Before sending</p>
            <p>Only customers with recorded WhatsApp marketing permission are included. Replies such as STOP and UNSUBSCRIBE remove a number from future sale campaigns.</p>
            <p className="mt-1">Meta may charge for delivered marketing messages. Rates can change; check WhatsApp Manager billing before you send. No campaign is sent while preparing a draft.</p>
          </div>
          <div className="flex flex-col gap-3 border-t border-[#263e0e]/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[#5f654f]">Current audience: <strong className="text-[#182308]">{audienceCount.toLocaleString('en-PK')} eligible {messageCountLabel}</strong> · maximum 5,000 per campaign</p>
            <Button type="submit" icon={MessageCircle} disabled={busy || !canCreate || !senderReady || audienceCount < 1}>
              {busy ? 'Preparing…' : 'Prepare campaign draft'}
            </Button>
          </div>
          {!canCreate && <p className="text-xs text-[#9b3f3f]">Your staff role does not have campaign creation permission.</p>}
        </form>
      </Card>

      {progress && (
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#182308]">Sending progress</h2>
              <p className="mt-1 text-xs text-[#5f654f]">{progress.sentCount || 0} sent · {progress.pendingCount || 0} pending · {progress.failedCount || 0} failed · {progress.skippedCount || 0} skipped</p>
            </div>
            <StatusPill status={progress.status || 'Active'} />
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#e7ead9]">
            <div className="h-full rounded-full bg-[#263e0e] transition-all" style={{ width: `${Math.min(100, 100 * Number(progress.sentCount || 0) / Math.max(1, Number(progress.recipientCount || 0)))}%` }} />
          </div>
        </Card>
      )}

      {activeCampaign && !busy && (
        <Card className="border border-amber-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-[#182308]">Campaign in progress</h2>
              <p className="mt-1 text-xs text-[#5f654f]">{activeCampaign.name} · {activeCampaign.sentCount}/{activeCampaign.recipientCount} sent. Continue the remaining numbers.</p>
            </div>
            <Button icon={Send} onClick={() => runCampaign(activeCampaign, false)} disabled={busy || !canProcess}>Resume campaign</Button>
          </div>
        </Card>
      )}

      <Card padded={false}>
        <div className="border-b border-[#263e0e]/10 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-[#182308]">Campaign history</h2>
          <p className="mt-1 text-xs text-[#5f654f]">Draft campaigns are not sent until you press Send and confirm the audience.</p>
        </div>
        <div className="space-y-3 p-4 sm:p-5">
          {campaigns.length === 0
            ? <p className="py-8 text-center text-sm text-[#5f654f]">No WhatsApp campaigns yet.</p>
            : campaigns.map((campaign) => (
              <div key={campaign.id} className="flex flex-col gap-3 rounded-xl border border-[#263e0e]/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#182308]">{campaign.name}</p>
                  <p className="mt-1 text-xs text-[#5f654f]">{formatDate(campaign.createdAt)} · {campaign.recipientCount} opted-in numbers</p>
                  <p className="mt-1 text-xs text-[#5f654f]">{campaign.sentCount}/{campaign.recipientCount} accepted · {campaign.failedCount} failed · {campaign.skippedCount} skipped</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={campaign.status} />
                  {campaign.status === 'Draft' && (
                    <Button size="sm" icon={Send} onClick={() => runCampaign(campaign, true)} disabled={busy || !canCreate || !canProcess}>
                      {busy && runningId === campaign.id ? 'Sending…' : 'Send offer'}
                    </Button>
                  )}
                  {campaign.status === 'Active' && (
                    <Button size="sm" variant="secondary" icon={Send} onClick={() => runCampaign(campaign, false)} disabled={busy || !canCreate || !canProcess}>
                      {busy && runningId === campaign.id ? 'Sending…' : 'Resume'}
                    </Button>
                  )}
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
