'use strict';

const {
  Customer, OfferLead, Campaign, WhatsAppCampaignRecipient,
} = require('../database/models');
const { E } = require('../middleware/errors');
const { audit } = require('./audit');
const { recipientDigits } = require('./whatsappService');

const CAMPAIGN_TYPE = 'whatsapp';
const MAX_RECIPIENTS = 5000;
const BATCH_SIZE = 8;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const cleanText = (value, max = 500) => String(value == null ? '' : value)
  .replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);

async function eligibleAudience() {
  const [customers, leads] = await Promise.all([
    Customer.find({
      storeId: 'main', isDeleted: false, whatsappMarketingConsent: true,
      phone: { $type: 'string', $ne: '' },
    }).select('_id name phone').sort({ createdAt: 1 }).limit(MAX_RECIPIENTS).lean(),
    OfferLead.find({
      storeId: 'main', isDeleted: false, marketingConsent: true, status: { $ne: 'Unsubscribed' },
      phone: { $type: 'string', $ne: '' },
    }).select('_id phone email').sort({ createdAt: 1 }).limit(MAX_RECIPIENTS).lean(),
  ]);

  const unique = new Map();
  for (const row of [...customers.map((x) => ({ ...x, contactType: 'customer' })), ...leads.map((x) => ({ ...x, contactType: 'offerLead', name: '' }))]) {
    let phone;
    try { phone = recipientDigits(row.phone); } catch { continue; }
    if (!unique.has(phone)) {
      unique.set(phone, {
        contactId: row._id,
        contactType: row.contactType,
        phone,
        name: cleanText(row.name || '', 100),
      });
    } else if (row.contactType === 'customer') {
      // Prefer the live customer record because it is re-checked before each send.
      unique.set(phone, {
        contactId: row._id,
        contactType: 'customer',
        phone,
        name: cleanText(row.name || '', 100),
      });
    }
  }
  return [...unique.values()].slice(0, MAX_RECIPIENTS);
}

async function summary() {
  const [audience, campaigns] = await Promise.all([
    eligibleAudience(),
    Campaign.find({ storeId: 'main', type: CAMPAIGN_TYPE }).sort({ createdAt: -1 }).limit(20)
      .select('name content status recipientCount sentCount failedCount skippedCount createdAt startedAt completedAt').lean(),
  ]);
  return {
    eligibleCount: audience.length,
    maxRecipients: MAX_RECIPIENTS,
    senderConfigured: false,
    automaticSendingEnabled: false,
    manualMode: true,
    campaigns: campaigns.map((c) => ({
      id: String(c._id), name: c.name, message: c.content?.message || '', promoCode: c.content?.promoCode || '', ctaUrl: c.content?.ctaUrl || 'https://afsanaperfumes.store/shop', status: c.status,
      recipientCount: c.recipientCount || 0, sentCount: c.sentCount || 0,
      failedCount: c.failedCount || 0, skippedCount: c.skippedCount || 0,
      createdAt: c.createdAt, startedAt: c.startedAt, completedAt: c.completedAt,
    })),
  };
}

async function createCampaign(ctx, body) {
  const audience = await eligibleAudience();
  if (!audience.length) throw E.badRequest('There are no customers with active WhatsApp marketing permission yet.');
  const campaign = await Campaign.create({
    name: cleanText(body.name, 100),
    type: CAMPAIGN_TYPE,
    segment: 'whatsapp-marketing-consented',
    content: {
      message: cleanText(body.message, 500),
      promoCode: cleanText(body.promoCode || '', 40),
      ctaUrl: body.ctaUrl || 'https://afsanaperfumes.store/shop',
      templateName: process.env.WHATSAPP_MARKETING_TEMPLATE || 'afsana_sale_offer',
      language: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en_US',
    },
    status: 'Draft',
    recipientCount: audience.length,
    createdBy: ctx.user._id,
  });

  for (let i = 0; i < audience.length; i += 500) {
    await WhatsAppCampaignRecipient.insertMany(audience.slice(i, i + 500).map((r) => ({
      campaignId: campaign._id, contactId: r.contactId, contactType: r.contactType,
      phone: r.phone, name: r.name, status: 'Pending',
    })), { ordered: true });
  }
  await audit(ctx, {
    action: 'whatsapp_campaign.created', module: 'campaigns', recordId: String(campaign._id),
    newValue: { recipientCount: audience.length, status: 'Draft' },
  }).catch(() => {});
  return { campaignId: String(campaign._id), recipientCount: audience.length, status: campaign.status };
}

