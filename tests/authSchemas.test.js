const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../validation/schemas');

test('staff email verification schemas accept real six-digit OTPs and 64-char hex tokens', () => {
  assert.equal(S.forgotPasswordVerifyBody.safeParse({ email: 'owner@example.com', otp: '123456' }).success, true);
  assert.equal(S.forgotPasswordResetBody.safeParse({ email: 'owner@example.com', resetToken: 'a'.repeat(64), password: 'Password123' }).success, true);
  assert.equal(S.loginTwoFactorVerifyBody.safeParse({
    email: 'owner@example.com',
    challengeId: 'a'.repeat(64),
    otp: '123456',
    deviceId: 'device-id-01234567890123456789',
  }).success, true);
});

test('staff email verification schemas reject malformed OTPs and challenge tokens', () => {
  assert.equal(S.forgotPasswordVerifyBody.safeParse({ email: 'owner@example.com', otp: '12ab56' }).success, false);
  assert.equal(S.loginTwoFactorVerifyBody.safeParse({
    email: 'owner@example.com',
    challengeId: 'not-a-hex-challenge',
    otp: '123456',
    deviceId: 'device-id-01234567890123456789',
  }).success, false);
});
