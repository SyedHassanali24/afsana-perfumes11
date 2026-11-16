import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BookOpen, Calculator, RefreshCw, Scale, Wallet } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import useApi from '../../src/hooks/useApi';
import { accountantApi } from '../../src/services';

const money = (value) => 'PKR ' + Number(value || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 });
const dateTime = (value) => value ? new Date(value).toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' }) : '—';
const fieldClass = 'min-h-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';
const periodNames = { this_month: 'This month', last_month: 'Last month', last_30: 'Last 30 days', this_year: 'This year', custom: 'Custom range' };

function Metric({ label, value, note, icon: Icon }) {
  return <Card><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{value}</p>{note && <p className="mt-1 text-[11px] text-slate-500">{note}</p>}</div><span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Icon className="h-4 w-4"/></span></div></Card>;
}
function StatementRow({ label, value, emphasis = false, muted = false }) {
  return <div className={'flex items-center justify-between gap-4 border-b border-slate-100 py-3 text-sm ' + (emphasis ? 'font-semibold text-slate-900' : muted ? 'text-slate-500' : 'text-slate-700')}><span>{label}</span><span className="shrink-0 tabular-nums">{money(value)}</span></div>;
}
function TableHead({ children }) { return <th className="whitespace-nowrap px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">{children}</th>; }

export default function VirtualAccountantPage() {
  const [period, setPeriod] = useState('this_month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [openEntries, setOpenEntries] = useState({});
  const query = { period, ...(period === 'custom' ? { from, to } : {}) };
  const { data, loading, error, reload } = useApi(() => accountantApi.report(query), [period, from, to]);
  const report = data || {};
  const p = report.incomeStatement || {};
  const sales = p.sales || {};
  const moneyValue = (v) => v == null ? 'Hidden' : money(v);
  const toggle = (id) => setOpenEntries((old) => ({ ...old, [id]: !old[id] }));

  return <div className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-indigo-600">Automated bookkeeping</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Virtual Accountant</h1><p className="mt-1 text-sm text-slate-500">Sales, payments, refunds and expenses assembled into a general journal and income statement.</p></div>
      <div className="flex flex-wrap items-center gap-2"><select aria-label="Accounting period" className={fieldClass} value={period} onChange={(e)=>setPeriod(e.target.value)}>{Object.entries(periodNames).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select><Button variant="secondary" icon={RefreshCw} onClick={reload} disabled={loading}>Refresh</Button></div>
    </div>
    {period === 'custom' && <Card><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-medium text-slate-600">From (Pakistan date)<input type="date" className={fieldClass + ' mt-1.5 block w-full'} value={from} onChange={(e)=>setFrom(e.target.value)}/></label><label className="text-xs font-medium text-slate-600">To (Pakistan date)<input type="date" className={fieldClass + ' mt-1.5 block w-full'} value={to} onChange={(e)=>setTo(e.target.value)}/></label></div></Card>}
    <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs leading-5 text-indigo-900"><strong>Read-only auto-ledger:</strong> this page derives journal entries from existing sales, recorded payments, refunds and expenses. It does not place payments, alter orders, or post data back to your books.</div>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error.message || 'Accountant report could not be loaded.'} <button className="ml-2 underline" onClick={reload}>Try again</button></div>}
    {loading && !data ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[0,1,2,3].map((x)=><div key={x} className="h-28 animate-pulse rounded-2xl bg-slate-100"/>)}</div> : data && <>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>{periodNames[report.range?.key] || 'Selected period'} · {report.range?.from} to {report.range?.to} · Asia/Karachi</span><span className={'rounded-full px-3 py-1 font-semibold ' + (report.journalBalanced ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>{report.journalBalanced ? 'Journal balanced' : 'Journal needs review'}</span></div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric icon={Wallet} label="Net revenue" value={money(sales.netRevenue)} note={numberText(sales.orderCount) + ' orders in selected period'}/>
        <Metric icon={Calculator} label="Gross profit" value={moneyValue(p.grossProfit)} note={p.profitEstimate ? 'Estimate: some product costs are missing' : 'After refunds and cost of goods'}/>
        <Metric icon={Wallet} label="Net operating profit" value={moneyValue(p.netProfit)} note="After recorded operating expenses"/>
        <Metric icon={Scale} label="Payments received" value={money(p.paymentsReceived)} note={'Receivables: ' + money(p.receivables)}/>
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
          <StatementRow label="Operating expenses" value={-(p.operatingExpenses || 0)} muted/>
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
        <div className="flex flex-wrap justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs font-semibold text-slate-700"><span>{numberText(report.journalCount)} journal entries{report.truncated ? ' (view capped at 3,000 orders)' : ''}</span><span>Debits {money(report.journalTotals?.debit)} · Credits {money(report.journalTotals?.credit)}</span></div>
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
