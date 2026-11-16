import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Copy, Plus, RefreshCw, Users, MousePointerClick, ShoppingBag, Wallet, Tag, PauseCircle, PlayCircle } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import ConfirmPasswordModal from '../components/ConfirmPasswordModal';
import useApi from '../../src/hooks/useApi';
import { useAuth } from '../../src/auth/AuthContext';
import { growthApi } from '../../src/services';

const money = (value) => 'PKR ' + Number(value || 0).toLocaleString('en-PK');
const number = (value) => Number(value || 0).toLocaleString('en');
const dateTime = (value) => value ? new Date(value).toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' }) : '—';
const blank = { name: '', code: '', platform: 'instagram', handle: '', discountType: 'percentage', discountValue: '10', maxDiscount: '', minOrder: '', commissionType: 'percentage', commissionValue: '10', usageLimit: '', perCustomerLimit: '0' };
const fieldClass = 'mt-1.5 min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';

function Metric({ icon: Icon, label, value, detail }) {
  return <Card><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-2 break-words text-2xl font-semibold tracking-tight text-slate-900">{value}</p>{detail && <p className="mt-1 text-[11px] text-slate-500">{detail}</p>}</div><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Icon className="h-4 w-4"/></span></div></Card>;
}
function TextField({ label, value, onChange, type = 'text', placeholder, required = false, min, max, disabled = false }) {
  return <label className="block min-w-0 text-xs font-medium text-slate-600">{label}<input className={fieldClass} type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} min={min} max={max} disabled={disabled}/></label>;
}
function PartnerGraph({ row }) {
  const values = row.metrics.monthly || [];
  return <div className="h-52 min-w-0">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={values} margin={{ top: 8, right: 10, left: -18, bottom: 0 }}>
        <defs><linearGradient id={'partner-' + row.partner.id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7357ff" stopOpacity={0.3}/><stop offset="100%" stopColor="#7357ff" stopOpacity={0}/></linearGradient></defs>
        <CartesianGrid stroke="#e8eaf0" vertical={false}/>
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} minTickGap={24}/>
        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} width={42} tickFormatter={(v) => v >= 1000 ? Math.round(v / 1000) + 'k' : v}/>
        <Tooltip formatter={(v) => [money(v), 'Paid revenue']} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}/>
        <Area type="monotone" dataKey="paidRevenue" stroke="#7357ff" strokeWidth={2.2} fill={'url(#partner-' + row.partner.id + ')'} activeDot={{ r: 4 }}/>
      </AreaChart>
    </ResponsiveContainer>
  </div>;
}

