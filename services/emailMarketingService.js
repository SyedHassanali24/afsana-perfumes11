'use strict';

const { CustomerEmail, Campaign, CampaignRecipient, Order, Setting } = require('../database/models');
const { paging, pageMeta, escapeRegex } = require('../middleware/pagination');
const { E } = require('../middleware/errors');
const { sendOpenMail } = require('./otpMailer');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const escapeHtml = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const cleanEmail = (value) => String(value || '').trim().toLowerCase();

async function syncHistoricalEmails() {
  const key = 'customer_email_archive_backfill_v1';
  const marker = await Setting.findOne({ key, storeId: 'main' }).lean();
  if (marker?.value?.completedAt) return { alreadySynced: true, imported: Number(marker.value.imported || 0) };

  const rows = await Order.aggregate([
    { $match: { storeId: 'main', 'customer.email': { $type: 'string', $ne: '' } } },
    { $project: {
      email: { $toLower: { $trim: { input: '$customer.email' } } },
      name: '$customer.name', customerId: 1, createdAt: 1,
    } },
    { $match: { email: { $regex: EMAIL_RE } } },
    { $group: {
      _id: '$email',
      name: { $last: '$name' },
      customerId: { $last: '$customerId' },
      firstSeenAt: { $min: '$createdAt' },
      lastSeenAt: { $max: '$createdAt' },
      orderCount: { $sum: 1 },
    } },
  ]);

  let imported = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500).map((row) => ({
      updateOne: {
        filter: { email: row._id, storeId: 'main' },
        update: {
          $set: {
            ...(row.name ? { name: row.name } : {}),
            ...(row.customerId ? { customerId: row.customerId } : {}),
            lastSeenAt: row.lastSeenAt || new Date(),
            lastOrderAt: row.lastSeenAt || undefined,
          },
          $setOnInsert: {
            email: row._id,
            source: 'order-history',
            consentStatus: 'not_consented',
            firstSeenAt: row.firstSeenAt || row.lastSeenAt || new Date(),
          },
          $max: { orderCount: row.orderCount || 0 },
        },
        upsert: true,
      },
    }));
    if (batch.length) {
      await CustomerEmail.bulkWrite(batch, { ordered: false });
      imported += batch.length;
    }
  }

  await Setting.updateOne(
    { key, storeId: 'main' },
    { $set: { value: { completedAt: new Date(), imported } } },
    { upsert: true },
  );
  return { alreadySynced: false, imported };
}

async function subscribe({ email, name }) {
  const normalized = cleanEmail(email);
  if (!EMAIL_RE.test(normalized)) throw E.badRequest('Enter a valid email address.');
  const now = new Date();
  await CustomerEmail.updateOne(
    { email: normalized, storeId: 'main' },
    {
      $set: {
        consentStatus: 'subscribed',
        consentAt: now,
        consentSource: 'website-newsletter',
        unsubscribedAt: null,
        lastSeenAt: now,
        ...(name ? { name: String(name).trim().slice(0, 100) } : {}),
      },
      $setOnInsert: { email: normalized, firstSeenAt: now, source: 'newsletter' },
    },
    { upsert: true },
  );
  return { subscribed: true };
}

async function summary() {
  await syncHistoricalEmails();
  const [total, subscribed, notConsented, unsubscribed, recentCampaigns] = await Promise.all([
    CustomerEmail.countDocuments({ storeId: 'main', isDeleted: false }),
    CustomerEmail.countDocuments({ storeId: 'main', isDeleted: false, consentStatus: 'subscribed' }),
    CustomerEmail.countDocuments({ storeId: 'main', isDeleted: false, consentStatus: 'not_consented' }),
    CustomerEmail.countDocuments({ storeId: 'main', isDeleted: false, consentStatus: 'unsubscribed' }),
    Campaign.find({ storeId: 'main', type: 'email' }).sort({ createdAt: -1 }).limit(8).select('name content.subject status recipientCount sentCount failedCount skippedCount createdAt completedAt').lean(),
  ]);
  return { total, subscribed, notConsented, unsubscribed, campaigns: recentCampaigns.map((c) => ({
    id: String(c._id), name: c.name, subject: c.content?.subject || '', status: c.status,
    recipientCount: c.recipientCount || 0, sentCount: c.sentCount || 0,
    failedCount: c.failedCount || 0, skippedCount: c.skippedCount || 0,
    createdAt: c.createdAt, completedAt: c.completedAt,
  })) };
}

