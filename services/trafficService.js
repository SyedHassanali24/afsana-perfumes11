// Aggregated, anonymous acquisition analytics. Queries only page-view events for the active store.
const { AnalyticsEvent } = require('../database/models');
const T = require('./trafficRules');
const DAY_MS = 24 * 60 * 60 * 1000;
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;
const CACHE_TTL_MS = 15000;
const cache = new Map();

function pktDayStart(now) {
  const local = new Date(now.getTime() + PKT_OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - PKT_OFFSET_MS);
}
function dateKey(date) {
  const local = new Date(date.getTime() + PKT_OFFSET_MS);
  return local.getUTCFullYear() + '-' + String(local.getUTCMonth() + 1).padStart(2, '0') + '-' + String(local.getUTCDate()).padStart(2, '0');
}
function boundedDays(value) {
  const n = Number(value);
  return [7, 30, 90].includes(n) ? n : 30;
}
async function recordPageView(input) {
  const event = T.pageViewEvent(input);
  if (!event) return false;
  await AnalyticsEvent.create(event);
  return true;
}
async function getTraffic(query = {}, now = new Date()) {
  const days = boundedDays(query.days);
  const cacheKey = String(days);
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const from = new Date(pktDayStart(now).getTime() - (days - 1) * DAY_MS);
  const match = { storeId: 'main', event: 'page_view', at: { $gte: from, $lte: now } };
  const dateExpression = { $dateToString: { format: '%Y-%m-%d', date: '$at', timezone: 'Asia/Karachi' } };
  const [sourceRows, dailyRows, landingRows] = await Promise.all([
    AnalyticsEvent.aggregate([
      { $match: match },
      { $group: { _id: { source: { $ifNull: ['$source', 'direct'] }, sessionRef: '$sessionRef' }, pageViews: { $sum: 1 } } },
      { $group: { _id: '$_id.source', visits: { $sum: 1 }, pageViews: { $sum: '$pageViews' } } },
      { $sort: { visits: -1, pageViews: -1 } },
    ]),
    AnalyticsEvent.aggregate([
      { $match: match },
      { $group: { _id: { date: dateExpression, sessionRef: '$sessionRef' }, pageViews: { $sum: 1 } } },
      { $group: { _id: '$_id.date', visits: { $sum: 1 }, pageViews: { $sum: '$pageViews' } } },
      { $sort: { _id: 1 } },
    ]),
    AnalyticsEvent.aggregate([
      { $match: match },
      { $group: { _id: { path: { $ifNull: ['$landingPath', '$path'] }, sessionRef: '$sessionRef' } } },
      { $group: { _id: '$_id.path', visits: { $sum: 1 } } },
      { $sort: { visits: -1 } },
      { $limit: 8 },
    ]),
  ]);

  const sourceMap = new Map((sourceRows || []).map((row) => [String(row._id || 'other'), {
    visits: Number(row.visits) || 0, pageViews: Number(row.pageViews) || 0,
  }]));
  const visits = Array.from(sourceMap.values()).reduce((sum, row) => sum + row.visits, 0);
  const pageViews = Array.from(sourceMap.values()).reduce((sum, row) => sum + row.pageViews, 0);
  const sources = T.SOURCES.map((source) => {
    const value = sourceMap.get(source.key) || { visits: 0, pageViews: 0 };
    return { ...source, ...value, share: visits ? Math.round((value.visits / visits) * 1000) / 10 : 0 };
  }).sort((a, b) => b.visits - a.visits || a.label.localeCompare(b.label));

  const dailyMap = new Map((dailyRows || []).map((row) => [row._id, {
    visits: Number(row.visits) || 0, pageViews: Number(row.pageViews) || 0,
  }]));
  const start = pktDayStart(now);
  const daily = Array.from({ length: days }, (_, i) => {
    const date = new Date(start.getTime() - (days - 1 - i) * DAY_MS);
    const key = dateKey(date);
    return { date: key, ...(dailyMap.get(key) || { visits: 0, pageViews: 0 }) };
  });

  const data = {
    generatedAt: now.toISOString(),
    days,
    visits,
    pageViews,
    sources,
    daily,
    landingPages: (landingRows || []).map((row) => ({ path: row._id || '/', visits: Number(row.visits) || 0 })),
  };
  cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  if (cache.size > 6) cache.delete(cache.keys().next().value);
  return data;
}
module.exports = { recordPageView, getTraffic, boundedDays };