export default function GrowthPage() {
  const { can, user } = useAuth();
  const manager = can('referrals.view');
  const canCreate = can('referrals.create');
  const canEdit = can('referrals.edit');
  const { data, loading, error, reload } = useApi(() => manager ? growthApi.dashboard() : growthApi.me(), [manager]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [notice, setNotice] = useState('');
  const rows = data?.partners || [];
  const totals = data?.totals || {};
  const set = (key) => (event) => setForm((old) => ({ ...old, [key]: event.target.value }));
  const currencyTotals = useMemo(() => [
    { label: 'Booked revenue', value: totals.bookedRevenue, icon: Wallet },
    { label: 'Paid revenue', value: totals.paidRevenue, icon: Wallet },
    { label: 'Customer discounts', value: totals.discounts, icon: Tag },
    { label: 'Estimated commissions', value: totals.estimatedCommission, icon: Users },
  ], [totals.bookedRevenue, totals.paidRevenue, totals.discounts, totals.estimatedCommission]);

  const createPartner = (event) => {
    event.preventDefault();
    setNotice('');
    const payload = {
      ...form,
      discountValue: Number(form.discountValue || 0),
      maxDiscount: form.maxDiscount === '' ? undefined : Number(form.maxDiscount),
      minOrder: Number(form.minOrder || 0),
      commissionValue: Number(form.commissionValue || 0),
      usageLimit: form.usageLimit === '' ? undefined : Number(form.usageLimit),
      perCustomerLimit: Number(form.perCustomerLimit || 0),
    };
    setConfirm({
      title: 'Confirm influencer code',
      message: 'The new referral code and its discount/commission terms will be added.',
      confirmLabel: 'Create code',
      action: async (password) => {
        await growthApi.createPartner({ ...payload, confirmPassword: password });
        setForm(blank);
        setNotice('Influencer referral code created.');
        await reload();
      },
    });
  };

  const togglePartner = (partner) => setConfirm({
    title: partner.isActive ? 'Pause referral code' : 'Activate referral code',
    message: partner.isActive ? 'New checkouts will no longer accept this code. Existing order attribution remains unchanged.' : 'This code will be accepted on new checkouts.',
    confirmLabel: partner.isActive ? 'Pause code' : 'Activate code',
    action: async (password) => {
      await growthApi.updatePartner(partner.id, { isActive: !partner.isActive, confirmPassword: password });
      setNotice(partner.code + (partner.isActive ? ' paused.' : ' activated.'));
      await reload();
    },
  });

  const copy = async (value) => {
    try { await navigator.clipboard.writeText(value); setNotice('Referral link copied.'); }
    catch { setNotice('Clipboard not available in this browser.'); }
  };

  const submitPartnerEdit = (event) => {
    event.preventDefault();
    if (!editing) return;
    const payload = {
      discountType: editing.discountType,
      discountValue: Number(editing.discountValue || 0),
      maxDiscount: editing.maxDiscount === '' ? null : Number(editing.maxDiscount),
      minOrder: Number(editing.minOrder || 0),
      commissionType: editing.commissionType,
      commissionValue: Number(editing.commissionValue || 0),
    };
    setConfirm({
      title: 'Confirm partner terms',
      message: 'New discount and commission terms apply to future orders only. Existing order snapshots stay unchanged.',
      confirmLabel: 'Save terms',
      action: async (password) => {
        await growthApi.updatePartner(editing.id, { ...payload, confirmPassword: password });
        setEditing(null);
        setNotice('Referral terms updated.');
        await reload();
      },
    });
  };

  if (loading && !data) return <div className="space-y-4"><div className="h-8 w-64 animate-pulse rounded bg-slate-100"/><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[0,1,2,3].map((n) => <div key={n} className="h-28 animate-pulse rounded-2xl bg-slate-100"/>)}</div></div>;

  const displayRows = manager ? rows : rows;
  return <div className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-indigo-600">Audience & sales attribution</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Growth & referrals</h1><p className="mt-1 text-sm text-slate-500">{manager ? 'Influencer and staff sales performance, coupon use and estimated commissions.' : 'Your personal referral link and attributed sales performance.'}</p></div>
      <Button variant="secondary" icon={RefreshCw} onClick={reload} disabled={loading}>Refresh</Button>
    </div>
    {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{notice}</p>}
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error.message || 'Referral data could not be loaded.'} <button className="ml-2 underline" onClick={reload}>Try again</button></div>}
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Metric icon={MousePointerClick} label="Referral visits" value={number(totals.visits)} detail="Unique first-touch sessions"/>
      <Metric icon={ShoppingBag} label="Attributed orders" value={number(totals.orders)} detail={number(totals.paidOrders) + ' paid orders'}/>
      {currencyTotals.map((item) => <Metric key={item.label} icon={item.icon} label={item.label} value={money(item.value)} detail={item.label === 'Booked revenue' ? 'All non-cancelled attributed orders' : item.label === 'Paid revenue' ? 'Less recorded refunds' : item.label === 'Estimated commissions' ? 'Estimate only; not a payout record' : 'Total applied at checkout'}/>)}
    </div>

    {manager && canCreate && <Card>
      <div className="mb-4"><h2 className="text-base font-semibold text-slate-900">Create influencer referral code</h2><p className="mt-1 text-xs leading-5 text-slate-500">Staff referral codes are provisioned automatically from Staff & roles. Create influencer/creator codes here.</p></div>
      <form onSubmit={createPartner} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <TextField label="Influencer name" value={form.name} onChange={set('name')} required placeholder="Creator name"/>
        <TextField label="Unique code" value={form.code} onChange={(e)=>setForm((v)=>({...v,code:e.target.value.toUpperCase().replace(/\s/g,'-')}))} required placeholder="AFSANA-ALI"/>
        <label className="block text-xs font-medium text-slate-600">Platform<select className={fieldClass} value={form.platform} onChange={set('platform')}><option value="instagram">Instagram</option><option value="tiktok">TikTok</option><option value="youtube">YouTube</option><option value="facebook">Facebook</option><option value="other">Other</option></select></label>
        <TextField label="Profile / handle" value={form.handle} onChange={set('handle')} placeholder="@username"/>
        <label className="block text-xs font-medium text-slate-600">Customer discount<select className={fieldClass} value={form.discountType} onChange={set('discountType')}><option value="none">Tracking only</option><option value="percentage">Percentage</option><option value="fixed">Fixed PKR</option><option value="free_shipping">Free delivery</option></select></label>
        <TextField label="Discount value" type="number" value={form.discountValue} onChange={set('discountValue')} min="0" max={form.discountType === 'percentage' ? '100' : undefined}/>
        <TextField label="Maximum discount (PKR)" type="number" value={form.maxDiscount} onChange={set('maxDiscount')} min="0"/>
        <TextField label="Minimum order (PKR)" type="number" value={form.minOrder} onChange={set('minOrder')} min="0"/>
        <label className="block text-xs font-medium text-slate-600">Commission basis<select className={fieldClass} value={form.commissionType} onChange={set('commissionType')}><option value="percentage">Percentage</option><option value="fixed">Fixed per paid order</option></select></label>
        <TextField label="Commission value" type="number" value={form.commissionValue} onChange={set('commissionValue')} min="0" max={form.commissionType === 'percentage' ? '100' : undefined}/>
        <TextField label="Total code uses (optional)" type="number" value={form.usageLimit} onChange={set('usageLimit')} min="1"/>
        <TextField label="Uses per customer" type="number" value={form.perCustomerLimit} onChange={set('perCustomerLimit')} min="0"/>
        <div className="sm:col-span-2 xl:col-span-4"><Button type="submit" icon={Plus}>Create referral code</Button></div>
      </form>
    </Card>}

    {displayRows.length === 0 && <Card><div className="py-8 text-center"><Users className="mx-auto h-8 w-8 text-slate-300"/><p className="mt-3 text-sm font-medium text-slate-700">No referral identity found</p><p className="mt-1 text-xs text-slate-500">An active staff profile will receive a personal code when Growth is opened.</p></div></Card>}
    <div className="space-y-4">
      {displayRows.map((row) => (
        <Card key={row.partner.id}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-semibold text-slate-900">{row.partner.name}</h2><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">{row.partner.type}</span><span className={'rounded-full px-2.5 py-1 text-[10px] font-semibold ' + (row.partner.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>{row.partner.isActive ? 'Active' : 'Paused'}</span></div>
              <p className="mt-1 text-sm font-semibold tracking-wide text-slate-700">{row.partner.code}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2"><code className="max-w-full break-all rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-600">{row.partner.referralUrl}</code><Button variant="secondary" size="sm" icon={Copy} onClick={()=>copy(row.partner.referralUrl)}>Copy link</Button></div>
              <p className="mt-2 text-[11px] text-slate-500">Discount: {row.partner.discountType} {row.partner.discountValue || 0} · Commission: {row.partner.commissionType} {row.partner.commissionValue || 0} · Uses: {number(row.partner.usedCount)}{row.partner.usageLimit ? ' / ' + number(row.partner.usageLimit) : ''}</p>
            </div>
            {manager && canEdit && <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={()=>setEditing({ id: row.partner.id, discountType: row.partner.discountType, discountValue: String(row.partner.discountValue || 0), maxDiscount: row.partner.maxDiscount ? String(row.partner.maxDiscount) : '', minOrder: String(row.partner.minOrder || 0), commissionType: row.partner.commissionType, commissionValue: String(row.partner.commissionValue || 0) })}>Configure terms</Button>
              <Button size="sm" variant="secondary" icon={row.partner.isActive ? PauseCircle : PlayCircle} onClick={()=>togglePartner(row.partner)}>{row.partner.isActive ? 'Pause code' : 'Activate code'}</Button>
            </div>}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">Visits</p><p className="mt-1 text-lg font-semibold text-slate-900">{number(row.metrics.visits)}</p></div>
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">Orders · paid</p><p className="mt-1 text-lg font-semibold text-slate-900">{number(row.metrics.orders)} · {number(row.metrics.paidOrders)}</p></div>
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">Paid revenue</p><p className="mt-1 text-lg font-semibold text-slate-900">{money(row.metrics.paidRevenue)}</p></div>
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">Est. commission</p><p className="mt-1 text-lg font-semibold text-slate-900">{money(row.metrics.estimatedCommission)}</p></div>
          </div>
          {editing?.id === row.partner.id && <form onSubmit={submitPartnerEdit} className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-900">Configure {row.partner.name}</h3><p className="mt-1 text-[11px] text-slate-500">Set the customer reward and this person's sales commission.</p></div><button type="button" className="text-xs font-medium text-slate-500 underline" onClick={()=>setEditing(null)}>Close</button></div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <label className="block text-xs font-medium text-slate-600">Customer discount<select className={fieldClass} value={editing.discountType} onChange={(e)=>setEditing((v)=>({...v,discountType:e.target.value}))}><option value="none">Tracking only</option><option value="percentage">Percentage</option><option value="fixed">Fixed PKR</option><option value="free_shipping">Free delivery</option></select></label>
              <TextField label="Discount value" type="number" min="0" max={editing.discountType === 'percentage' ? '100' : undefined} value={editing.discountValue} onChange={(e)=>setEditing((v)=>({...v,discountValue:e.target.value}))}/>
              <TextField label="Maximum discount (PKR)" type="number" min="0" value={editing.maxDiscount} onChange={(e)=>setEditing((v)=>({...v,maxDiscount:e.target.value}))}/>
              <TextField label="Minimum order (PKR)" type="number" min="0" value={editing.minOrder} onChange={(e)=>setEditing((v)=>({...v,minOrder:e.target.value}))}/>
              <label className="block text-xs font-medium text-slate-600">Commission basis<select className={fieldClass} value={editing.commissionType} onChange={(e)=>setEditing((v)=>({...v,commissionType:e.target.value}))}><option value="percentage">Percentage of net sales</option><option value="fixed">Fixed per paid order</option></select></label>
              <TextField label="Commission value" type="number" min="0" max={editing.commissionType === 'percentage' ? '100' : undefined} value={editing.commissionValue} onChange={(e)=>setEditing((v)=>({...v,commissionValue:e.target.value}))}/>
            </div>
            <div className="mt-4 flex justify-end"><Button type="submit">Save referral terms</Button></div>
          </form>}
          <div className="mt-4 rounded-xl border border-slate-100 p-3">
            <div className="mb-2 flex items-center justify-between gap-3"><h3 className="text-xs font-semibold text-slate-700">Referral visits by channel</h3><span className="text-[10px] text-slate-400">First-touch source</span></div>
            {(row.metrics.sources || []).length ? <div className="flex flex-wrap gap-2">{row.metrics.sources.map((source)=><span key={source.source} className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-600">{source.source}: <strong className="tabular-nums text-slate-800">{number(source.visits)}</strong></span>)}</div> : <p className="text-[11px] text-slate-500">No referral-link visits recorded in this retention window.</p>}
          </div>
          <div className="mt-5"><div className="mb-2 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-slate-800">Monthly paid sales graph</h3><span className="text-[10px] text-slate-500">Last 12 months · PKR</span></div><PartnerGraph row={row}/></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-100 p-3"><p className="text-xs font-semibold text-slate-700">Booked revenue</p><p className="mt-1 text-lg font-semibold text-slate-900">{money(row.metrics.bookedRevenue)}</p></div>
            <div className="rounded-xl border border-slate-100 p-3"><p className="text-xs font-semibold text-slate-700">Applied discounts</p><p className="mt-1 text-lg font-semibold text-slate-900">{money(row.metrics.discounts)}</p></div>
            <div className="rounded-xl border border-slate-100 p-3"><p className="text-xs font-semibold text-slate-700">Refunded amount</p><p className="mt-1 text-lg font-semibold text-slate-900">{money(row.metrics.refunds)}</p></div>
          </div>
          <div className="mt-5 overflow-x-auto">
            <h3 className="mb-2 text-sm font-semibold text-slate-800">Orders & coupon applications</h3>
            <table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr>{['Order','Coupon / code','Applied at (PKT)','Discount','Net revenue','Payment','Estimated commission'].map((v)=><th key={v} className="px-3 py-2.5 font-medium">{v}</th>)}</tr></thead>
              <tbody>{(row.metrics.couponApplications || []).map((order)=><tr key={order.orderNumber} className="border-b border-slate-100"><td className="px-3 py-2.5 font-semibold text-slate-800">{order.orderNumber}</td><td className="px-3 py-2.5">{order.promoCode || row.partner.code}</td><td className="px-3 py-2.5">{dateTime(order.codeAppliedAt)}</td><td className="px-3 py-2.5 tabular-nums">{money(order.discount)}</td><td className="px-3 py-2.5 font-semibold tabular-nums">{money(order.revenue)}</td><td className="px-3 py-2.5">{order.paymentStatus}</td><td className="px-3 py-2.5 tabular-nums">{money(order.estimatedCommission)}</td></tr>)}</tbody>
            </table>
            {(!row.metrics.couponApplications || row.metrics.couponApplications.length === 0) && <p className="py-5 text-center text-xs text-slate-500">No attributed orders in the last 12 months yet.</p>}
          </div>
          <div className="mt-4 text-[11px] text-slate-500">Commission is an estimate based on this partner's saved rate and confirmed paid orders; it is not a payout or accounting liability record.</div>
        </Card>
      ))}
    </div>
    {confirm && <ConfirmPasswordModal open title={confirm.title} message={confirm.message} confirmLabel={confirm.confirmLabel} onConfirm={confirm.action} onClose={()=>setConfirm(null)}/>}
    <p className="text-[11px] leading-5 text-slate-500">Attribution is first-touch per browser tab. Referral-link visit events are retained for up to {number(data?.attributionRetentionDays || 180)} days; partner sales graphs use the last 12 months of order records. Orders without a saved referral snapshot cannot be retroactively assigned.</p>
  </div>;
}
