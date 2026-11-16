const { AnalyticsEvent } = require('../database/models');
const { normalizeAttribution } = require('./trafficAttribution');

const SOURCE = {
  instagram: ['instagram', 'Instagram'],
  tiktok: ['tiktok', 'TikTok'],
  youtube: ['youtube', 'YouTube'],
  facebook: ['facebook', 'Facebook'],
  whatsapp: ['whatsapp', 'WhatsApp'],
  search: ['search', 'Search'],
  direct: ['direct', 'Direct'],
  email: ['email', 'Email'],
  referral: ['referral', 'Referral'],
  other_social: ['other_social', 'Other social'],
};

function sourceIdentity(value) {
  const label = String(value || 'Direct').trim() || 'Direct';
  const normalized = label.toLowerCase().replace(/[\s-]+/g, '_');
  const entry = SOURCE[normalized];
  if (entry) return { key: entry[0], label: entry[1] };
  if (normalized === 'other' || normalized === 'unknown') return { key: 'other', label: 'Other' };
  return { key: 'other', label };
}

async function recordPageView(input) {
  const meta = normalizeAttribution(input);
  await AnalyticsEvent.create({
    event: 'page_view',
    sessionRef: String(input.sessionRef),
    meta,
  });
  return { accepted: true };
}

async function getTrafficSources(days = 30, now = new Date()) {
  const safeDays = Math.min(90, Math.max(7, Number(days) || 30));
  const to = new Date(now);
  const from = new Date(to.getTime() - safeDays * 24 * 60 * 60 * 1000);
  const [result] = await AnalyticsEvent.aggregate([
    { $match: { event: 'page_view', at: { $gte: from, $lt: to }, sessionRef: { $type: 'string' } } },
    { $facet: {
      summary: [
        { $group: { _id: null, pageViews: { $sum: 1 }, sessions: { $addToSet: '$sessionRef' } } },
        { $project: { _id: 0, pageViews: 1, visits: { $size: '$sessions' } } },
      ],
      sources: [
        { $group: { _id: { $ifNull: ['$meta.source', 'Direct'] }, pageViews: { $sum: 1 }, sessions: { $addToSet: '$sessionRef' } } },
        { $project: { _id: 0, source: '$_id', pageViews: 1, visits: { $size: '$sessions' } } },
        { $sort: { visits: -1, source: 1 } },
      ],
      daily: [
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$at', timezone: 'Asia/Karachi' } },
          sessions: { $addToSet: '$sessionRef' },
        } },
        { $project: { _id: 0, date: '$_id', visits: { $size: '$sessions' } } },
        { $sort: { date: 1 } },
      ],
      landingPages: [
        { $group: { _id: { $ifNull: ['$meta.landingPath', '/'] }, sessions: { $addToSet: '$sessionRef' } } },
        { $project: { _id: 0, path: '$_id', visits: { $size: '$sessions' } } },
        { $sort: { visits: -1, path: 1 } },
        { $limit: 12 },
      ],
    } },
  ]);
  const summary = result?.summary?.[0] || { pageViews: 0, visits: 0 };
  const totalVisits = summary.visits || 0;
  const sources = (result?.sources || []).map((item) => {
    const identity = sourceIdentity(item.source);
    const share = totalVisits ? Math.round((item.visits / totalVisits) * 1000) / 10 : 0;
    return {
      ...identity,
      source: item.source,
      visits: item.visits || 0,
      pageViews: item.pageViews || 0,
      share,
      // Backward-compatible fields for the previous audience summary.
      views: item.pageViews || 0,
      uniqueSessions: item.visits || 0,
    };
  });
  return {
    range: { days: safeDays, from: from.toISOString(), to: to.toISOString() },
    visits: totalVisits,
    pageViews: summary.pageViews || 0,
    totalViews: summary.pageViews || 0,
    uniqueSessions: totalVisits,
    sources,
    daily: result?.daily || [],
    landingPages: result?.landingPages || [],
  };
}

module.exports = { recordPageView, getTrafficSources, sourceIdentity };
