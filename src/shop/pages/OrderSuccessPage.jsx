import { Link, useLocation, useParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import Button from '../../../admin/components/Button';
import { Container } from '../ui';
import { useCustomer } from '../../customer/CustomerAuthContext';
import { money, PAYMENT_LABEL, BANK_NOTE } from '../format';
import useTitle from '../useTitle';
import useShopSettings from '../useShopSettings';
import BankDetails from '../BankDetails';

export default function OrderSuccessPage() {
  useTitle('Order placed');
  const { orderNumber } = useParams();
  const order = useLocation().state?.order; // only present right after checkout; a refresh just shows the number
  const { status } = useCustomer();
  const shop = useShopSettings();
  return (
    <Container className="max-w-xl">
      <div className="text-center py-10 sm:py-14 space-y-5">
        <div className="mx-auto flex w-20 h-20 items-center justify-center rounded-full bg-[#3d6b3d]/10 luxury-float"><CheckCircle2 className="w-10 h-10 text-[#3d6b3d]" aria-hidden /></div>
        <h1 className="font-display text-3xl sm:text-4xl">Thank you for your order</h1>
        <p className="text-[#5f654f]">Your order number is <span className="text-[#182308] font-medium">{orderNumber}</span>. Keep it to track your parcel.</p>
        {order && (
          <div className="rounded-2xl border border-[#263e0e]/10 bg-[#faf8f4] p-5 sm:p-6 text-sm text-left space-y-2 shadow-[0_18px_50px_rgba(24,35,8,.06)]">
            <div className="flex justify-between"><span className="text-[#5f654f]">Total</span><span>{money(order.total)}</span></div>
            <div className="flex justify-between"><span className="text-[#5f654f]">Payment</span><span>{PAYMENT_LABEL[order.paymentMethod] || order.paymentMethod}</span></div>
            {order.paymentMethod === 'BANK_TRANSFER' && (shop?.bank ? <div className="pt-2"><BankDetails bank={shop.bank} orderNumber={orderNumber} /></div> : <p className="text-xs text-[#5f654f] pt-2">{BANK_NOTE}</p>)}
          </div>
        )}
        <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
          <Link className="w-full sm:w-auto" to={status === 'authed' ? `/account/orders/${orderNumber}` : `/track?order=${orderNumber}`}><Button className="w-full">Track this order</Button></Link>
          <Link className="w-full sm:w-auto" to="/shop"><Button className="w-full" variant="secondary">Continue shopping</Button></Link>
        </div>
        {status !== 'authed' && <p className="text-xs text-[#5f654f] pt-4"><Link to="/register" className="underline">Create an account</Link> to check out faster next time.</p>}
      </div>
    </Container>
  );
}
