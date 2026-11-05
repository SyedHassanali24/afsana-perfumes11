import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, RefreshCw, Users, MousePointerClick, ShoppingBag, Wallet, MessageCircle, Link2, Plus, Pencil, CheckCircle2, AlertCircle } from "lucide-react";
import Card from "../components/Card";
import Button from "../components/Button";
import ConfirmPasswordModal from "../components/ConfirmPasswordModal";
import { Field, Input, Select, Check } from "../components/FormFields";
import { useAuth } from "../../src/auth/AuthContext";
import { growthApi } from "../../src/services";

const money = (value) => "PKR " + Number(value || 0).toLocaleString("en-PK");
const number = (value) => Number(value || 0).toLocaleString("en");
const date = (value) => value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const statusTone = (status) => ({
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  payable: "bg-emerald-50 text-emerald-800 border-emerald-200",
  paid: "bg-blue-50 text-blue-800 border-blue-200",
  reversed: "bg-slate-100 text-slate-600 border-slate-200",
  clawback_due: "bg-rose-50 text-rose-700 border-rose-200",
  accepted: "bg-emerald-50 text-emerald-800 border-emerald-200",
  setup_required: "bg-amber-50 text-amber-800 border-amber-200",
  failed: "bg-rose-50 text-rose-700 border-rose-200",
})[status] || "bg-slate-100 text-slate-700 border-slate-200";

function Metric({ icon: Icon, label, value, detail }) {
  return <Card className="min-w-0">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-[#64748b]">{label}</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-[#172033] break-words">{value}</p>
        {detail && <p className="mt-1 text-[11px] text-[#64748b]">{detail}</p>}
      </div>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#4f46e5]/10 text-[#4f46e5]"><Icon className="h-4 w-4"/></span>
    </div>
  </Card>;
}

function SourceList({ rows = [] }) {
  if (!rows.length) return <p className="text-xs text-[#64748b]">Referral-link traffic will appear here as new visits arrive.</p>;
  const labels = { instagram:"Instagram", tiktok:"TikTok", youtube:"YouTube", facebook:"Facebook", whatsapp:"WhatsApp", search:"Search", direct:"Direct / unknown", email:"Email", other_social:"Other social", referral:"Other websites", other:"Other" };
  return <div className="space-y-2">{rows.map((row) => <div key={row.source} className="flex items-center justify-between gap-3 text-sm">
    <span className="text-[#475569]">{labels[row.source] || row.source}</span><strong className="tabular-nums text-[#172033]">{number(row.visits)}</strong>
  </div>)}</div>;
}

function CopyLine({ value, label = "Copy link" }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    catch { setCopied(false); }
  };
  return <div className="flex min-w-0 items-center gap-2">
    <code className="min-w-0 flex-1 break-all rounded-lg bg-[#f5f6fa] px-3 py-2 text-[11px] text-[#475569]">{value || "—"}</code>
    <button type="button" onClick={copy} disabled={!value} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#1e1b4b]/10 px-2.5 py-2 text-xs font-medium text-[#334155] hover:bg-slate-50 disabled:opacity-40"><Copy className="h-3.5 w-3.5"/>{copied ? "Copied" : label}</button>
  </div>;
}

const blankPartner = {
  name:"", code:"", platform:"instagram", handle:"", discountType:"percentage",
  discountValue:"10", maxDiscount:"", minOrder:"", commissionType:"percentage",
  commissionValue:"10", usageLimit:"", perCustomerLimit:"0",
};
const blankGrowth = {
  welcomeRewardEnabled:false, welcomeDiscountPercent:15, welcomeMaxDiscount:1000,
  welcomeMinOrder:0, welcomeValidityDays:30, commissionHoldDays:14,
  whatsappTemplateName:"afsana_first_purchase_reward", whatsappLanguage:"en",
};

