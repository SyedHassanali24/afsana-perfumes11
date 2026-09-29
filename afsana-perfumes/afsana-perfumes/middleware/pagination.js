const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function paging(q = {}) {
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(q.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}
const pageMeta = (total, page, limit) => ({ total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });
module.exports = { paging, pageMeta, escapeRegex };
