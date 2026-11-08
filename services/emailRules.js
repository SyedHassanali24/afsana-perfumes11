'use strict';

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return email || undefined;
}

function emailExactQuery(value) {
  const email = normalizeEmail(value);
  if (!email) return undefined;
  const escaped = email
    .replace(/[.*+?^$()|[\]\\]/g, '\\$&')
    .replace(/[{}]/g, '\\$&');
  return { $regex: '^' + escaped + '$', $options: 'i' };
}

function isEmailIdentifier(value) {
  return typeof value === 'string' && value.includes('@');
}

module.exports = { normalizeEmail, emailExactQuery, isEmailIdentifier };
