'use strict';

const {
  Customer, OfferLead, Campaign, WhatsAppCampaignRecipient,
} = require('../database/models');
const { E } = require('../middleware/errors');
const { audit } = require('./audit');
const { recipientDigits, sendWhatsAppTemplate } = require('./whatsappService');

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
      .select('name status recipientCount sentCount failedCount skippedCount createdAt startedAt completedAt').lean(),
  ]);
  return {
    eligibleCount: audience.length,
    maxRecipients: MAX_RECIPIENTS,
    senderConfigured: Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
    campaigns: campaigns.map((c) => ({
      id: String(c._id), name: c.name, status: c.status,
      recipientCount: c.recipientCount || 0, sentCount: c.sentCount || 0,
      failedCount: c.failedCount || 0, skippedCount: c.skippedCount || 0,
      createdAt: c.createdAt, startedAt: c.startedAt, completedAt: c.completedAt,
    })),
  };
}

async function createCampaign(ctx, body) {
  if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
    throw E.badRequest('WhatsApp Cloud API is not configured. No campaign was created.');
  }
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
    .select('name status recipientCount sentCount failedCount skippedCount createdAt startedAt completedAt').lean();
  return { campaigns: campaigns.map((c) => ({
    id: String(c._id), name: c.name, status: c.status,
    recipientCount: c.recipientCount || 0, sentCount: c.sentCount || 0,
    failedCount: c.failedCount || 0, skippedCount: c.skippedCount || 0,
    createdAt: c.createdAt, startedAt: c.startedAt, completedAt: c.completedAt,
  })) };
}

async function startCampaign(id) {
  const campaign = await Campaign.findOne({ _id: id, storeId: 'main', type: CAMPAIGN_TYPE });
  if (!campaign) throw E.notFound('WhatsApp campaign not found.');
  if (campaign.status === 'Completed' || campaign.status === 'Cancelled') {
    throw E.badRequest('This campaign can no longer be started.');
  }
  if (campaign.status === 'Draft') {
    const active = await Campaign.exists({ storeId: 'main', type: CAMPAIGN_TYPE, status: 'Active', _id: { $ne: id } });
    if (active) throw E.conflict('Another WhatsApp campaign is already active. Resume or finish it first.');
    campaign.status = 'Active';
    campaign.startedAt = new Date();
    await campaign.save();
  }
  return progress(id);
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
  const campaign = await Campaign.findOne({ _id: id, storeId: 'main', type: CAMPAIGN_TYPE }).lean();
  if (!campaign) throw E.notFound('WhatsApp campaign not found.');
  if (campaign.status !== 'Active') return progress(id);
  if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
    throw E.badRequest('WhatsApp Cloud API is not configured. Campaign remains paused.');
  }

  let paused = false;
  let pauseReason = '';
  for (let index = 0; index < BATCH_SIZE; index += 1) {
    const staleBefore = new Date(Date.now() - 5 * 60 * 1000);
    const recipient = await WhatsAppCampaignRecipient.findOneAndUpdate(
      {
        campaignId: id, storeId: 'main',
        $or: [{ status: 'Pending' }, { status: 'Sending', updatedAt: { $lt: staleBefore } }],
      },
      { $set: { status: 'Sending', error: '' }, $inc: { attempts: 1 } },
      { new: true, sort: { createdAt: 1 } },
    );
    if (!recipient) break;

    const contact = await currentContact(recipient);
    let currentDigits = '';
    try { currentDigits = recipientDigits(contact && contact.phone); } catch { /* stale / missing phone */ }
    if (!contact || currentDigits !== recipient.phone) {
      await WhatsAppCampaignRecipient.updateOne({ _id: recipient._id }, {
        $set: { status: 'Skipped', error: 'Marketing permission was withdrawn or the phone number changed.' },
      });
      continue;
    }

    try {
      const result = await sendWhatsAppTemplate({
        to: currentDigits,
        templateName: campaign.content?.templateName || 'afsana_sale_offer',
        language: campaign.content?.language || 'en_US',
        parameters: [
          cleanText(contact.name || recipient.name || 'AFSANA customer', 100),
          cleanText(campaign.name, 100),
          cleanText(campaign.content?.message || '', 500),
          cleanText(campaign.content?.promoCode || 'No code required', 40),
          campaign.content?.ctaUrl || 'https://afsanaperfumes.store/shop',
        ],
      });
      if (result.skipped) throw new Error('WhatsApp Cloud API configuration is missing.');
      await WhatsAppCampaignRecipient.updateOne({ _id: recipient._id }, {
        $set: { status: 'Sent', sentAt: new Date(), messageId: result.messageId || '' },
      });
    } catch (error) {
      const reason = cleanText(error?.message || error, 220);
      const rateLimited = /HTTP 429|80008|130429|131056|rate.?limit/i.test(reason);
      const providerSetupError = /HTTP (400|401|403)|132000|132001|132012|132015|131047|template/i.test(reason);
      const shouldPause = rateLimited || providerSetupError;
      await WhatsAppCampaignRecipient.updateOne({ _id: recipient._id }, {
        $set: { status: shouldPause ? 'Pending' : 'Failed', error: reason },
      });
      if (shouldPause) {
        paused = true;
        pauseReason = rateLimited
          ? 'Meta is rate limiting this campaign. It has been paused safely; resume later.'
          : 'Meta rejected the template or sender setup. Check that the template is approved and the sender is active, then resume this campaign.';
        break;
      }
    }
    if (index < BATCH_SIZE - 1) await sleep(180);
  }

  const result = await progress(id);
  if (ctx && ctx.user) {
    await audit(ctx, {
      action: 'whatsapp_campaign.batch_processed', module: 'campaigns', recordId: String(id),
      newValue: { sent: result.sentCount, failed: result.failedCount, skipped: result.skippedCount, pending: result.pendingCount },
    }).catch(() => {});
  }
  return { ...result, ...(paused ? { paused: true, pauseReason } : {}) };
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
