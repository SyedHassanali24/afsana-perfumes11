// Pure access-control rules (no DB) so they can be unit-tested. Used by staffService / roleService.
const crypto = require('crypto');

const MAX_TEMP_DAYS = 90;

// You may only manage roles/staff strictly below your own level. Owner (unrestricted) may manage any level.
const canManageLevel = (actorRole, targetLevel) => !!actorRole && (actorRole.isUnrestricted === true || targetLevel < actorRole.level);

// Does the acting user hold every action in this grant (with a scope at least as broad)? Prevents privilege escalation.
function holdsGrant(perms, grant) {
  if (perms.unrestricted) return true;
  const wantAll = ((grant.scope && grant.scope.kind) || 'all') === 'all';
  return (grant.actions || []).every((a) => {
    const scopes = perms.can(grant.module, a);
    if (!scopes) return false;
    return !wantAll || scopes.some((s) => s.kind === 'all');
  });
}
const missingGrants = (perms, grants) => grants.filter((g) => !holdsGrant(perms, g));

const kindOf = (g) => (g.scope && g.scope.kind) || 'all';
const valuesOf = (g) => (g.scope && g.scope.values) || [];
const sameValues = (a, b) => a.length === b.length && a.every((v) => b.includes(v));
// Is `g` already fully covered by one of the existing grants? (so keeping it is not an escalation)
const grantCovered = (existing, g) => (existing || []).some((o) => o.module === g.module
  && (g.actions || []).every((a) => (o.actions || []).includes(a))
  && (kindOf(o) === 'all' || (kindOf(o) === kindOf(g) && sameValues(valuesOf(o), valuesOf(g)))));
const addedGrants = (oldGrants, newGrants) => newGrants.filter((g) => !grantCovered(oldGrants, g));

// Temporary access rules. Returns an error message, or null when OK.
function validateWindow({ effect, startsAt, expiresAt }, now = new Date()) {
  if (expiresAt && expiresAt <= now) return 'Expiry must be in the future.';
  if (startsAt && expiresAt && expiresAt <= startsAt) return 'Expiry must be after the start.';
  if (effect === 'allow') {
    if (!expiresAt) return 'Temporary access must have an expiry date.';
    const from = startsAt && startsAt > now ? startsAt : now;
    if (expiresAt - from > MAX_TEMP_DAYS * 86400000) return `Temporary access can last at most ${MAX_TEMP_DAYS} days.`;
  }
  return null;
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'; // no look-alikes (0/O, 1/l/I)
function generatePassword(len = 14) {
  for (;;) {
    let p = '';
    for (let i = 0; i < len; i += 1) p += ALPHABET[crypto.randomInt(ALPHABET.length)];
    if (/[A-Za-z]/.test(p) && /\d/.test(p)) return p;
  }
}
const slugKey = (name) => String(name).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);

module.exports = { MAX_TEMP_DAYS, canManageLevel, holdsGrant, missingGrants, grantCovered, addedGrants, validateWindow, generatePassword, slugKey };
