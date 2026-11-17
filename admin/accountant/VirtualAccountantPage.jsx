import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BookOpen, Calculator, RefreshCw, Scale, Wallet, Plus, Trash2, Save } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import useApi from '../../src/hooks/useApi';
import { accountantApi } from '../../src/services';
import { useAuth } from '../../src/auth/AuthContext';

const money = (value) => 'PKR ' + Number(value || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 });
const dateTime = (value) => value ? new Date(value).toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' }) : '—';
const fieldClass = 'min-h-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';
const periodNames = { this_month: 'This month', last_month: 'Last month', last_30: 'Last 30 days', this_year: 'This year', custom: 'Custom range' };

const todayPakistan = () => new Date(Date.now() + 5 * 3600000).toISOString().slice(0, 10);
const accountTypes = [
  ['asset', 'Asset'], ['liability', 'Liability'], ['equity', 'Owner equity'],
  ['income', 'Income'], ['expense', 'Expense'],
];
const accountOptions = [
  { account: 'Cash / Bank', accountType: 'asset' },
  { account: 'Accounts receivable', accountType: 'asset' },
  { account: 'Inventory', accountType: 'asset' },
  { account: 'Equipment', accountType: 'asset' },
  { account: 'Furniture & fixtures', accountType: 'asset' },
  { account: 'Other assets', accountType: 'asset' },
  { account: 'Accounts payable', accountType: 'liability' },
  { account: 'Loan payable', accountType: 'liability' },
  { account: 'Other liabilities', accountType: 'liability' },
  { account: "Owner's Capital", accountType: 'equity' },
  { account: "Owner's Drawings", accountType: 'equity' },
  { account: 'Retained earnings', accountType: 'equity' },
  { account: 'Other income', accountType: 'income' },
  { account: 'Service revenue', accountType: 'income' },
  { account: 'Delivery income', accountType: 'income' },
  { account: 'Advertising expense', accountType: 'expense' },
  { account: 'Rent expense', accountType: 'expense' },
  { account: 'Salaries expense', accountType: 'expense' },
  { account: 'Utilities expense', accountType: 'expense' },
  { account: 'Packaging expense', accountType: 'expense' },
  { account: 'Shipping expense', accountType: 'expense' },
  { account: 'Other expense', accountType: 'expense' },
];
const journalTemplates = {
  investment: [
    { account: 'Cash / Bank', accountType: 'asset', side: 'debit' },
    { account: "Owner's Capital", accountType: 'equity', side: 'credit' },
  ],
  expense: [
    { account: 'Advertising expense', accountType: 'expense', side: 'debit' },
    { account: 'Cash / Bank', accountType: 'asset', side: 'credit' },
  ],
  revenue: [
    { account: 'Cash / Bank', accountType: 'asset', side: 'debit' },
    { account: 'Other income', accountType: 'income', side: 'credit' },
  ],
  asset: [
    { account: 'Equipment', accountType: 'asset', side: 'debit' },
    { account: 'Cash / Bank', accountType: 'asset', side: 'credit' },
  ],
  loan: [
    { account: 'Cash / Bank', accountType: 'asset', side: 'debit' },
    { account: 'Loan payable', accountType: 'liability', side: 'credit' },
  ],
  withdrawal: [
    { account: "Owner's Drawings", accountType: 'equity', side: 'debit' },
    { account: 'Cash / Bank', accountType: 'asset', side: 'credit' },
  ],
  custom: [
    { account: 'Cash / Bank', accountType: 'asset', side: 'debit' },
    { account: "Owner's Capital", accountType: 'equity', side: 'credit' },
  ],
};
const templateLines = (key) => (journalTemplates[key] || journalTemplates.custom).map((row) => ({
  ...row, custom: false, debit: '', credit: '', note: '',
}));


function Metric({ label, value, note, icon: Icon }) {
  return <Card><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{value}</p>{note && <p className="mt-1 text-[11px] text-slate-500">{note}</p>}</div><span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Icon className="h-4 w-4"/></span></div></Card>;
}
function StatementRow({ label, value, emphasis = false, muted = false }) {
  return <div className={'flex items-center justify-between gap-4 border-b border-slate-100 py-3 text-sm ' + (emphasis ? 'font-semibold text-slate-900' : muted ? 'text-slate-500' : 'text-slate-700')}><span>{label}</span><span className="shrink-0 tabular-nums">{money(value)}</span></div>;
}
function TableHead({ children }) { return <th className="whitespace-nowrap px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">{children}</th>; }

