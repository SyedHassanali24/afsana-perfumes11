'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getEmailJsConfig, sendEmailJsOtp, EMAILJS_SEND_URL } = require('../services/emailjs');

const validEnv = {
  EMAILJS_SERVICE_ID: 'service_afsana',
  EMAILJS_TEMPLATE_ID: 'template_security',
  EMAILJS_PUBLIC_KEY: 'public_test_key',
  EMAILJS_PRIVATE_KEY: 'private_test_key',
};

test('EmailJS is not selected when none of its secrets are configured', () => {
  assert.equal(getEmailJsConfig({}), null);
});

test('EmailJS rejects partial secrets instead of silently falling back', () => {
  assert.throws(() => getEmailJsConfig({ EMAILJS_SERVICE_ID: 'service_afsana' }), /partially configured/);
});

test('EmailJS sends OTP server-side with the private key and owner recipient', async () => {
  const config = getEmailJsConfig(validEnv);
  let request;
  await sendEmailJsOtp(
    { to: 'Owner@Example.com', subject: 'AFSANA admin login verification', purpose: 'admin login verification', otp: '123456' },
    { config, fetchImpl: async (url, options) => { request = { url, options }; return { ok: true, status: 200 }; } },
  );
  assert.equal(request.url, EMAILJS_SEND_URL);
  assert.equal(request.options.method, 'POST');
  const body = JSON.parse(request.options.body);
  assert.equal(body.service_id, 'service_afsana');
  assert.equal(body.template_id, 'template_security');
  assert.equal(body.user_id, 'public_test_key');
  assert.equal(body.accessToken, 'private_test_key');
  assert.equal(body.template_params.to_email, 'owner@example.com');
  assert.equal(body.template_params.otp, '123456');
  assert.equal(body.template_params.expiry_minutes, 5);
  assert.equal(body.template_params.subject, 'AFSANA admin login verification');
});

test('EmailJS password-reset template params use a ten-minute expiry', async () => {
  let body;
  await sendEmailJsOtp(
    { to: 'owner@example.com', purpose: 'staff password reset', otp: '987654' },
    { config: getEmailJsConfig(validEnv), fetchImpl: async (_url, options) => { body = JSON.parse(options.body); return { ok: true, status: 200 }; } },
  );
  assert.equal(body.template_params.expiry_minutes, 10);
});

test('EmailJS rejects invalid recipients and malformed OTPs before network calls', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return { ok: true, status: 200 }; };
  const config = getEmailJsConfig(validEnv);
  await assert.rejects(sendEmailJsOtp({ to: 'not-an-email', otp: '123456' }, { config, fetchImpl }), /recipient/);
  await assert.rejects(sendEmailJsOtp({ to: 'owner@example.com', otp: '12' }, { config, fetchImpl }), /six-digit/);
  assert.equal(calls, 0);
});

test('EmailJS provider errors are logged with safe diagnostic text only', async () => {
  const original = console.error;
  const logged = [];
  console.error = (...args) => logged.push(args.join(' '));
  try {
    await assert.rejects(
      sendEmailJsOtp(
        { to: 'owner@example.com', otp: '123456' },
        { config: getEmailJsConfig(validEnv), fetchImpl: async () => ({
          ok: false, status: 422, text: async () => 'The recipients address is empty'
        }) },
      ),
      /HTTP 422/,
    );
  } finally {
    console.error = original;
  }
  assert.match(logged.join(' '), /HTTP 422/);
  assert.match(logged.join(' '), /recipients address is empty/);
  assert.doesNotMatch(logged.join(' '), /owner@example.com|123456|private_test_key/);
});

test('EmailJS provider error logging redacts email addresses and credential-like values', async () => {
  const original = console.error;
  const logged = [];
  console.error = (...args) => logged.push(args.join(' '));
  try {
    await assert.rejects(
      sendEmailJsOtp(
        { to: 'owner@example.com', otp: '123456' },
        { config: getEmailJsConfig(validEnv), fetchImpl: async () => ({
          ok: false, status: 412, text: async () => 'Gmail error at owner@example.com. accessToken=SECRET1234567890123456789012345678901234567890'
        }) },
      ),
      /HTTP 412/,
    );
  } finally {
    console.error = original;
  }
  assert.doesNotMatch(logged.join(' '), /owner@example.com|SECRET1234567890123456789012345678901234567890/);
});