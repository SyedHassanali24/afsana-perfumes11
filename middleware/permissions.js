// Pure (no DB): resolves what a staff member may do. Server is the authority; the client only mirrors it for UX.
const C = require('../database/constants');
const NONE = { _id: { $in: [] } }; // matches nothing

const isActive = (o, now) => (!o.startsAt || o.startsAt <= now) && (!o.expiresAt || o.expiresAt > now);
const covers = (g, m, a) => !!g && g.module === m && (g.actions || []).includes(a);

function resolve({ role, staff, now = new Date() }) {
  const unrestricted = !!(role && role.isUnrestricted);
  const deniedFields = new Set([...((role && role.deniedFields) || []), ...((staff && staff.deniedFields) || [])]);
  const grants = [...((role && role.grants) || [])];
  const denies = [];
  for (const o of (staff && staff.overrides) || []) {
    if (!isActive(o, now)) continue; // temporary access expires automatically
    (o.effect === 'deny' ? denies : grants).push(o.grant);
  }
  // returns array of scopes, or null when not permitted
  function can(module, action) {
    if (unrestricted) return [{ kind: 'all', values: [] }];
    if (denies.some((g) => covers(g, module, action))) return null;
    const scopes = grants.filter((g) => covers(g, module, action))
      .map((g) => ({ kind: (g.scope && g.scope.kind) || 'all', values: (g.scope && g.scope.values) || [] }));
    return scopes.length ? scopes : null;
  }
  function toClient() {
    if (unrestricted) return { unrestricted: true, modules: {}, deniedFields: [...deniedFields] };
    const modules = {};
    for (const m of C.MODULES) { const a = C.ACTIONS.filter((x) => can(m, x)); if (a.length) modules[m] = a; }
    return { unrestricted: false, modules, deniedFields: [...deniedFields] };
  }
  return { unrestricted, deniedFields, can, toClient };
}

// Turns scopes into a MongoDB filter. `map` says which field implements each scope for that collection.
function scopeFilter(scopes, uid, map = {}) {
  if (!scopes || !scopes.length) return NONE;
  if (scopes.some((s) => s.kind === 'all')) return {};
  const ors = [];
  for (const s of scopes) {
    if (s.kind === 'createdByMe' && map.createdBy) ors.push({ [map.createdBy]: uid });
    else if (s.kind === 'assigned' && map.assignedTo) ors.push({ [map.assignedTo]: uid });
    else if (map[s.kind] && s.values.length) ors.push({ [map[s.kind]]: { $in: s.values } });
  }
  return ors.length ? { $or: ors } : NONE;
}

function withinWorkingHours(wh, now = new Date()) {
  if (!wh || !wh.enabled) return true;
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: wh.timezone || 'Asia/Karachi', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now);
  const get = (t) => parts.find((p) => p.type === t).value;
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  const mins = (parseInt(get('hour'), 10) % 24) * 60 + parseInt(get('minute'), 10);
  const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  if (wh.days && wh.days.length && !wh.days.includes(day)) return false;
  if (wh.start && wh.end) return mins >= toMin(wh.start) && mins < toMin(wh.end);
  return true;
}
module.exports = { resolve, scopeFilter, withinWorkingHours, NONE };