async function listContacts(query) {
  await syncHistoricalEmails();
  const { page, limit, skip } = paging(query);
  const and = [{ storeId: 'main', isDeleted: false }];
  if (query.consentStatus) and.push({ consentStatus: query.consentStatus });
  if (query.q) {
    const term = new RegExp(escapeRegex(query.q), 'i');
    and.push({ $or: [{ email: term }, { name: term }] });
  }
  const filter = { $and: and };
  const [rows, total] = await Promise.all([
    CustomerEmail.find(filter).sort({ lastSeenAt: -1, email: 1 }).skip(skip).limit(limit)
      .select('email name source consentStatus consentAt unsubscribedAt firstSeenAt lastSeenAt lastOrderAt orderCount').lean(),
    CustomerEmail.countDocuments(filter),
  ]);
  return { contacts: rows, pagination: pageMeta(total, page, limit) };
}

async function exportContacts() {
  await syncHistoricalEmails();
  const [rows, total] = await Promise.all([
    CustomerEmail.find({ storeId: 'main', isDeleted: false }).sort({ email: 1 }).limit(20000)
      .select('email name source consentStatus consentAt unsubscribedAt firstSeenAt lastSeenAt lastOrderAt orderCount').lean(),
    CustomerEmail.countDocuments({ storeId: 'main', isDeleted: false }),
  ]);
  return {
    contacts: rows.map((c) => ({
      email: c.email, name: c.name || '', source: c.source || '',
      consentStatus: c.consentStatus || 'not_consented',
      consentAt: c.consentAt || null, unsubscribedAt: c.unsubscribedAt || null,
      orderCount: Number(c.orderCount || 0), firstSeenAt: c.firstSeenAt || null, lastSeenAt: c.lastSeenAt || null,
    })),
    total, truncated: total > rows.length,
  };
}

async function listCampaigns() {
  const campaigns = await Campaign.find({ storeId: 'main', type: 'email' }).sort({ createdAt: -1 }).limit(30)
    .select('name content.subject status recipientCount sentCount failedCount skippedCount createdAt startedAt completedAt').lean();
  return { campaigns: campaigns.map((c) => ({
    id: String(c._id), name: c.name, subject: c.content?.subject || '', status: c.status,
    recipientCount: c.recipientCount || 0, sentCount: c.sentCount || 0,
    failedCount: c.failedCount || 0, skippedCount: c.skippedCount || 0,
    createdAt: c.createdAt, startedAt: c.startedAt, completedAt: c.completedAt,
  })) };
}

async function createCampaign(ctx, body) {
  const contacts = await CustomerEmail.find({
    storeId: 'main', isDeleted: false, consentStatus: 'subscribed',
    email: { $type: 'string', $ne: '' },
  }).select('_id email name').sort({ email: 1 }).limit(5000).lean();
  if (!contacts.length) throw E.badRequest('There are no customers who have agreed to receive AFSANA email offers yet.');
  const campaign = await Campaign.create({
    name: body.name,
    type: 'email',
    segment: 'email-consented',
    content: {
      subject: body.subject,
      message: body.message,
      ctaText: body.ctaText || '',
      ctaUrl: body.ctaUrl || '',
    },
    status: 'Draft',
    recipientCount: contacts.length,
    createdBy: ctx.user._id,
  });
  for (let i = 0; i < contacts.length; i += 500) {
    await CampaignRecipient.insertMany(contacts.slice(i, i + 500).map((c) => ({
      campaignId: campaign._id,
      contactId: c._id,
      email: c.email,
      name: c.name || '',
      status: 'Pending',
    })), { ordered: true });
  }
  return { campaignId: String(campaign._id), recipientCount: contacts.length, status: campaign.status };
}