export default function VirtualAccountantPage() {
  const { can } = useAuth();
  const [period, setPeriod] = useState('this_month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [openEntries, setOpenEntries] = useState({});
  const [manualOpen, setManualOpen] = useState(false);
  const [manualTemplate, setManualTemplate] = useState('investment');
  const [manualDate, setManualDate] = useState(todayPakistan());
  const [manualNarration, setManualNarration] = useState('');
  const [manualLines, setManualLines] = useState(() => templateLines('investment'));
  const [manualBusy, setManualBusy] = useState(false);
  const [manualError, setManualError] = useState('');
  const [manualNotice, setManualNotice] = useState('');

  const query = { period, ...(period === 'custom' ? { from, to } : {}) };
  const { data, loading, error, reload } = useApi(() => accountantApi.report(query), [period, from, to]);
  const report = data || {};
  const p = report.incomeStatement || {};
  const sales = p.sales || {};
  const moneyValue = (v) => v == null ? 'Hidden' : money(v);
  const toggle = (id) => setOpenEntries((old) => ({ ...old, [id]: !old[id] }));
  const manualDebit = manualLines.reduce((sum, row) => sum + (Number(row.debit) || 0), 0);
  const manualCredit = manualLines.reduce((sum, row) => sum + (Number(row.credit) || 0), 0);
  const updateManualLine = (index, key, value) => setManualLines((old) => {
    const next = old.map((row, i) => {
      if (i !== index) return row;
      const updated = { ...row, [key]: value };
      if (key === 'debit' && Number(value) > 0) updated.credit = '';
      if (key === 'credit' && Number(value) > 0) updated.debit = '';
      return updated;
    });
    // Quick templates contain two sides of the same transaction: enter the amount once.
    if (old.length === 2 && (key === 'debit' || key === 'credit')) {
      const other = index === 0 ? 1 : 0;
      const matchingSide = key === 'debit' ? 'credit' : 'debit';
      next[other] = { ...next[other], [matchingSide]: value, [key]: '' };
    }
    return next;
  });
  const chooseManualAccount = (index, value) => setManualLines((old) => old.map((row, i) => {
    if (i !== index) return row;
    if (value === '__custom__') return { ...row, account: '', custom: true };
    const found = accountOptions.find((option) => option.account === value);
    return { ...row, account: value, accountType: found?.accountType || row.accountType, custom: false };
  }));
  const saveManualEntry = async () => {
    setManualError('');
    if (!manualDate || manualNarration.trim().length < 2) { setManualError('Date aur description zaroor fill karein.'); return; }
    if (manualLines.some((row) => !row.account.trim() || ((Number(row.debit) > 0) === (Number(row.credit) > 0)))) {
      setManualError('Har line mein account aur sirf Debit ya Credit amount enter karein.'); return;
    }
    if (Math.abs(manualDebit - manualCredit) >= 0.005) { setManualError('Total Debit aur Credit barabar hone chahiye.'); return; }
    setManualBusy(true);
    try {
      await accountantApi.createEntry({
        date: manualDate, narration: manualNarration.trim(),
        lines: manualLines.map((row) => ({
          account: row.account.trim(), accountType: row.accountType,
          debit: Number(row.debit) || 0, credit: Number(row.credit) || 0,
          note: row.note.trim() || undefined,
        })),
      });
      setManualOpen(false);
      setManualNarration('');
      setManualTemplate('investment');
      setManualLines(templateLines('investment'));
      setManualNotice('Manual journal entry save ho gayi.');
      await reload();
    } catch (e) {
      setManualError(e.details?.[0]?.message || e.message || 'Entry save nahi ho saki.');
    } finally { setManualBusy(false); }
  };


  return <div className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-indigo-600">Automated bookkeeping</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Virtual Accountant</h1><p className="mt-1 text-sm text-slate-500">Automatic business activity plus your own journal entries, month-end balances and income statement.</p></div>
      <div className="flex flex-wrap items-center gap-2"><select aria-label="Accounting period" className={fieldClass} value={period} onChange={(e)=>setPeriod(e.target.value)}>{Object.entries(periodNames).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select><Button variant="secondary" icon={RefreshCw} onClick={reload} disabled={loading}>Refresh</Button></div>
    </div>
    {period === 'custom' && <Card><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-medium text-slate-600">From (Pakistan date)<input type="date" className={fieldClass + ' mt-1.5 block w-full'} value={from} onChange={(e)=>setFrom(e.target.value)}/></label><label className="text-xs font-medium text-slate-600">To (Pakistan date)<input type="date" className={fieldClass + ' mt-1.5 block w-full'} value={to} onChange={(e)=>setTo(e.target.value)}/></label></div></Card>}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-base font-semibold text-slate-900">Manual general journal</h2><p className="mt-1 text-xs text-slate-500">Investment, assets, income, expenses, loans aur custom entries yahan record karein.</p></div>
      {can('finance.create') && <Button icon={Plus} onClick={() => { setManualError(''); setManualNotice(''); setManualOpen((v) => !v); }}>{manualOpen ? 'Close entry' : 'New journal entry'}</Button>}
    </div>
    {manualNotice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">{manualNotice}</div>}
    {manualOpen && <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-900">Create journal entry</h3><p className="mt-1 text-xs text-slate-500">Quick template mein amount ek side par enter karein; doosri side automatically balance ho jayegi. Custom mein apni multiple lines add karein.</p></div>
        <div className="w-full sm:w-56"><select aria-label="Entry template" className={fieldClass + ' w-full'} value={manualTemplate} onChange={(e) => { setManualTemplate(e.target.value); setManualLines(templateLines(e.target.value)); }}><option value="investment">Owner investment</option><option value="expense">Business expense</option><option value="revenue">Other revenue</option><option value="asset">Asset purchase</option><option value="loan">Loan received</option><option value="withdrawal">Owner withdrawal</option><option value="custom">Custom journal</option></select></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium text-slate-600">Entry date<input type="date" className={fieldClass + ' mt-1.5 block w-full'} value={manualDate} onChange={(e) => setManualDate(e.target.value)}/></label>
        <label className="text-xs font-medium text-slate-600">Particular / description<input className={fieldClass + ' mt-1.5 block w-full'} maxLength={300} placeholder="e.g. Owner invested PKR 100,000" value={manualNarration} onChange={(e) => setManualNarration(e.target.value)}/></label>
      </div>
      <div className="mt-4 space-y-3">
        {manualLines.map((row, index) => <div key={index} className="rounded-xl border border-slate-200 p-3">
          <div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold text-slate-700">Journal line {index + 1}</span><button type="button" className="inline-flex items-center gap-1 text-xs text-rose-600 disabled:opacity-40" disabled={manualLines.length <= 2} onClick={() => setManualLines((old) => old.filter((_, i) => i !== index))}><Trash2 className="h-3.5 w-3.5"/>Remove</button></div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <label className="text-xs text-slate-600 xl:col-span-2">Particular / account
              <select className={fieldClass + ' mt-1 block w-full'} value={row.custom ? '__custom__' : row.account} onChange={(e) => chooseManualAccount(index, e.target.value)}>
                <optgroup label="Assets">{accountOptions.filter((a) => a.accountType === 'asset').map((a) => <option key={a.account} value={a.account}>{a.account}</option>)}</optgroup>
                <optgroup label="Liabilities">{accountOptions.filter((a) => a.accountType === 'liability').map((a) => <option key={a.account} value={a.account}>{a.account}</option>)}</optgroup>
                <optgroup label="Owner equity">{accountOptions.filter((a) => a.accountType === 'equity').map((a) => <option key={a.account} value={a.account}>{a.account}</option>)}</optgroup>
                <optgroup label="Income">{accountOptions.filter((a) => a.accountType === 'income').map((a) => <option key={a.account} value={a.account}>{a.account}</option>)}</optgroup>
                <optgroup label="Expenses">{accountOptions.filter((a) => a.accountType === 'expense').map((a) => <option key={a.account} value={a.account}>{a.account}</option>)}</optgroup>
                <option value="__custom__">+ Custom account</option>
              </select>
              {row.custom && <input className={fieldClass + ' mt-2 block w-full'} placeholder="Custom account name" value={row.account} onChange={(e) => updateManualLine(index, 'account', e.target.value)}/>}
            </label>
            <label className="text-xs text-slate-600">Account type<select className={fieldClass + ' mt-1 block w-full'} value={row.accountType} onChange={(e) => updateManualLine(index, 'accountType', e.target.value)}>{accountTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="text-xs text-slate-600">Debit (PKR)<input type="number" min="0" step="0.01" inputMode="decimal" className={fieldClass + ' mt-1 block w-full'} value={row.debit} onChange={(e) => updateManualLine(index, 'debit', e.target.value)} placeholder="0.00"/></label>
            <label className="text-xs text-slate-600">Credit (PKR)<input type="number" min="0" step="0.01" inputMode="decimal" className={fieldClass + ' mt-1 block w-full'} value={row.credit} onChange={(e) => updateManualLine(index, 'credit', e.target.value)} placeholder="0.00"/></label>
          </div>
          <label className="mt-2 block text-xs text-slate-600">Line note (optional)<input className={fieldClass + ' mt-1 block w-full'} maxLength={200} value={row.note} onChange={(e) => updateManualLine(index, 'note', e.target.value)} placeholder="Extra detail"/></label>
        </div>)}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" size="sm" icon={Plus} onClick={() => setManualLines((old) => [...old, { account: '', accountType: 'expense', custom: true, debit: '', credit: '', note: '' }])}>Add line</Button>
        <div className="text-right text-xs font-semibold text-slate-700">Debit: {money(manualDebit)} <span className="mx-2 text-slate-300">|</span> Credit: {money(manualCredit)}
          <p className={Math.abs(manualDebit - manualCredit) < 0.005 && manualDebit > 0 ? 'mt-1 text-emerald-700' : 'mt-1 text-amber-700'}>{Math.abs(manualDebit - manualCredit) < 0.005 && manualDebit > 0 ? 'Balanced' : 'Difference: ' + money(Math.abs(manualDebit - manualCredit))}</p>
        </div>
      </div>
      {manualError && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{manualError}</p>}
      <div className="mt-4 flex justify-end gap-2"><Button variant="secondary" onClick={() => setManualOpen(false)}>Cancel</Button><Button icon={Save} onClick={saveManualEntry} disabled={manualBusy || Math.abs(manualDebit - manualCredit) >= 0.005 || manualDebit <= 0}>{manualBusy ? 'Saving…' : 'Save journal entry'}</Button></div>
    </Card>}

    <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs leading-5 text-indigo-900"><strong>Automatic + manual ledger:</strong> existing sales, payments, refunds and Finance expenses remain automatically generated and read-only here. Your manual journal entries are stored separately and never change orders or payments.</div>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error.message || 'Accountant report could not be loaded.'} <button className="ml-2 underline" onClick={reload}>Try again</button></div>}
    {loading && !data ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[0,1,2,3].map((x)=><div key={x} className="h-28 animate-pulse rounded-2xl bg-slate-100"/>)}</div> : data && <>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>{periodNames[report.range?.key] || 'Selected period'} · {report.range?.from} to {report.range?.to} · Asia/Karachi</span><span className={'rounded-full px-3 py-1 font-semibold ' + (report.journalBalanced ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>{report.journalBalanced ? 'Journal balanced' : 'Journal needs review'}</span></div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric icon={Wallet} label="Net revenue" value={money(sales.netRevenue)} note={numberText(sales.orderCount) + ' orders in selected period'}/>
        <Metric icon={Calculator} label="Gross profit" value={moneyValue(p.grossProfit)} note={p.profitEstimate ? 'Estimate: some product costs are missing' : 'After refunds and cost of goods'}/>
        <Metric icon={Wallet} label="Net operating profit" value={moneyValue(p.netProfit)} note="After recorded operating expenses"/>
        <Metric icon={Scale} label="Payments received" value={money(p.paymentsReceived)} note={'Receivables: ' + money(p.receivables)}/>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric icon={Wallet} label="Owner investment (period)" value={money(report.manualSummary?.investment)} note={'Investment to date: ' + money(report.manualSummary?.investmentToDate)}/>
        <Metric icon={Scale} label="Assets at period end" value={money(report.balanceSheet?.assets?.total)} note="Posted manual-ledger asset balances"/>
        <Metric icon={Scale} label="Liabilities at period end" value={money(report.balanceSheet?.liabilities?.total)} note="Posted manual-ledger liabilities"/>
        <Metric icon={Calculator} label="Owner equity at period end" value={money(report.balanceSheet?.equity?.total)} note="Posted manual-ledger equity balances"/>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-2">
          <div className="mb-2 flex items-center gap-2"><BookOpen className="h-4 w-4 text-indigo-600"/><h2 className="text-base font-semibold text-slate-900">Income statement</h2></div>
          <p className="mb-3 text-xs text-slate-500">Accrual view · orders placed in this period</p>
          <StatementRow label="Product sales" value={sales.productSales}/>
          <StatementRow label="Less: discounts allowed" value={-(sales.discounts || 0)} muted/>
          <StatementRow label="Delivery income" value={sales.deliveryIncome}/>
          <StatementRow label="Gross revenue after discount" value={sales.grossRevenue} emphasis/>
          <StatementRow label="Less: refunds" value={-(sales.refunds || 0)} muted/>
          <StatementRow label="Net revenue" value={sales.netRevenue} emphasis/>
          <StatementRow label="Cost of goods sold" value={p.costOfGoodsSold == null ? null : -p.costOfGoodsSold} muted/>
          <StatementRow label="Gross profit" value={p.grossProfit} emphasis/>
          <StatementRow label="Other income (manual)" value={p.otherIncome || 0}/>
          <StatementRow label="Manual journal expenses" value={-(p.manualExpenses || 0)} muted/>
          <StatementRow label="Operating expenses (including manual)" value={-(p.operatingExpenses || 0)} muted/>
          <StatementRow label="Net operating profit" value={p.netProfit} emphasis/>
          {p.missingCost > 0 && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-900">{numberText(p.missingCost)} order line(s) have no cost price. Profit is an estimate until these product costs are entered.</p>}
        </Card>
        <Card className="xl:col-span-3">
          <div className="mb-2"><h2 className="text-base font-semibold text-slate-900">Monthly sales & expenses</h2><p className="mt-1 text-xs text-slate-500">Last 12 months · sales are based on order placement dates</p></div>
          <div className="h-[330px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.monthlyTrend || []} margin={{ top: 10, right: 10, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="#e8eaf0" vertical={false}/>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} minTickGap={18}/>
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} width={44} tickFormatter={(v)=>v>=1000?Math.round(v/1000)+'k':v}/>
                <Tooltip formatter={(v,k)=>[money(v), k === 'bookedRevenue' ? 'Booked sales' : 'Expenses']}/>
                <Legend wrapperStyle={{ fontSize: 11 }}/>
                <Bar dataKey="bookedRevenue" name="Booked sales" fill="#7357ff" radius={[5,5,0,0]}/>
                <Bar dataKey="expenses" name="Expenses" fill="#f59e0b" radius={[5,5,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-base font-semibold text-slate-900">Month-end balances</h2>
        <p className="mt-1 text-xs text-slate-500">Closing balances through {report.range?.to}. These totals use manual journal entries, including any opening balances you record.</p>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          {[
            ['Assets', report.balanceSheet?.assets],
            ['Liabilities', report.balanceSheet?.liabilities],
            ['Owner equity', report.balanceSheet?.equity],
          ].map(([label, group]) => <div key={label} className="rounded-xl bg-slate-50 p-3">
            <div className="flex justify-between gap-2 text-sm font-semibold text-slate-800"><span>{label}</span><span>{money(group?.total)}</span></div>
            <div className="mt-2 space-y-1">{(group?.accounts || []).map((account) => <div key={account.account} className="flex justify-between gap-2 text-xs text-slate-600"><span>{account.account}</span><span className="tabular-nums">{money(account.balance)}</span></div>)}</div>
          </div>)}
        </div>
        <p className="mt-3 text-[11px] leading-5 text-slate-500">Note: existing assets, cash and liabilities from before you start using this journal should be entered once as opening balances. Do not enter the same order or expense again if it is already recorded automatically.</p>
      </Card>
      <Card padded={false}>
        <div className="border-b border-slate-100 px-4 py-4 sm:px-5"><h2 className="text-base font-semibold text-slate-900">General journal</h2><p className="mt-1 text-xs text-slate-500">Each recorded business event appears as a balanced debit / credit entry. Select a row to inspect its accounts.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-xs"><thead className="bg-slate-50"><tr><TableHead>Date / time</TableHead><TableHead>Reference</TableHead><TableHead>Description</TableHead><TableHead>Source</TableHead><TableHead>Debit</TableHead><TableHead>Credit</TableHead><TableHead>Details</TableHead></tr></thead>
          <tbody>{(report.journal || []).map((entry,index)=><tr key={entry.source + '-' + entry.reference + '-' + index} className="border-b border-slate-100">
            <td className="px-3 py-3 whitespace-nowrap text-slate-600">{dateTime(entry.date)}</td><td className="px-3 py-3 font-semibold text-slate-800">{entry.reference}</td><td className="px-3 py-3 text-slate-700">{entry.narration}</td><td className="px-3 py-3 capitalize text-slate-500">{entry.source}</td><td className="px-3 py-3 tabular-nums">{money(entry.debit)}</td><td className="px-3 py-3 tabular-nums">{money(entry.credit)}</td><td className="px-3 py-3"><button className="font-semibold text-indigo-600 underline" onClick={()=>toggle(index)}>{openEntries[index] ? 'Hide' : 'View'}</button></td>
          </tr>)}
          </tbody></table>
          {(report.journal || []).map((entry,index)=>openEntries[index] && <div key={'lines-'+index} className="border-b border-indigo-100 bg-indigo-50/50 px-4 py-3"><p className="mb-2 text-xs font-semibold text-slate-700">{entry.reference} · {entry.narration}</p><div className="grid gap-2 sm:grid-cols-2">{entry.lines.map((line,i)=><div key={line.account + i} className="flex justify-between gap-3 rounded-lg bg-white px-3 py-2 text-xs"><span className="text-slate-600">{line.account}</span><span className="shrink-0 font-medium tabular-nums text-slate-900">{line.debit ? 'Dr ' + money(line.debit) : 'Cr ' + money(line.credit)}</span></div>)}</div></div>)}
          {(!report.journal || report.journal.length===0) && <p className="p-8 text-center text-sm text-slate-500">No journal entries in this period yet.</p>}
        </div>
        <div className="flex flex-wrap justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs font-semibold text-slate-700"><span>{numberText(report.journalCount)} journal entries ({numberText(report.manualJournalCount)} manual){report.truncated ? ' (view capped at 3,000 orders)' : ''}</span><span>Debits {money(report.journalTotals?.debit)} · Credits {money(report.journalTotals?.credit)}</span></div>
      </Card>

      <Card padded={false}>
        <div className="border-b border-slate-100 px-4 py-4 sm:px-5"><h2 className="text-base font-semibold text-slate-900">Trial balance</h2><p className="mt-1 text-xs text-slate-500">Total debits should equal total credits for the selected period.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-xs"><thead className="bg-slate-50"><tr><TableHead>Account</TableHead><TableHead>Debit</TableHead><TableHead>Credit</TableHead><TableHead>Net balance (Dr / Cr)</TableHead></tr></thead><tbody>{(report.trialBalance || []).map((account)=><tr key={account.account} className="border-b border-slate-100"><td className="px-3 py-3 font-medium text-slate-800">{account.account}</td><td className="px-3 py-3 tabular-nums">{money(account.debit)}</td><td className="px-3 py-3 tabular-nums">{money(account.credit)}</td><td className="px-3 py-3 tabular-nums">{account.balance >= 0 ? 'Dr ' : 'Cr '}{money(Math.abs(account.balance))}</td></tr>)}</tbody></table>{(!report.trialBalance || report.trialBalance.length===0) && <p className="p-7 text-center text-sm text-slate-500">Trial balance will appear when financial activity is recorded.</p>}</div>
      </Card>
      <Card><h2 className="text-sm font-semibold text-slate-800">Accountant notes & limits</h2><ul className="mt-2 space-y-2 text-xs leading-5 text-slate-600">{(report.accountingNotes || []).map((note,i)=><li key={i}>• {note}</li>)}</ul><p className="mt-3 border-t border-slate-100 pt-3 text-[11px] text-slate-500">This is an operational bookkeeping report, not a tax filing, audited statement or connected bank ledger. Payment accounts are classified from the payment method stored with each order.</p></Card>
    </>}
  </div>;
}

function numberText(value) { return Number(value || 0).toLocaleString('en'); }
