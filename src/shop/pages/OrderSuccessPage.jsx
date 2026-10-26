import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { CheckCircle2, Copy, Check, ArrowRight, Package, Sparkles } from 'lucide-react';
import Button from '../../../admin/components/Button';
import { Container } from '../ui';
import { useCustomer } from '../../customer/CustomerAuthContext';
import { money, PAYMENT_LABEL, BANK_NOTE } from '../format';
import useTitle from '../useTitle';
import useShopSettings from '../useShopSettings';
import BankDetails from '../BankDetails';

export default function OrderSuccessPage() {
  useTitle('Consignment Confirmed');
  const { orderNumber } = useParams();
  const order = useLocation().state?.order; // only present right after checkout; a refresh just shows the number
  const { status } = useCustomer();
  const shop = useShopSettings();
  const [copied, setCopied] = useState(false);

  const copyOrder = () => {
    navigator.clipboard?.writeText(orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Container className="max-w-2xl py-12 md:py-16">
      <div className="rounded-2xl border border-border/80 bg-surface/80 p-8 md:p-12 text-center space-y-8 shadow-xl backdrop-blur-md">
        
        {/* Animated Laurel / Check Icon */}
        <div className="relative inline-block mx-auto">
          <div className="w-20 h-20 rounded-full bg-gold/15 border-2 border-gold/40 flex items-center justify-center text-gold mx-auto shadow-lg shadow-gold/10">
            <Sparkles className="w-10 h-10" />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-widest text-gold font-medium">Order Consignment Confirmed</p>
          <h1 className="font-serif text-3xl md:text-4xl text-ink font-light">
            Thank you for choosing Afsana
          </h1>
          <p className="text-ink-muted text-sm max-w-md mx-auto leading-relaxed">
            Your artisanal fragrance selection is currently being prepared with care and will be dispatched directly to your doorstep.
          </p>
        </div>

        {/* Order Identifier Banner */}
        <div className="p-4 rounded-xl bg-bg border border-border/80 max-w-md mx-auto flex items-center justify-between">
          <div className="text-left">
            <p className="text-[11px] text-ink-muted uppercase tracking-wider">Order Reference</p>
            <p className="font-mono text-lg font-bold text-ink">{orderNumber}</p>
          </div>
          <button
            type="button"
            onClick={copyOrder}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gold/40 bg-gold/10 text-gold hover:bg-gold/20 transition-all font-medium"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Order Details Receipt (when present in state) */}
        {order && (
          <div className="rounded-xl border border-border bg-surface p-6 text-sm text-left space-y-3 max-w-lg mx-auto">
            <h3 className="font-serif text-base text-ink pb-2 border-b border-border/60">Consignment Summary</h3>
            
            <div className="flex justify-between text-xs text-ink-muted">
              <span>Date Placed:</span>
              <span className="text-ink font-medium">{new Date().toLocaleDateString('en-PK', { dateStyle: 'medium' })}</span>
            </div>
            
            <div className="flex justify-between text-xs text-ink-muted">
              <span>Settlement Mode:</span>
              <span className="text-ink font-medium">{PAYMENT_LABEL[order.paymentMethod] || order.paymentMethod}</span>
            </div>

            <div className="flex justify-between text-xs text-ink-muted">
              <span>Destination:</span>
              <span className="text-ink font-medium text-right">{order.shippingAddress?.city || 'Pakistan'}</span>
            </div>

            <div className="flex justify-between text-sm pt-2 border-t border-border/60 font-semibold text-ink">
              <span>Total Amount:</span>
              <span className="tabular-nums text-gold">{money(order.total)}</span>
            </div>

            {order.paymentMethod === 'BANK_TRANSFER' && (
              <div className="pt-4">
                {shop?.bank ? (
                  <BankDetails bank={shop.bank} orderNumber={orderNumber} />
                ) : (
                  <p className="text-xs text-ink-muted p-3 rounded-lg bg-bg border border-border">{BANK_NOTE}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4 max-w-md mx-auto">
          <Link
            to={status === 'authed' ? `/account/orders/${orderNumber}` : `/track?order=${orderNumber}`}
            className="w-full sm:w-auto"
          >
            <Button className="w-full gold-gradient text-onyx font-semibold px-6 py-3 flex items-center justify-center gap-2">
              <Package className="w-4 h-4" />
              <span>Track Consignment</span>
            </Button>
          </Link>
          <Link to="/shop" className="w-full sm:w-auto">
            <Button variant="secondary" className="w-full px-6 py-3">
              Explore Fragrances
            </Button>
          </Link>
        </div>

        {status !== 'authed' && (
          <p className="text-xs text-ink-muted pt-2">
            Create an Afsana account with this phone or email to view past orders and request complimentary returns.{' '}
            <Link to="/register" className="text-gold underline hover:text-gold-light">
              Register now
            </Link>
          </p>
        )}
      </div>
    </Container>
  );
}
