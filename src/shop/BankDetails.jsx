// Bank account for customers who chose bank transfer. Rendered only when the owner switched it on in Admin -> Settings.
export default function BankDetails({ bank, orderNumber }) {
  if (!bank) return null;
  const rows = [['Bank', bank.bankName], ['Account title', bank.accountTitle], ['Account number', bank.accountNumber], ['IBAN', bank.iban], ['Branch', bank.branch]].filter(([, v]) => v);
  return (
    <div className="rounded-2xl border border-[#263e0e]/10 bg-[#faf8f4] p-5 shadow-[0_18px_50px_rgba(24,35,8,.06)] text-sm text-left space-y-1.5">
      <p className="font-medium">Send your payment to</p>
      {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4"><span className="text-[#5f654f]">{k}</span><span className="text-right select-all">{v}</span></div>)}
      {orderNumber && <p className="text-xs text-[#5f654f] pt-1">Please write your order number ({orderNumber}) in the payment reference.</p>}
      {bank.instructions && <p className="text-xs text-[#5f654f]">{bank.instructions}</p>}
    </div>
  );
}
