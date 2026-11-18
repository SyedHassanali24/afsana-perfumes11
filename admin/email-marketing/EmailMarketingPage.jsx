import { useMemo, useState } from 'react';
import { Download, Mail, RefreshCw, Send, Users, ShieldCheck, UserRoundCheck, UserRoundX } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import DataTable from '../components/DataTable';
import StatusPill from '../components/StatusPill';
import { Field, Input, Select, Textarea } from '../components/FormFields';
import useApi from '../../src/hooks/useApi';
import useDebounce from '../../src/hooks/useDebounce';
import { emailMarketingApi } from '../../src/services';

const PAGE_SIZE = 15;
const initialDraft = { name: '', subject: '', message: '', ctaText: '', ctaUrl: '' };
const formatDate = (value) => value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const csvCell = (value) => '"' + String(value ?? '').replace(/"/g, '""') + '"';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function EmailMarketingPage() {
  const [search, setSearch] = useState('');
  const [consentStatus, setConsentStatus] = useState('');
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState(initialDraft);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [runningId, setRunningId] = useState('');
  const [progress, setProgress] = useState(null);
  const [notice, setNotice] = useState(null);
  const q = useDebounce(search);

  const summaryQuery = useApi(() => emailMarketingApi.summary(), []);
  const contactsQuery = useApi(() => emailMarketingApi.contacts({ q, consentStatus, page, limit: PAGE_SIZE }), [q, consentStatus, page]);
  const campaignsQuery = useApi(() => emailMarketingApi.campaigns(), []);

  const summary = summaryQuery.data || {};
  const contacts = contactsQuery.data?.contacts || [];
  const pagination = contactsQuery.data?.pagination;
  const campaigns = campaignsQuery.data?.campaigns || [];
  const optedInCount = Number(summary.subscribed || 0);
  const activeCampaign = campaigns.find((c) => c.status === 'Active');

  const setDraftField = (key) => (event) => setDraft((old) => ({ ...old, [key]: event.target.value }));
  const refreshAll = () => { summaryQuery.reload(); contactsQuery.reload(); campaignsQuery.reload(); };
  const flash = (type, text) => setNotice({ type, text });

  const downloadBackup = async () => {
    setExporting(true); setNotice(null);
    try {
      const result = await emailMarketingApi.exportContacts();
      const headers = ['Email', 'Name', 'Source', 'Marketing consent', 'Consent date', 'Unsubscribed date', 'Order count', 'First seen', 'Last seen'];
      const lines = [headers, ...(result.contacts || []).map((c) => [
        c.email, c.name, c.source, c.consentStatus, c.consentAt ? new Date(c.consentAt).toISOString() : '',
        c.unsubscribedAt ? new Date(c.unsubscribedAt).toISOString() : '', c.orderCount,
        c.firstSeenAt ? new Date(c.firstSeenAt).toISOString() : '', c.lastSeenAt ? new Date(c.lastSeenAt).toISOString() : '',
      ])].map((line) => line.map(csvCell).join(','));
      const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'afsana-customer-email-backup.csv';
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      URL.revokeObjectURL(url);
      flash('success', 'Email backup downloaded. The CSV includes consent status so non-subscribed contacts are not accidentally marketed to.');
      if (result.truncated) flash('warning', 'Backup is limited to the first 20,000 contacts. Contact support before exporting a larger archive.');
    } catch (error) { flash('error', error.message || 'Could not export email backup.'); }
    finally { setExporting(false); }
  };

  const runCampaign = async (campaignId, start = true) => {
    setRunningId(campaignId); setBusy(true); setNotice(null);
    try {
      let current = start ? await emailMarketingApi.startCampaign(campaignId) : await emailMarketingApi.getCampaign(campaignId).then((x) => x.progress);
      setProgress(current);
      while (current.status === 'Active' && !current.paused && (current.pendingCount || 0) > 0) {
        await sleep(6500);
        current = await emailMarketingApi.processNext(campaignId);
        setProgress(current);
      }
      if (current.paused) {
        flash('warning', current.pauseReason || 'Sending paused by the email provider. Resume after the displayed limit resets.');
      } else {
        flash('success', `Campaign finished: ${current.sentCount} sent, ${current.failedCount} failed, ${current.skippedCount} skipped.`);
      }
      refreshAll();
    } catch (error) {
      flash('error', error.message || 'Campaign could not continue. You can resume it from Campaign history.');
    } finally { setBusy(false); setRunningId(''); }
  };

  const createAndSend = async (event) => {
    event.preventDefault();
    if (busy || !optedInCount) return;
    const confirmed = window.confirm(`Send “${draft.subject}” to ${optedInCount} customers who opted in to AFSANA email offers? Each person receives a separate email.`);
    if (!confirmed) return;
    setBusy(true); setNotice(null);
    try {
      const created = await emailMarketingApi.createCampaign(draft);
      setDraft(initialDraft);
      flash('success', `Campaign prepared for ${created.recipientCount} opted-in contacts. Sending has started.`);
      setBusy(false);
      await runCampaign(created.campaignId, true);
    } catch (error) {
      flash('error', error.message || 'Campaign could not be created.');
      setBusy(false);
    }
  };

  const columns = useMemo(() => [
    { key: 'email', header: 'Email', render: (r) => <span className="font-medium">{r.email}</span> },
    { key: 'name', header: 'Customer', render: (r) => r.name || '—' },
    { key: 'source', header: 'Source', render: (r) => r.source === 'order-history' ? 'Past order' : r.source === 'newsletter' ? 'Newsletter' : 'Checkout' },
    { key: 'orderCount', header: 'Orders', align: 'right', render: (r) => Number(r.orderCount || 0) },
    { key: 'consentStatus', header: 'Marketing permission', render: (r) => {
      const map = { subscribed: ['Subscribed', 'success'], not_consented: ['No consent', 'warning'], unsubscribed: ['Unsubscribed', 'danger'] };
      const [label, tone] = map[r.consentStatus] || ['Unknown', 'warning'];
      return <StatusPill status={label} tone={tone} />;
    } },
    { key: 'lastSeenAt', header: 'Last seen', render: (r) => formatDate(r.lastSeenAt) },
  ], []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl text-[#182308]">Customer Email Marketing</h1>
          <p className="mt-1 text-sm text-[#5f654f]">Customer email archive, permission tracking and AFSANA offer campaigns.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={RefreshCw} onClick={refreshAll}>Refresh</Button>
          <Button variant="secondary" icon={Download} onClick={downloadBackup} disabled={exporting}>{exporting ? 'Preparing…' : 'Download email backup'}</Button>
        </div>
      </div>

      {notice && <p role="status" className={`rounded-xl border px-4 py-3 text-sm ${notice.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : notice.type === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{notice.text}</p>}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric icon={Users} label="Archived emails" value={summary.total ?? '—'} detail="Historical orders + new signups" />
        <Metric icon={UserRoundCheck} label="Can receive offers" value={summary.subscribed ?? '—'} detail="Explicit email permission" />
        <Metric icon={ShieldCheck} label="No marketing consent" value={summary.notConsented ?? '—'} detail="Saved for records only" />
        <Metric icon={UserRoundX} label="Unsubscribed" value={summary.unsubscribed ?? '—'} detail="Excluded from campaigns" />
      </div>

      <Card padded={false}>
        <div className="flex flex-col gap-3 border-b border-[#263e0e]/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div><h2 className="text-base font-semibold text-[#182308]">Customer email backup</h2><p className="mt-1 text-xs text-[#5f654f]">All historic order emails are imported automatically. Only subscribed addresses can receive promotional campaigns.</p></div>
          <span className="text-xs text-[#5f654f]">{pagination?.total ?? summary.total ?? 0} records</span>
        </div>
        <div className="space-y-3 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search email or customer name…" aria-label="Search archived email contacts" />
            <Select value={consentStatus} onChange={(e) => { setConsentStatus(e.target.value); setPage(1); }} aria-label="Filter by marketing permission">
              <option value="">All permission states</option>
              <option value="subscribed">Subscribed</option>
              <option value="not_consented">No consent</option>
              <option value="unsubscribed">Unsubscribed</option>
            </Select>
          </div>
          {contactsQuery.error ? <div className="py-8 text-center text-sm text-rose-700">{contactsQuery.error.message} <button className="ml-2 underline" onClick={contactsQuery.reload}>Retry</button></div>
            : <DataTable loading={contactsQuery.loading} rows={contacts.map((r) => ({ ...r, id: r._id || r.email }))} columns={columns} emptyMessage="No email contacts found." pagination={pagination && { page: pagination.page, totalPages: pagination.pages, onPageChange: setPage }} />}
        </div>
      </Card>

      <Card>
        <div className="mb-5">
          <h2 className="text-base font-semibold text-[#182308]">Create an offer email</h2>
          <p className="mt-1 text-xs leading-5 text-[#5f654f]">One click sends individual emails to the opted-in list. The sender automatically adds the provider’s unsubscribe header. Sending is paced to respect OpenMail limits.</p>
        </div>
        <form onSubmit={createAndSend} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Campaign name"><Input required minLength={2} maxLength={100} value={draft.name} onChange={setDraftField('name')} placeholder="November private offer" /></Field>
            <Field label="Email subject"><Input required minLength={3} maxLength={160} value={draft.subject} onChange={setDraftField('subject')} placeholder="A private offer from AFSANA" /></Field>
          </div>
          <Field label="Message" hint="Plain text only. New lines are preserved in the email."><Textarea required rows={5} maxLength={4000} value={draft.message} onChange={setDraftField('message')} placeholder="Dear AFSANA customer,\n\nEnjoy a special offer on your next fragrance…" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Button text (optional)"><Input maxLength={40} value={draft.ctaText} onChange={setDraftField('ctaText')} placeholder="Shop the offer" /></Field>
            <Field label="Button link (HTTPS, optional)"><Input type="url" value={draft.ctaUrl} onChange={setDraftField('ctaUrl')} placeholder="https://afsanaperfumes.store/shop" /></Field>
          </div>
          <div className="flex flex-col gap-3 border-t border-[#263e0e]/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[#5f654f]">Audience: <strong className="text-[#182308]">{optedInCount} opted-in contacts</strong> · Maximum 5,000 per campaign.</p>
            <Button type="submit" icon={Send} disabled={busy || optedInCount < 1}>{busy ? 'Sending campaign…' : 'Create & send campaign'}</Button>
          </div>
        </form>
      </Card>

      {activeCampaign && !busy && <Card className="border border-amber-200">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-semibold text-[#182308]">Campaign paused or page was closed</h2><p className="mt-1 text-xs text-[#5f654f]">{activeCampaign.name} · {activeCampaign.sentCount}/{activeCampaign.recipientCount} sent. Resume to continue the remaining recipients.</p></div>
          <Button icon={Send} onClick={() => runCampaign(activeCampaign.id, false)} disabled={busy}>Resume campaign</Button>
        </div>
      </Card>}

      <Card padded={false}>
        <div className="border-b border-[#263e0e]/10 p-4 sm:p-5"><h2 className="text-base font-semibold text-[#182308]">Campaign history</h2><p className="mt-1 text-xs text-[#5f654f]">Delivery counts are recorded for every campaign.</p></div>
        <div className="p-4 sm:p-5">
          <div className="space-y-3">
            {campaigns.length === 0 ? <p className="py-8 text-center text-sm text-[#5f654f]">No email campaigns yet.</p> : campaigns.map((campaign) => (
              <div key={campaign.id} className="flex flex-col gap-3 rounded-xl border border-[#263e0e]/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-[#182308]">{campaign.name}</p><p className="mt-1 truncate text-xs text-[#5f654f]">{campaign.subject} · {formatDate(campaign.createdAt)}</p><p className="mt-1 text-xs text-[#5f654f]">{campaign.sentCount}/{campaign.recipientCount} sent · {campaign.failedCount} failed · {campaign.skippedCount} skipped</p></div>
                <div className="flex items-center gap-2"><StatusPill status={campaign.status} />{campaign.status === 'Active' && <Button size="sm" variant="secondary" onClick={() => runCampaign(campaign.id, false)} disabled={busy}>Resume</Button>}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail }) {
  return <Card className="min-w-0"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-xs text-[#5f654f]">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums text-[#182308]">{value}</p><p className="mt-1 text-[11px] leading-5 text-[#5f654f]">{detail}</p></div><span className="rounded-xl bg-[#e7ead9] p-2 text-[#263e0e]"><Icon className="h-4 w-4" /></span></div></Card>;
}
