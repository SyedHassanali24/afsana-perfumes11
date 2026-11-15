const { AnalyticsEvent } = require('../database/models');
const { normalizeAttribution } = require('./trafficAttribution');

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
        { $group: { _id: null, views: { $sum: 1 }, sessions: { $addToSet: '$sessionRef' } } },
        { $project: { _id: 0, views: 1, uniqueSessions: { $size: '$sessions' } } },
      ],
      sources: [
        { $group: { _id: { $ifNull: ['$meta.source', 'Direct'] }, views: { $sum: 1 }, sessions: { $addToSet: '$sessionRef' } } },
        { $project: { _id: 0, source: '$_id', views: 1, uniqueSessions: { $size: '$sessions' } } },
        { $sort: { views: -1, source: 1 } },
      ],
      daily: [
        { $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$at', timezone: 'Asia/Karachi' } },
            source: { $ifNull: ['$meta.source', 'Direct'] },
          },
          views: { $sum: 1 },
        } },
        { $sort: { '_id.date': 1 } },
      ],
    } },
  ]);
  const summary = result?.summary?.[0] || { views: 0, uniqueSessions: 0 };
  return {
    range: { days: safeDays, from: from.toISOString(), to: to.toISOString() },
    totalViews: summary.views || 0,
    uniqueSessions: summary.uniqueSessions || 0,
    sources: result?.sources || [],
    daily: (result?.daily || []).map((row) => ({ date: row._id.date, source: row._id.source, views: row.views })),
  };
}

module.exports = { recordPageView, getTrafficSources };
