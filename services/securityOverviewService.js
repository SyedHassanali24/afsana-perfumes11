const { User, Session } = require('../database/models');

async function getSecurityOverview(now = new Date()) {
  const users = await User.find({ kind: 'staff' })
    .select('email failedLoginCount lockedUntil lastLoginAt status')
    .sort({ updatedAt: -1 })
    .lean();
  const userIds = users.map((user) => user._id);
  const activeFilter = { userId: { $in: userIds }, revokedAt: { $exists: false }, expiresAt: { $gt: now } };
  const [activeSessions, recentSessions] = await Promise.all([
    Session.countDocuments(activeFilter),
    Session.find(activeFilter)
      .sort({ lastActiveAt: -1 })
      .limit(8)
      .select('userId device lastActiveAt createdAt')
      .lean(),
  ]);
  const byId = new Map(users.map((user) => [String(user._id), user]));
  const lockedAccounts = users
    .filter((user) => user.lockedUntil && user.lockedUntil > now)
    .map((user) => ({ email: user.email || 'Staff account', lockedUntil: user.lockedUntil }));
  const failedAccounts = users
    .filter((user) => Number(user.failedLoginCount) > 0)
    .map((user) => ({ email: user.email || 'Staff account', failedAttempts: user.failedLoginCount }));
  return {
    activeSessions,
    lockedAccounts,
    failedAccounts,
    recentSessions: recentSessions.map((session) => {
      const user = byId.get(String(session.userId));
      return {
        email: user?.email || 'Staff account',
        device: session.device?.label || session.device?.userAgent || 'Unknown device',
        lastActiveAt: session.lastActiveAt || session.createdAt,
      };
    }),
    generatedAt: now.toISOString(),
  };
}

module.exports = { getSecurityOverview };