async function progress(id) {
  const campaign = await Campaign.findOne({ _id: id, storeId: 'main', type: CAMPAIGN_TYPE }).lean();
  if (!campaign) throw E.notFound('WhatsApp campaign not found.');
  const [sent, failed, skipped, pending, sending] = await Promise.all([
    WhatsAppCampaignRecipient.countDocuments({ campaignId: id, storeId: 'main', status: 'Sent' }),
    WhatsAppCampaignRecipient.countDocuments({ campaignId: id, storeId: 'main', status: 'Failed' }),
    WhatsAppCampaignRecipient.countDocuments({ campaignId: id, storeId: 'main', status: 'Skipped' }),
    WhatsAppCampaignRecipient.countDocuments({ campaignId: id, storeId: 'main', status: 'Pending' }),
    WhatsAppCampaignRecipient.countDocuments({ campaignId: id, storeId: 'main', status: 'Sending' }),
  ]);
  const complete = pending === 0 && sending === 0;
  if (complete && campaign.status === 'Active') {
    await Campaign.updateOne({ _id: id, storeId: 'main', type: CAMPAIGN_TYPE, status: 'Active' }, {
      $set: { status: 'Completed', completedAt: new Date(), sentCount: sent, failedCount: failed, skippedCount: skipped },
    });
  } else {
    await Campaign.updateOne({ _id: id, storeId: 'main', type: CAMPAIGN_TYPE }, {
      $set: { sentCount: sent, failedCount: failed, skippedCount: skipped },
    });
  }
  return {
    campaignId: String(id), status: complete ? 'Completed' : campaign.status,
    recipientCount: Number(campaign.recipientCount || 0), sentCount: sent,
    failedCount: failed, skippedCount: skipped, pendingCount: pending, sendingCount: sending,
  };
}

async function listCampaigns() {
  const campaigns = await Campaign.find({ storeId: 'main', type: CAMPAIGN_TYPE }).sort({ createdAt: -1 }).limit(30)
    .select('name content status recipientCount sentCount failedCount skippedCount createdAt startedAt completedAt').lean();
  return { campaigns: campaigns.map((c) => ({
    id: String(c._id), name: c.name, status: c.status,
    recipientCount: c.recipientCount || 0, sentCount: c.sentCount || 0,
    failedCount: c.failedCount || 0, skippedCount: c.skippedCount || 0,
    createdAt: c.createdAt, startedAt: c.startedAt, completedAt: c.completedAt,
  })) };
}

async function startCampaign(id) {
  throw E.badRequest('Automatic WhatsApp delivery is disabled in AFSANA zero-cost mode. Open the campaign and share it manually in WhatsApp.');
}

async function currentContact(recipient) {
  if (recipient.contactType === 'customer') {
    return Customer.findOne({
      _id: recipient.contactId, storeId: 'main', isDeleted: false, whatsappMarketingConsent: true,
    }).select('_id name phone').lean();
  }
  return OfferLead.findOne({
    _id: recipient.contactId, storeId: 'main', isDeleted: false,
    marketingConsent: true, status: { $ne: 'Unsubscribed' },
  }).select('_id phone').lean();
}

async function processBatch(ctx, id) {
  throw E.badRequest('Automatic WhatsApp delivery is disabled in AFSANA zero-cost mode. Share the campaign manually from the WhatsApp Marketing page.');
}

async function getCampaign(id) {
  const campaign = await Campaign.findOne({ _id: id, storeId: 'main', type: CAMPAIGN_TYPE })
    .select('name content status recipientCount sentCount failedCount skippedCount createdAt startedAt completedAt').lean();
  if (!campaign) throw E.notFound('WhatsApp campaign not found.');
  return {
    campaign: {
      id: String(campaign._id), name: campaign.name, message: campaign.content?.message || '',
      promoCode: campaign.content?.promoCode || '', ctaUrl: campaign.content?.ctaUrl || '',
      status: campaign.status, recipientCount: campaign.recipientCount || 0,
      sentCount: campaign.sentCount || 0, failedCount: campaign.failedCount || 0,
      skippedCount: campaign.skippedCount || 0, createdAt: campaign.createdAt,
      startedAt: campaign.startedAt, completedAt: campaign.completedAt,
    },
    progress: await progress(id),
  };
}

module.exports = { summary, listCampaigns, createCampaign, startCampaign, processBatch, getCampaign, eligibleAudience };