async function startCampaign(id) {
  const campaign = await Campaign.findOne({ _id: id, storeId: 'main', type: 'email' });
  if (!campaign) throw E.notFound('Email campaign not found.');
  if (campaign.status === 'Completed') throw E.badRequest('This campaign has already completed.');
  if (campaign.status === 'Cancelled') throw E.badRequest('This campaign was cancelled.');
  if (campaign.status === 'Draft') {
    campaign.status = 'Active';
    campaign.startedAt = new Date();
    await campaign.save();
  }
  return progress(id);
}

async function progress(id) {
  const campaign = await Campaign.findOne({ _id: id, storeId: 'main', type: 'email' }).lean();
  if (!campaign) throw E.notFound('Email campaign not found.');
  const [sent, failed, skipped, pending, sending] = await Promise.all([
    CampaignRecipient.countDocuments({ campaignId: id, storeId: 'main', status: 'Sent' }),
    CampaignRecipient.countDocuments({ campaignId: id, storeId: 'main', status: 'Failed' }),
    CampaignRecipient.countDocuments({ campaignId: id, storeId: 'main', status: 'Skipped' }),
    CampaignRecipient.countDocuments({ campaignId: id, storeId: 'main', status: 'Pending' }),
    CampaignRecipient.countDocuments({ campaignId: id, storeId: 'main', status: 'Sending' }),
  ]);
  const complete = pending === 0 && sending === 0;
  if (complete && campaign.status === 'Active') {
    await Campaign.updateOne({ _id: id, storeId: 'main', status: 'Active' }, {
      $set: { status: 'Completed', completedAt: new Date(), sentCount: sent, failedCount: failed, skippedCount: skipped },
    });
  } else {
    await Campaign.updateOne({ _id: id, storeId: 'main' }, {
      $set: { sentCount: sent, failedCount: failed, skippedCount: skipped },
    });
  }
  return {
    campaignId: String(id), status: complete ? 'Completed' : campaign.status,
    recipientCount: Number(campaign.recipientCount || 0), sentCount: sent,
    failedCount: failed, skippedCount: skipped, pendingCount: pending, sendingCount: sending,
  };
}

function campaignHtml(campaign, name) {
  const content = campaign.content || {};
  const greeting = name ? 'Hello ' + escapeHtml(name) + ',' : 'Hello,';
  const message = escapeHtml(content.message || '').replace(/\n/g, '<br>');
  const button = content.ctaUrl && content.ctaText
    ? '<p style="margin:28px 0;text-align:center"><a href="' + escapeHtml(content.ctaUrl) + '" style="display:inline-block;background:#d8b66f;color:#17130e;text-decoration:none;padding:14px 24px;border-radius:4px;font-weight:bold">' + escapeHtml(content.ctaText) + '</a></p>'
    : '';
  return '<div style="max-width:620px;margin:24px auto;background:#100e0b;color:#f6edda;font-family:Arial,sans-serif;padding:30px;border:1px solid #b99552">' +
    '<div style="text-align:center"><img src="https://afsanaperfumes.store/afsana-email-logo.jpg" alt="AFSANA Perfumes" width="150" style="max-width:150px;height:auto"></div>' +
    '<p style="text-align:center;letter-spacing:3px;color:#d8b66f">AFSANA · THE ART OF SCENT</p>' +
    '<h2 style="color:#e6c77e;text-align:center">' + escapeHtml(campaign.name) + '</h2>' +
    '<p>' + greeting + '</p><div style="font-size:15px;line-height:1.8">' + message + '</div>' + button +
    '<p style="margin-top:34px;color:#c8bda8;font-size:12px;line-height:1.6">You are receiving this because you chose to receive AFSANA email offers. Use your email app\'s Unsubscribe option to stop promotional emails.</p>' +
    '<p style="color:#d8b66f;font-size:12px">AFSANA · THE ART OF SCENT</p></div>';
}

