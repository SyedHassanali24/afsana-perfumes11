// Public API cache policy. Authenticated/admin responses remain no-store at the Worker.
function cacheHeaders(ttl, swr = Math.max(ttl, 60), cacheTags = []) {
  // Cloudflare Workers Cache uses max-age + stale-while-revalidate. Do not add s-maxage,
  // must-revalidate, proxy-revalidate, or stale-if-error: these disable background stale serving.
  const seconds = Math.min(60, Math.max(1, Number(ttl) || 1));
  const stale = Math.min(60, Math.max(0, Number(swr) || 0));
  const tags = [...new Set((Array.isArray(cacheTags) ? cacheTags : [])
    .map((tag) => String(tag || '').trim())
    .filter((tag) => /^[a-z0-9_-]{1,40}$/i.test(tag)))];

  return {
    'Cache-Control': `public, max-age=${seconds}, stale-while-revalidate=${stale}`,
    ...(tags.length ? { 'Cache-Tag': tags.join(',') } : {}),
  };
}

// Called after successful writes. Purging tags makes the next public read fetch
// current MongoDB data instead of serving an outdated product/CMS/settings response.
async function invalidateForGroup(group, context, tags = []) {
  const validTags = [...new Set((Array.isArray(tags) ? tags : [])
    .map((tag) => String(tag || '').trim())
    .filter((tag) => /^[a-z0-9_-]{1,40}$/i.test(tag)))];
  const purge = context?.ctx?.cache?.purge;
  if (!validTags.length || typeof purge !== 'function') return;

  const task = Promise.resolve()
    .then(() => purge.call(context.ctx.cache, { tags: validTags }))
    .catch((error) => {
      // A cache purge failure must never roll back a successful database write.
      console.warn(`[afsana-cache] ${group} tag purge skipped:`, error?.message || error);
    });
  if (typeof context?.ctx?.waitUntil === 'function') {
    context.ctx.waitUntil(task);
    return;
  }
  await task;
}

module.exports = { cacheHeaders, invalidateForGroup };
