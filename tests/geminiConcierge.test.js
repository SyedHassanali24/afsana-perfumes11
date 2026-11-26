'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { generateAfsanaReply, sanitizeChatText, DEFAULT_MODEL } = require('../services/geminiConcierge');

test('Gemini concierge uses the configured free-tier model and keeps the API key out of the URL', async () => {
  let request;
  const reply = await generateAfsanaReply({
    message: 'Recommend a warm perfume for evening.',
    products: [{ name: 'Amber Story', slug: 'amber-story', priceFrom: 3500, notes: { base: ['amber', 'wood'] } }],
    env: { GEMINI_API_KEY: 'test-secret' },
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Try Amber Story for a warm evening scent.' }] } }] }) };
    },
  });
  assert.equal(DEFAULT_MODEL, 'gemini-2.5-flash-lite');
  assert.match(request.url, /gemini-2\.5-flash-lite:generateContent$/);
  assert.equal(new URL(request.url).search, '');
  assert.equal(request.options.headers['x-goog-api-key'], 'test-secret');
  assert.match(JSON.parse(request.options.body).systemInstruction.parts[0].text, /Amber Story/);
  assert.equal(reply, 'Try Amber Story for a warm evening scent.');
});

test('Gemini concierge redacts contact details and order references before forwarding chat text', async () => {
  assert.equal(
    sanitizeChatText('Email me at buyer@example.com or call 03132956206 about AFS-000123'),
    'Email me at [email hidden] or call [phone hidden] about [order reference hidden]',
  );
});

test('Gemini concierge refuses to fall back to a paid model when no free-tier key is configured', async () => {
  await assert.rejects(
    () => generateAfsanaReply({ message: 'Hello', env: {}, fetchImpl: async () => { throw new Error('must not call'); } }),
    (error) => error.code === 'AI_NOT_CONFIGURED',
  );
});

test('Gemini 429 responses are reported as a free-tier limit, not silently paid', async () => {
  await assert.rejects(
    () => generateAfsanaReply({
      message: 'Hello',
      env: { GEMINI_API_KEY: 'present' },
      fetchImpl: async () => ({ ok: false, status: 429 }),
    }),
    (error) => error.code === 'AI_RATE_LIMIT',
  );
});
