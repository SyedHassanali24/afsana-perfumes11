import { useState } from 'react';
import { Copy, Check, Building2 } from 'lucide-react';

// Bank account for customers who chose bank transfer. Rendered only when the owner switched it on in Admin -> Settings.
export default function BankDetails({ bank, orderNumber }) {
  const [copiedKey, setCopiedKey] = useState(null);

  if (!bank) return null;

  const copy = (val, key) => {
    if (!val) return;
    navigator.clipboard?.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const rows = [
    ['Bank', bank.bankName, 'bank'],
    ['Account Title', bank.accountTitle, 'title'],
    ['Account Number', bank.accountNumber, 'accountNumber', true],
    ['IBAN', bank.iban, 'iban', true],
    ['Branch', bank.branch, 'branch'],
  ].filter(([, v]) => Boolean(v));

  return (
    <div className="rounded-xl border border-gold/40 bg-surface/90 p-5 text-sm text-left space-y-4 shadow-md">
      <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
        <div className="w-7 h-7 rounded-full bg-gold/15 text-gold flex items-center justify-center shrink-0">
          <Building2 className="w-4 h-4" />
        </div>
        <div>
          <p className="font-serif text-base text-ink font-medium">Official Maison Settlement Account</p>
          <p className="text-xs text-ink-muted">Transfer the exact balance via online banking or Raast</p>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map(([label, val, key, allowCopy]) => (
          <div key={key} className="flex items-center justify-between gap-3 py-1 text-xs sm:text-sm">
            <span className="text-ink-muted shrink-0">{label}:</span>
            <div className="flex items-center gap-2 font-mono text-ink text-right select-all">
              <span className="font-semibold">{val}</span>
              {allowCopy && (
                <button
                  type="button"
                  onClick={() => copy(val, key)}
                  title={`Copy ${label}`}
                  className="p-1 rounded text-ink-muted hover:text-gold hover:bg-gold/10 transition-colors"
                >
                  {copiedKey === key ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {orderNumber && (
        <div className="p-3 rounded-lg bg-bg/90 border border-border/80 text-xs text-ink-muted space-y-1">
          <p className="text-ink font-medium">Important Reference Instruction:</p>
          <p>
            Please enter your order reference <span className="font-mono text-gold font-bold">{orderNumber}</span> in the payment description/memo field so our accounting team can verify your payment immediately.
          </p>
        </div>
      )}

      {bank.instructions && (
        <p className="text-xs text-ink-muted italic border-t border-border/40 pt-2">
          {bank.instructions}
        </p>
      )}
    </div>
  );
}
