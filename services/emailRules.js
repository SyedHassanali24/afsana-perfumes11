'use strict';

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return email || undefined;
}

function isEmailIdentifier(value) {
  return typeof value === 'string' && value.includes('@');
}

module.exports = { normalizeEmail, isEmailIdentifier };
