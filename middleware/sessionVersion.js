'use strict';

// Session-version invalidation is cheap, deterministic and independent of a
// best-effort bulk session-revocation write.
function version(value) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 0 ? n : 0;
}

function isSessionCurrent(session, user) {
  if (!session || !user) return false;
  return version(session.authVersion) === version(user.authVersion);
}

module.exports = { version, isSessionCurrent };
