import { Link, useLocation, useParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import Button from '../../../admin/components/Button';
import { Container } from '../ui';
import { useCustomer } from '../../customer/CustomerAuthContext';
import { money, PAYMENT_LABEL, BANK_NOTE } from '../format';
import useTitle from '../useTitle';
import useShopSettings from '../useShopSettings';
import BankDetails from '../BankDetails';
import { useCmsPageCopy } from '../cmsCopy';

export default function OrderSuccessPage() {
  const { orderNumber } = useParams();
  const order = useLocation().state?.order; // only present right after checkout; a refresh just shows the number
  const { status } = useCustomer();
  const shop = useShopSettings();
  const copy = useCmsPageCopy('order_success');
  useTitle(copy.browserTitle);
  const t = (key) => copy[key];
  return (
    <Container className="max-w-xl">
      <div className="text-center py-10 sm:py-14 space-y-5">
        <div className="mx-auto flex w-20 h-20 items-center justify-center rounded-full bg-[#3d6b3d]/10 luxury-float"><CheckCircle2 className="w-10 h-10 text-[#3d6b3d]" aria-hidden /></div>
        <h1 className="font-display text-3xl sm:text-4xl">{t('title')}</h1>
        <p className="text-[#5f654f]">{t('description')} <span className="text-[#182308] font-medium">{orderNumber}</span>. {t('keepToTrack')}</p>
        {order && (
          <div className="rounded-2xl border border-[#263e0e]/10 bg-[#faf8f4] p-5 sm:p-6 text-sm text-left space-y-2 shadow-[0_18px_50px_rgba(24,35,8,.06)]">
            <div className="flex justify-between"><span className="text-[#5f654f]">{t('total')}</span><span>{money(order.total)}</span></div>
            <div className="flex justify-between"><span className="text-[#5f654f]">{t('payment')}</span><span>{PAYMENT_LABEL[order.paymentMethod] || order.paymentMethod}</span></div>
            {order.paymentMethod === 'BANK_TRANSFER' && (shop?.bank ? <div className="pt-2"><BankDetails bank={shop.bank} orderNumber={orderNumber} /></div> : <p className="text-xs text-[#5f654f] pt-2">{BANK_NOTE}</p>)}
          </div>
        )}
        <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
          <Link className="w-full sm:w-auto" to={status === 'authed' ? `/account/orders/${orderNumber}` : `/track?order=${orderNumber}`}><Button className="w-full">{t('trackOrder')}</Button></Link>
          <Link className="w-full sm:w-auto" to="/shop"><Button className="w-full" variant="secondary">{t('continueShopping')}</Button></Link>
        </div>
        {status !== 'authed' && <p className="text-xs text-[#5f654f] pt-4"><Link to="/register" className="underline">{t('createAccount')}</Link> {t('accountBenefit')}</p>}
      </div>
    </Container>
  );
}