async function processNext(ctx, id) {
  const campaign = await Campaign.findOne({ _id: id, storeId: 'main', type: 'email' }).lean();
  if (!campaign) throw E.notFound('Email campaign not found.');
  if (campaign.status !== 'Active') return progress(id);

  const staleBefore = new Date(Date.now() - 2 * 60 * 1000);
  const recipient = await CampaignRecipient.findOneAndUpdate(
    {
      campaignId: id, storeId: 'main',
      $or: [{ status: 'Pending' }, { status: 'Sending', updatedAt: { $lt: staleBefore } }],
    },
    { $set: { status: 'Sending', error: '' }, $inc: { attempts: 1 } },
    { new: true, sort: { createdAt: 1 } },
  );
  if (!recipient) return progress(id);

  const contact = await CustomerEmail.findOne({ _id: recipient.contactId, storeId: 'main', isDeleted: false })
    .select('email consentStatus').lean();
  if (!contact || contact.consentStatus !== 'subscribed' || cleanEmail(contact.email) !== cleanEmail(recipient.email)) {
    await CampaignRecipient.updateOne({ _id: recipient._id }, {
      $set: { status: 'Skipped', error: 'Contact is no longer subscribed or the email address changed.' },
    });
    return progress(id);
  }

  try {
    const sent = await sendOpenMail({
      to: recipient.email,
      subject: String(campaign.content?.subject || campaign.name),
      html: campaignHtml(campaign, recipient.name),
      text: String(campaign.content?.message || ''),
      idempotencyKey: 'afsana-campaign-' + String(campaign._id) + '-' + String(recipient._id),
      env: process.env,
      fetchImpl: globalThis.fetch,
    });
    await CampaignRecipient.updateOne({ _id: recipient._id }, {
      $set: { status: 'Sent', sentAt: new Date(), messageId: sent.messageId || '' },
    });
  } catch (error) {
    const reason = String(error?.message || error).replace(/[\r\n\t]+/g, ' ').slice(0, 220);
    const rateLimited = /HTTP 429|rate_limit_exceeded|cold_outreach_limit|too many sends/i.test(reason);
    if (rateLimited) {
      await CampaignRecipient.updateOne({ _id: recipient._id }, {
        $set: { status: 'Pending', error: reason },
      });
      const paused = await progress(id);
      return { ...paused, paused: true, pauseReason: 'OpenMail has reached a sending limit. This campaign is safely paused; resume it after the limit resets.' };
    }
    const suppressed = /recipient_suppressed|recipient unsubscribed|suppressed/i.test(reason);
    if (suppressed) {
      await CustomerEmail.updateOne({ _id: contact._id }, {
        $set: { consentStatus: 'unsubscribed', unsubscribedAt: new Date() },
      });
    }
    await CampaignRecipient.updateOne({ _id: recipient._id }, {
      $set: { status: suppressed ? 'Skipped' : 'Failed', error: reason },
    });
  }
  const result = await progress(id);
  await require('./audit').audit(ctx, {
    action: 'email_campaign.recipient_processed', module: 'campaigns',
    recordId: String(campaign._id),
    newValue: { recipient: recipient.email, status: result.status, sent: result.sentCount, failed: result.failedCount },
  }).catch(() => {});
  return result;
}

async function getCampaign(id) {
  const campaign = await Campaign.findOne({ _id: id, storeId: 'main', type: 'email' })
    .select('name content status recipientCount sentCount failedCount skippedCount createdAt startedAt completedAt').lean();
  if (!campaign) throw E.notFound('Email campaign not found.');
  return { campaign: {
    id: String(campaign._id), name: campaign.name, subject: campaign.content?.subject || '',
    message: campaign.content?.message || '', status: campaign.status,
    recipientCount: campaign.recipientCount || 0, sentCount: campaign.sentCount || 0,
    failedCount: campaign.failedCount || 0, skippedCount: campaign.skippedCount || 0,
    createdAt: campaign.createdAt, startedAt: campaign.startedAt, completedAt: campaign.completedAt,
  }, progress: await progress(id) };
}

module.exports = {
  subscribe, summary, listContacts, exportContacts, listCampaigns,
  createCampaign, startCampaign, processNext, getCampaign, syncHistoricalEmails,
};
