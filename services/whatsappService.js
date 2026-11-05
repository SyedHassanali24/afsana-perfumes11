const crypto = require('crypto');
const { Order, Customer, Coupon, Setting, WhatsAppOutbox } = require('../database/models');

const pkrDate = (date) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', day: '2-digit', month: 'short', year: 'numeric' }).format(date);
const digits = (value) => {
  let d = String(value || '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '92' + d.slice(1);
  else if (d.length === 10) d = '92' + d;
  return d;
};

async function issueFirstPurchaseReward(order, session) {
  if (!order || !order.customerId) return null;
  const customer = await Customer.findById(order.customerId).session(session).lean();
  if (!customer || !customer.whatsappMarketingConsent) return null;
  const previousPaid = await Order.countDocuments({
    customerId: order.customerId, _id: { $ne: order._id }, paymentStatus: { $in: ['Paid', 'Partially Refunded', 'Refunded'] },
  }).session(session);
  if (previousPaid > 0) return null;
  const dedupeKey = 'first-purchase:' + String(customer._id);
  const existing = await WhatsAppOutbox.findOne({ dedupeKey }).session(session).lean();
  if (existing) return existing._id;
  const setting = await Setting.findOne({ key: 'growth', storeId: 'main' }).session(session).lean();
  const cfg = setting?.value || {};
  if (cfg.welcomeRewardEnabled !== true) return null;
  const days = Math.max(1, Math.min(180, Number(cfg.welcomeValidityDays) || 30));
  const now = new Date();
  const expiresAt = new Date(now.getTime() + days * 86400000);
  const code = 'AFS-WELCOME-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  const percent = Math.max(1, Math.min(100, Number(cfg.welcomeDiscountPercent) || 15));
  const maxDiscount = Math.max(0, Number(cfg.welcomeMaxDiscount) || 0);
  const minOrder = Math.max(0, Number(cfg.welcomeMinOrder) || 0);
  const [coupon] = await Coupon.create([{
    code, type: 'percentage', value: percent, maxDiscount: maxDiscount || undefined,
    minOrder, firstOrderOnly: false, usageLimit: 1, perCustomerLimit: 1,
    customerIds: [customer._id], startsAt: now, expiresAt, isActive: true,
  }], { session });
  const templateName = String(cfg.whatsappTemplateName || 'afsana_first_purchase_reward').toLowerCase();
  const language = String(cfg.whatsappLanguage || 'en');
  const outboxParams = [
    String(customer.name || order.customer?.name || 'Afsana customer').slice(0, 80),
    code,
    percent + '%',
    pkrDate(now),
    pkrDate(expiresAt),
  ];
  const [message] = await WhatsAppOutbox.create([{
    dedupeKey, kind: 'first_purchase_reward', customerId: customer._id, orderId: order._id,
    couponId: coupon._id, to: digits(customer.phone || order.customer?.phone),
    templateName, language, parameters: outboxParams, status: 'queued',
  }], { session });
  return message._id;
}

async function sendOutbox(id) {
  const message = await WhatsAppOutbox.findById(id);
  if (!message || message.status === 'accepted') return message ? { status: message.status } : null;
  const token = String(process.env.WHATSAPP_ACCESS_TOKEN || '').trim();
  const phoneId = String(process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  const version = String(process.env.WHATSAPP_GRAPH_VERSION || 'v26.0').trim();
  if (!token || !phoneId) {
    message.status = 'setup_required';
    message.lastError = 'Meta WhatsApp Cloud API credentials are not configured.';
    await message.save();
    return { status: message.status, setupRequired: true };
  }
  if (!/^v\d+\.\d+$/.test(version) || !/^\d+$/.test(phoneId) || !/^\d{8,15}$/.test(message.to || '')) {
    message.status = 'failed';
    message.lastError = 'WhatsApp API configuration or recipient number is invalid.';
    await message.save();
    return { status: message.status };
  }
  message.attempts += 1;
  message.lastAttemptAt = new Date();
  try {
    const response = await fetch('https://graph.facebook.com/' + version + '/' + phoneId + '/messages', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: message.to,
        type: 'template',
        template: {
          name: message.templateName,
          language: { code: message.language || 'en' },
          components: [{ type: 'body', parameters: message.parameters.map((text) => ({ type: 'text', text })) }],
        },
      }),
    });
    const data = await response.json().catch(() => ({}));
    const providerId = data?.messages?.[0]?.id;
    if (!response.ok || !providerId) {
      message.status = 'failed';
      message.lastError = String(data?.error?.message || 'WhatsApp rejected the message.').slice(0, 500);
      await message.save();
      return { status: message.status };
    }
    message.status = 'accepted';
    message.providerMessageId = providerId;
    message.acceptedAt = new Date();
    message.lastError = '';
    await message.save();
    return { status: 'accepted', providerMessageId: providerId };
  } catch (error) {
    message.status = 'failed';
    message.lastError = String(error?.message || 'WhatsApp request failed.').slice(0, 500);
    await message.save();
    return { status: message.status };
  }
}

module.exports = { issueFirstPurchaseReward, sendOutbox, digits };