export default function GrowthPage() {
  const { can, user } = useAuth();
  const isManager = can("referrals.view");
  const canPartners = can("referrals.create") || can("referrals.edit");
  const canCommissions = can("commissions.view");
  const canPay = can("commissions.edit");
  const canWhatsApp = can("whatsapp.view");
  const canRetryWhatsApp = can("whatsapp.edit");
  const canSettings = can("settings.view");
  const canEditSettings = can("settings.edit");
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [self, setSelf] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [commissions, setCommissions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [config, setConfig] = useState(blankGrowth);
  const [partnerForm, setPartnerForm] = useState(blankPartner);
  const [selected, setSelected] = useState(null);
  const [editPartner, setEditPartner] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const tabs = useMemo(() => {
    const values = [{ id:"overview", label:"Overview" }];
    if (isManager) values.push({ id:"partners", label:"Partners & staff codes" });
    if (canCommissions) values.push({ id:"commissions", label:"Commission ledger" });
    if (canWhatsApp) values.push({ id:"whatsapp", label:"WhatsApp rewards" });
    if (canSettings) values.push({ id:"settings", label:"Reward settings" });
    return values;
  }, [isManager, canCommissions, canWhatsApp, canSettings]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      if (isManager) {
        const results = await Promise.all([
          growthApi.dashboard(),
          canCommissions ? growthApi.commissions() : Promise.resolve({ commissions:[] }),
          canWhatsApp ? growthApi.whatsapp() : Promise.resolve({ messages:[] }),
          canSettings ? growthApi.config() : Promise.resolve({ config:blankGrowth }),
        ]);
        setDashboard(results[0]);
        setCommissions(results[1].commissions || []);
        setMessages(results[2].messages || []);
        setConfig({ ...blankGrowth, ...(results[3].config || {}) });
      } else {
        const result = await growthApi.me();
        setSelf(result);
      }
    } catch (err) { setError(err.message || "Growth analytics could not be loaded."); }
    finally { setLoading(false); }
  }, [isManager, canCommissions, canWhatsApp, canSettings]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!tabs.some((item) => item.id === tab)) setTab("overview"); }, [tabs, tab]);

  const flash = (message) => { setNotice(message); window.setTimeout(() => setNotice(""), 4500); };
  const askPassword = (title, message, confirmLabel, callback) => setConfirm({ title, message, confirmLabel, callback });
  const submitPartner = (event) => {
    event.preventDefault();
    setError("");
    const body = {
      ...partnerForm,
      discountValue:Number(partnerForm.discountValue || 0),
      maxDiscount:partnerForm.maxDiscount === "" ? undefined : Number(partnerForm.maxDiscount),
      minOrder:Number(partnerForm.minOrder || 0),
      commissionValue:Number(partnerForm.commissionValue || 0),
      usageLimit:partnerForm.usageLimit === "" ? undefined : Number(partnerForm.usageLimit),
      perCustomerLimit:Number(partnerForm.perCustomerLimit || 0),
    };
    askPassword("Confirm new influencer", "The referral code and reward terms will be added to Afsana.", "Create partner", async (password) => {
      setBusy(true);
      try {
        await growthApi.createPartner({ ...body, confirmPassword:password });
        setPartnerForm(blankPartner); flash("Influencer code created."); await load();
      } finally { setBusy(false); }
    });
  };
  const submitEditPartner = (event) => {
    event.preventDefault();
    if (!editPartner) return;
    const body = {
      name:editPartner.name, platform:editPartner.platform, handle:editPartner.handle,
      discountType:editPartner.discountType, discountValue:Number(editPartner.discountValue || 0),
      maxDiscount:editPartner.maxDiscount === "" ? undefined : Number(editPartner.maxDiscount),
      minOrder:Number(editPartner.minOrder || 0), commissionType:editPartner.commissionType,
      commissionValue:Number(editPartner.commissionValue || 0), isActive:!!editPartner.isActive,
    };
    askPassword("Confirm partner changes", "Changes apply to future orders. Existing order commission snapshots remain unchanged.", "Save changes", async (password) => {
      setBusy(true);
      try { await growthApi.updatePartner(editPartner.id, { ...body, confirmPassword:password }); setEditPartner(null); flash("Partner settings saved."); await load(); }
      finally { setBusy(false); }
    });
  };
  const submitConfig = (event) => {
    event.preventDefault();
    askPassword("Confirm welcome reward settings", "This controls future first-purchase rewards and commission hold periods.", "Save settings", async (password) => {
      setBusy(true);
      try {
        const next = {
          ...config,
          welcomeDiscountPercent:Number(config.welcomeDiscountPercent),
          welcomeMaxDiscount:Number(config.welcomeMaxDiscount),
          welcomeMinOrder:Number(config.welcomeMinOrder),
          welcomeValidityDays:Number(config.welcomeValidityDays),
          commissionHoldDays:Number(config.commissionHoldDays),
          confirmPassword:password,
        };
        const result = await growthApi.saveConfig(next);
        setConfig({ ...blankGrowth, ...(result.config || {}) }); flash("Growth settings saved.");
      } finally { setBusy(false); }
    });
  };
  const pay = (commission) => askPassword("Confirm commission payout", "Mark this commission as paid only after the payout has actually been sent.", "Mark as paid", async (password) => {
    setBusy(true);
    try { await growthApi.payCommission(commission.id, { reference:"", confirmPassword:password }); flash("Commission payout recorded."); await load(); }
    finally { setBusy(false); }
  });
  const retry = (message) => askPassword("Retry WhatsApp reward", "The message will be submitted to the configured WhatsApp Business API.", "Retry delivery", async (password) => {
    setBusy(true);
    try { await growthApi.retryWhatsapp(message.id, password); flash("WhatsApp retry submitted."); await load(); }
    finally { setBusy(false); }
  });

  const selfPartner = self?.partner;
  const own = self?.metrics || {};
  const totals = dashboard?.totals || {};
  const partnerRows = dashboard?.partners || [];

  if (loading && !dashboard && !self) return <div className="space-y-4"><div className="h-8 w-64 animate-pulse rounded bg-slate-100"/><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[0,1,2,3].map((x)=><div key={x} className="h-28 animate-pulse rounded-2xl bg-slate-100"/>)}</div></div>;

  return <div className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#8a6b39]">Afsana growth system</p>
        <h1 className="mt-1 font-display text-2xl text-[#182308]">Growth & referrals</h1>
        <p className="mt-1 text-sm text-[#5f654f]">{isManager ? "Influencer, sales-staff and reward performance in one place." : "Your referral performance and personal sales attribution."}</p>
      </div>
      <Button type="button" variant="secondary" icon={RefreshCw} onClick={load} disabled={loading}>Refresh</Button>
    </div>
    {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{notice}</p>}
    {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><span>{error}</span><button type="button" onClick={load} className="underline">Retry</button></div>}
    <div className="flex flex-wrap gap-2 border-b border-[#1e1b4b]/10 pb-3">
      {tabs.map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)} className={"rounded-xl px-3.5 py-2 text-sm font-medium transition " + (tab === item.id ? "bg-[#17183f] text-white" : "bg-white text-[#64748b] hover:bg-slate-50")}>{item.label}</button>)}
    </div>

    {tab === "overview" && (isManager ? <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={MousePointerClick} label="Referral visits" value={number(totals.visits)} detail="Unique first-touch sessions"/>
        <Metric icon={ShoppingBag} label="Paid orders" value={number(totals.orders)} detail={number(totals.linkOrders) + " link · " + number(totals.codeOrders) + " promo-code orders"}/>
        <Metric icon={Wallet} label="Net attributed revenue" value={money(totals.revenue)} detail={"Refunded " + money(totals.refunded || 0)}/>
        <Metric icon={Users} label="Active partners" value={number(partnerRows.filter((x) => x.partner.isActive).length)} detail={number(partnerRows.length) + " total partner records"}/>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <h2 className="font-display text-lg text-[#182308]">Commission position</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-amber-50 p-3"><p className="text-xs text-amber-800">Pending</p><strong className="mt-1 block text-lg text-amber-950">{money(totals.pending)}</strong></div>
            <div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs text-emerald-800">Ready to pay</p><strong className="mt-1 block text-lg text-emerald-950">{money(totals.payable)}</strong></div>
            <div className="rounded-xl bg-blue-50 p-3"><p className="text-xs text-blue-800">Paid out</p><strong className="mt-1 block text-lg text-blue-950">{money(totals.paid)}</strong></div>
            <div className="rounded-xl bg-rose-50 p-3"><p className="text-xs text-rose-800">Refund adjustments</p><strong className="mt-1 block text-lg text-rose-950">{money(totals.clawback + totals.reversed)}</strong></div>
          </div>
        </Card>
        <Card>
          <h2 className="font-display text-lg text-[#182308]">Traffic sources by partner link</h2>
          <div className="mt-4"><SourceList rows={dashboard?.sourceBreakdown || []}/></div>
        </Card>
        <Card>
          <h2 className="font-display text-lg text-[#182308]">Partner performance</h2>
          <div className="mt-3 space-y-3">
            {[...partnerRows].sort((a,b)=>(b.metrics.revenue||0)-(a.metrics.revenue||0)).slice(0,5).map((row) => <div key={row.partner.id} className="flex items-center justify-between gap-3 border-b border-[#1e1b4b]/5 pb-3 last:border-0">
              <div className="min-w-0"><p className="truncate text-sm font-medium text-[#172033]">{row.partner.name}</p><p className="text-[11px] text-[#64748b]">{row.partner.type} · {row.partner.code}</p></div>
              <div className="shrink-0 text-right"><p className="text-sm font-semibold text-[#172033]">{money(row.metrics.revenue)}</p><p className="text-[11px] text-[#64748b]">{number(row.metrics.orders)} orders</p></div>
            </div>)}
            {!partnerRows.length && <p className="text-sm text-[#64748b]">Create the first influencer or add staff referral codes by opening Growth.</p>}
          </div>
        </Card>
      </div>
    </> : <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={MousePointerClick} label="Your referral visits" value={number(own.visits)} detail="Unique sessions through your link"/>
        <Metric icon={ShoppingBag} label="Paid orders" value={number(own.orders)} detail={number(own.linkOrders || 0) + " via link · " + number(own.codeOrders || 0) + " via promo code"}/>
        <Metric icon={Wallet} label="Net attributed revenue" value={money(own.revenue)} detail={"Refunded " + money(own.refunded || 0)}/>
        <Metric icon={Wallet} label="Your commission" value={money((own.commission?.pending||0)+(own.commission?.payable||0)+(own.commission?.paid||0))} detail={"Paid " + money(own.commission?.paid || 0)}/>
      </div>
      <Card>
        <h2 className="font-display text-lg text-[#182308]">Your referral traffic sources</h2>
        <div className="mt-4"><SourceList rows={own.sourceBreakdown || []}/></div>
      </Card>
      {selfPartner ? <Card>
        <h2 className="font-display text-lg text-[#182308]">Your referral identity</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div><p className="mb-1 text-xs text-[#64748b]">Your code</p><p className="text-xl font-semibold tracking-wide text-[#172033]">{selfPartner.code}</p></div>
          <div><p className="mb-1 text-xs text-[#64748b]">Share this link</p><CopyLine value={selfPartner.referralUrl}/></div>
        </div>
        <p className="mt-3 text-xs text-[#64748b]">Only orders attributed to your code are counted here. Your sales figures and commission details are private to your login.</p>
      </Card> : <Card><p className="text-sm text-[#64748b]">A personal referral code has not been assigned to this staff profile yet. Open this page again after your staff profile is active, or ask the Owner.</p></Card>}
    </> )}

    {tab === "partners" && isManager && <div className="space-y-4">
      {canPartners && <Card>
        <div className="mb-4"><h2 className="font-display text-lg text-[#182308]">Add influencer</h2><p className="mt-1 text-xs text-[#64748b]">Staff codes are created automatically. Add influencers here and assign their discount and commission terms.</p></div>
        <form onSubmit={submitPartner} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Influencer name"><Input required minLength={2} value={partnerForm.name} onChange={(e)=>setPartnerForm((v)=>({...v,name:e.target.value}))}/></Field>
          <Field label="Unique promo code"><Input required minLength={3} maxLength={30} value={partnerForm.code} onChange={(e)=>setPartnerForm((v)=>({...v,code:e.target.value.toUpperCase().replace(/\s/g,"-")}))} placeholder="AFSANA-ALI"/></Field>
          <Field label="Platform"><Select value={partnerForm.platform} onChange={(e)=>setPartnerForm((v)=>({...v,platform:e.target.value}))}><option value="instagram">Instagram</option><option value="tiktok">TikTok</option><option value="youtube">YouTube</option><option value="facebook">Facebook</option><option value="other">Other</option></Select></Field>
          <Field label="Handle / profile"><Input value={partnerForm.handle} onChange={(e)=>setPartnerForm((v)=>({...v,handle:e.target.value}))} placeholder="@username"/></Field>
          <Field label="Customer discount"><Select value={partnerForm.discountType} onChange={(e)=>setPartnerForm((v)=>({...v,discountType:e.target.value}))}><option value="none">No discount (tracking only)</option><option value="percentage">Percent off</option><option value="fixed">Fixed PKR off</option><option value="free_shipping">Free shipping</option></Select></Field>
          <Field label="Discount value"><Input type="number" min="0" value={partnerForm.discountValue} onChange={(e)=>setPartnerForm((v)=>({...v,discountValue:e.target.value}))} disabled={partnerForm.discountType==="none"||partnerForm.discountType==="free_shipping"}/></Field>
          <Field label="Maximum discount (PKR)"><Input type="number" min="0" value={partnerForm.maxDiscount} onChange={(e)=>setPartnerForm((v)=>({...v,maxDiscount:e.target.value}))}/></Field>
          <Field label="Minimum order (PKR)"><Input type="number" min="0" value={partnerForm.minOrder} onChange={(e)=>setPartnerForm((v)=>({...v,minOrder:e.target.value}))}/></Field>
          <Field label="Commission type"><Select value={partnerForm.commissionType} onChange={(e)=>setPartnerForm((v)=>({...v,commissionType:e.target.value}))}><option value="percentage">Percentage of net merchandise</option><option value="fixed">Fixed per paid order</option></Select></Field>
          <Field label="Commission value"><Input type="number" min="0" value={partnerForm.commissionValue} onChange={(e)=>setPartnerForm((v)=>({...v,commissionValue:e.target.value}))}/></Field>
          <Field label="Total code uses (optional)"><Input type="number" min="1" value={partnerForm.usageLimit} onChange={(e)=>setPartnerForm((v)=>({...v,usageLimit:e.target.value}))}/></Field>
          <Field label="Uses per customer"><Input type="number" min="0" value={partnerForm.perCustomerLimit} onChange={(e)=>setPartnerForm((v)=>({...v,perCustomerLimit:e.target.value}))}/></Field>
          <div className="sm:col-span-2 xl:col-span-4"><Button type="submit" icon={Plus} disabled={busy || !can("referrals.create")}>Create influencer code</Button></div>
        </form>
      </Card>}
      <Card padded={false}>
        <div className="border-b border-[#1e1b4b]/10 p-4 sm:p-5"><h2 className="font-display text-lg text-[#182308]">Influencer and sales-staff codes</h2><p className="mt-1 text-xs text-[#64748b]">Revenue is net of recorded refunds. Staff records are generated from Staff & roles.</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-xs">
            <thead className="bg-slate-50 text-[#64748b]"><tr>{["Partner","Code / link","Visits","Paid orders","Net revenue","Commission","Status",""].map((t)=><th key={t} className="px-4 py-3 font-medium">{t}</th>)}</tr></thead>
            <tbody>{partnerRows.map((row)=><tr key={row.partner.id} className="border-t border-[#1e1b4b]/5 align-top">
              <td className="px-4 py-3"><p className="font-semibold text-[#172033]">{row.partner.name}</p><p className="mt-1 capitalize text-[10px] text-[#64748b]">{row.partner.type}</p></td>
              <td className="px-4 py-3"><p className="font-medium text-[#172033]">{row.partner.code}</p><a className="mt-1 inline-block max-w-[220px] break-all text-[10px] text-[#4f46e5] underline" href={row.partner.referralUrl} target="_blank" rel="noreferrer">{row.partner.referralUrl}</a></td>
              <td className="px-4 py-3 tabular-nums">{number(row.metrics.visits)}</td>
              <td className="px-4 py-3 tabular-nums">{number(row.metrics.orders)}</td>
              <td className="px-4 py-3 font-semibold tabular-nums">{money(row.metrics.revenue)}</td>
              <td className="px-4 py-3 tabular-nums"><p>Pending {money(row.metrics.commission.pending)}</p><p className="mt-1">Payable {money(row.metrics.commission.payable)}</p><p className="mt-1">Paid {money(row.metrics.commission.paid)}</p></td>
              <td className="px-4 py-3"><span className={"rounded-full border px-2 py-1 text-[10px] " + (row.partner.isActive?"bg-emerald-50 text-emerald-700 border-emerald-200":"bg-slate-100 text-slate-600 border-slate-200")}>{row.partner.isActive?"Active":"Paused"}</span></td>
              <td className="px-4 py-3">{can("referrals.edit") && <button type="button" onClick={()=>setEditPartner({...row.partner,discountValue:String(row.partner.discountValue),maxDiscount:String(row.partner.maxDiscount||""),minOrder:String(row.partner.minOrder||0),commissionValue:String(row.partner.commissionValue),isActive:row.partner.isActive})} className="inline-flex items-center gap-1 rounded-lg border border-[#1e1b4b]/10 px-2.5 py-1.5 text-xs hover:bg-slate-50"><Pencil className="h-3 w-3"/>Edit</button>}</td>
            </tr>)}</tbody>
          </table>
          {!partnerRows.length && <p className="p-8 text-center text-sm text-[#64748b]">No referral partners yet.</p>}
        </div>
      </Card>
      {editPartner && <Card>
        <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-display text-lg text-[#182308]">Configure {editPartner.name}</h2><p className="text-xs text-[#64748b]">Code is fixed after its first use to preserve attribution history.</p></div><button type="button" onClick={()=>setEditPartner(null)} className="text-sm text-[#64748b] underline">Close</button></div>
        <form onSubmit={submitEditPartner} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Name"><Input value={editPartner.name} onChange={(e)=>setEditPartner((v)=>({...v,name:e.target.value}))}/></Field>
          <Field label="Code"><Input disabled value={editPartner.code}/></Field>
          <Field label="Discount type"><Select value={editPartner.discountType} onChange={(e)=>setEditPartner((v)=>({...v,discountType:e.target.value}))}><option value="none">Tracking only</option><option value="percentage">Percent</option><option value="fixed">Fixed PKR</option><option value="free_shipping">Free shipping</option></Select></Field>
          <Field label="Discount value"><Input type="number" value={editPartner.discountValue} onChange={(e)=>setEditPartner((v)=>({...v,discountValue:e.target.value}))}/></Field>
          <Field label="Max discount (PKR)"><Input type="number" value={editPartner.maxDiscount} onChange={(e)=>setEditPartner((v)=>({...v,maxDiscount:e.target.value}))}/></Field>
          <Field label="Minimum order (PKR)"><Input type="number" value={editPartner.minOrder} onChange={(e)=>setEditPartner((v)=>({...v,minOrder:e.target.value}))}/></Field>
          <Field label="Commission type"><Select value={editPartner.commissionType} onChange={(e)=>setEditPartner((v)=>({...v,commissionType:e.target.value}))}><option value="percentage">Percentage</option><option value="fixed">Fixed per order</option></Select></Field>
          <Field label="Commission value"><Input type="number" value={editPartner.commissionValue} onChange={(e)=>setEditPartner((v)=>({...v,commissionValue:e.target.value}))}/></Field>
          <div className="flex items-center"><Check label="Code active" checked={editPartner.isActive} onChange={(v)=>setEditPartner((x)=>({...x,isActive:v}))}/></div>
          <div className="sm:col-span-2 xl:col-span-4"><Button type="submit" disabled={busy}>Save partner settings</Button></div>
        </form>
      </Card>}
    </div>}

    {tab === "commissions" && canCommissions && <Card padded={false}>
      <div className="border-b border-[#1e1b4b]/10 p-4 sm:p-5"><h2 className="font-display text-lg text-[#182308]">Commission ledger</h2><p className="mt-1 text-xs text-[#64748b]">Commission becomes payable after delivery and the configured return-protection period. Refunds reduce or reverse unpaid commission.</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs">
        <thead className="bg-slate-50 text-[#64748b]"><tr>{["Partner","Order","Net merchandise base","Commission","Hold until","Status",""].map((t)=><th key={t} className="px-4 py-3 font-medium">{t}</th>)}</tr></thead>
        <tbody>{commissions.map((c)=><tr key={c.id} className="border-t border-[#1e1b4b]/5">
          <td className="px-4 py-3"><p className="font-semibold text-[#172033]">{c.partnerName}</p><p className="text-[10px] text-[#64748b]">{c.code}</p></td>
          <td className="px-4 py-3 font-medium">{c.orderNumber}</td><td className="px-4 py-3">{money(c.baseAmount)}</td><td className="px-4 py-3 font-semibold">{money(c.amount)}</td>
          <td className="px-4 py-3">{date(c.holdUntil)}</td><td className="px-4 py-3"><span className={"rounded-full border px-2 py-1 text-[10px] "+statusTone(c.status)}>{c.status.replaceAll("_"," ")}</span></td>
          <td className="px-4 py-3">{canPay && c.status==="payable" && <Button size="sm" onClick={()=>pay(c)}>Record payout</Button>}</td>
        </tr>)}</tbody>
      </table>{!commissions.length && <p className="p-8 text-center text-sm text-[#64748b]">No attributed commissions yet.</p>}</div>
    </Card>}

    {tab === "whatsapp" && canWhatsApp && <Card padded={false}>
      <div className="border-b border-[#1e1b4b]/10 p-4 sm:p-5"><h2 className="font-display text-lg text-[#182308]">WhatsApp reward delivery</h2><p className="mt-1 text-xs text-[#64748b]">Customer numbers are masked. Accepted means WhatsApp accepted the API request, not a delivery receipt.</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs">
        <thead className="bg-slate-50 text-[#64748b]"><tr>{["Recipient","Coupon","Created","Status","Attempts","Last error",""].map((t)=><th key={t} className="px-4 py-3 font-medium">{t}</th>)}</tr></thead>
        <tbody>{messages.map((m)=><tr key={m.id} className="border-t border-[#1e1b4b]/5">
          <td className="px-4 py-3">{m.to}</td><td className="px-4 py-3 font-semibold">{m.couponCode || "—"}</td><td className="px-4 py-3">{date(m.createdAt)}</td>
          <td className="px-4 py-3"><span className={"rounded-full border px-2 py-1 text-[10px] "+statusTone(m.status)}>{m.status.replaceAll("_"," ")}</span></td>
          <td className="px-4 py-3">{number(m.attempts)}</td><td className="max-w-[240px] px-4 py-3 text-rose-700">{m.lastError || "—"}</td>
          <td className="px-4 py-3">{canRetryWhatsApp && ["failed","setup_required"].includes(m.status) && <Button size="sm" variant="secondary" onClick={()=>retry(m)}>Retry</Button>}</td>
        </tr>)}</tbody>
      </table>{!messages.length && <p className="p-8 text-center text-sm text-[#64748b]">No welcome rewards have been generated yet.</p>}</div>
    </Card>}

    {tab === "settings" && canSettings && <Card>
      <div className="mb-4"><h2 className="font-display text-lg text-[#182308]">First-purchase reward & commission policy</h2><p className="mt-1 text-xs text-[#64748b]">Reward coupons are generated only after a confirmed Paid payment / delivered COD order, and only where the customer opted in to WhatsApp messages at checkout.</p></div>
      <form onSubmit={submitConfig} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="sm:col-span-2 xl:col-span-3"><Check label="Enable first-purchase WhatsApp coupon" checked={!!config.welcomeRewardEnabled} disabled={!canEditSettings} onChange={(v)=>setConfig((x)=>({...x,welcomeRewardEnabled:v}))}/></div>
        <Field label="Welcome discount (%)"><Input type="number" min="1" max="100" value={config.welcomeDiscountPercent} disabled={!canEditSettings} onChange={(e)=>setConfig((x)=>({...x,welcomeDiscountPercent:e.target.value}))}/></Field>
        <Field label="Maximum discount (PKR, 0 = no cap)"><Input type="number" min="0" value={config.welcomeMaxDiscount} disabled={!canEditSettings} onChange={(e)=>setConfig((x)=>({...x,welcomeMaxDiscount:e.target.value}))}/></Field>
        <Field label="Minimum next order (PKR)"><Input type="number" min="0" value={config.welcomeMinOrder} disabled={!canEditSettings} onChange={(e)=>setConfig((x)=>({...x,welcomeMinOrder:e.target.value}))}/></Field>
        <Field label="Coupon validity (days)"><Input type="number" min="1" max="180" value={config.welcomeValidityDays} disabled={!canEditSettings} onChange={(e)=>setConfig((x)=>({...x,welcomeValidityDays:e.target.value}))}/></Field>
        <Field label="Commission hold after delivery (days)"><Input type="number" min="1" max="90" value={config.commissionHoldDays} disabled={!canEditSettings} onChange={(e)=>setConfig((x)=>({...x,commissionHoldDays:e.target.value}))}/></Field>
        <Field label="Approved WhatsApp template name"><Input value={config.whatsappTemplateName} disabled={!canEditSettings} onChange={(e)=>setConfig((x)=>({...x,whatsappTemplateName:e.target.value}))}/></Field>
        <Field label="Template language code"><Input value={config.whatsappLanguage} disabled={!canEditSettings} onChange={(e)=>setConfig((x)=>({...x,whatsappLanguage:e.target.value}))}/></Field>
        {canEditSettings && <div className="sm:col-span-2 xl:col-span-3"><Button type="submit" disabled={busy}>Save reward settings</Button></div>}
        {!canEditSettings && <p className="sm:col-span-2 xl:col-span-3 text-xs text-[#64748b]">You can view this configuration but do not have permission to change it.</p>}
      </form>
      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
        Live WhatsApp sending also needs Meta WhatsApp Cloud API secrets on the Cloudflare Worker and an approved template whose body has five text placeholders in this order: customer name, coupon code, discount, valid-from date, expiry date. Without those credentials, rewards stay in the outbox as Setup required; they are not marked sent.
      </div>
    </Card>}

    {confirm && <ConfirmPasswordModal open title={confirm.title} message={confirm.message} confirmLabel={confirm.confirmLabel} onConfirm={confirm.callback} onClose={()=>setConfirm(null)}/>}
  </div>;
}
