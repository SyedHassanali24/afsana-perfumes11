'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const modelPath = require.resolve('../database/models');
const servicePath = require.resolve('../services/whatsappService');
let models;
let savedFetch;
let savedEnv;

function loadService(stubs) {
  models = stubs;
  require.cache[modelPath] = {
    id: modelPath,
    filename: modelPath,
    loaded: true,
    exports: stubs,
  };
  delete require.cache[servicePath];
  return require('../services/whatsappService');
}

function withEnv(values, fn) {
  const old = {};
  const names = new Set([...Object.keys(values), 'WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_GRAPH_VERSION']);
  for (const name of names) old[name] = process.env[name];
  for (const name of names) delete process.env[name];
  Object.assign(process.env, values);
  return Promise.resolve().then(fn).finally(() => {
    for (const name of names) {
      if (old[name] === undefined) delete process.env[name];
      else process.env[name] = old[name];
    }
  });
}

test('WhatsApp phone normalization formats common Pakistan mobile inputs', () => {
  const { digits } = loadService({});
  assert.equal(digits('0313 2956206'), '923132956206');
  assert.equal(digits('+92 313 2956206'), '923132956206');
  assert.equal(digits('3132956206'), '923132956206');
  assert.equal(digits(''), '');
});

test('WhatsApp outbox stays setup_required and never claims sent when Meta credentials are missing', async () => {
  let saves = 0;
  const message = {
    status: 'queued',
    attempts: 0,
    lastError: '',
    save: async () => { saves += 1; }
  };
  const { sendOutbox } = loadService({ WhatsAppOutbox: { findById: async () => message } });
  await withEnv({}, async () => {
    const result = await sendOutbox('outbox-id');
    assert.deepEqual(result, { status: 'setup_required', setupRequired: true });
    assert.equal(message.status, 'setup_required');
    assert.match(message.lastError, /credentials are not configured/i);
    assert.equal(message.attempts, 0);
    assert.equal(saves, 1);
  });
});

test('WhatsApp outbox rejects malformed recipient/configuration before calling Meta', async () => {
  let saves = 0;
  const message = {
    status: 'queued',
    attempts: 0,
    to: 'not-a-phone',
    save: async () => { saves += 1; }
  };
  const { sendOutbox } = loadService({ WhatsAppOutbox: { findById: async () => message } });
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => { calls += 1; throw new Error('Meta should not be called'); };
  try {
    await withEnv({
      WHATSAPP_ACCESS_TOKEN: 'test-token',
      WHATSAPP_PHONE_NUMBER_ID: '123456789012345'
    }, async () => {
      const result = await sendOutbox('outbox-id');
      assert.deepEqual(result, { status: 'failed' });
      assert.equal(message.status, 'failed');
      assert.equal(calls, 0);
      assert.equal(saves, 1);
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test('WhatsApp outbox sends the approved template using the configured Graph API version', async () => {
  let saves = 0;
  const message = {
    status: 'queued',
    attempts: 0,
    to: '923132956206',
    templateName: 'afsana_first_purchase_reward',
    language: 'en',
    parameters: ['Ayesha', 'AFS-WELCOME-1234', '15%', '05 Nov 2026', '05 Dec 2026'],
    save: async () => { saves += 1; }
  };
  const { sendOutbox } = loadService({ WhatsAppOutbox: { findById: async () => message } });
  const originalFetch = global.fetch;
  let call;
  global.fetch = async (url, options) => {
    call = { url, options };
    return { ok: true, json: async () => ({ messages: [{ id: 'wamid.test-123' }] }) };
  };
  try {
    await withEnv({
      WHATSAPP_ACCESS_TOKEN: 'secret-test-token',
      WHATSAPP_PHONE_NUMBER_ID: '123456789012345',
      WHATSAPP_GRAPH_VERSION: 'v26.0'
    }, async () => {
      const result = await sendOutbox('outbox-id');
      assert.deepEqual(result, { status: 'accepted', providerMessageId: 'wamid.test-123' });
      assert.equal(message.status, 'accepted');
      assert.equal(message.providerMessageId, 'wamid.test-123');
      assert.ok(message.acceptedAt instanceof Date);
      assert.equal(message.attempts, 1);
      assert.equal(call.url, 'https://graph.facebook.com/v26.0/123456789012345/messages');
      assert.equal(call.options.headers.Authorization, 'Bearer secret-test-token');
      const payload = JSON.parse(call.options.body);
      assert.equal(payload.messaging_product, 'whatsapp');
      assert.equal(payload.to, '923132956206');
      assert.equal(payload.template.name, 'afsana_first_purchase_reward');
      assert.deepEqual(payload.template.components[0].parameters.map(x => x.text), message.parameters);
      assert.equal(saves, 1);
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test('WhatsApp accepted outbox entries are idempotent and are not sent twice', async () => {
  const message = { status: 'accepted', providerMessageId: 'wamid.already-sent' };
  const { sendOutbox } = loadService({ WhatsAppOutbox: { findById: async () => message } });
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => { calls += 1; throw new Error('Accepted messages must not be resent'); };
  try {
    await withEnv({ WHATSAPP_ACCESS_TOKEN: 'secret', WHATSAPP_PHONE_NUMBER_ID: '123456789012345' }, async () => {
      assert.deepEqual(await sendOutbox('outbox-id'), { status: 'accepted' });
      assert.equal(calls, 0);
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test('first-purchase WhatsApp reward is not created without recorded customer marketing consent', async () => {
  let couponCreates = 0;
  let outboxCreates = 0;
  const session = {};
  const { issueFirstPurchaseReward } = loadService({
    Customer: { findById: () => ({ session: () => ({ lean: async () => ({ _id: 'customer-id', whatsappMarketingConsent: false }) }) }) },
    Order: { countDocuments: () => ({ session: async () => 0 }) },
    WhatsAppOutbox: {
      findOne: () => ({ session: () => ({ lean: async () => null }) }),
      create: async () => { outboxCreates += 1; return [{ _id: 'outbox-id' }]; }
    },
    Setting: { findOne: () => ({ session: () => ({ lean: async () => ({ value: { welcomeRewardEnabled: true } }) }) }) },
    Coupon: { create: async () => { couponCreates += 1; return [{ _id: 'coupon-id' }]; } }
  });
  const result = await issueFirstPurchaseReward({ _id: 'order-id', customerId: 'customer-id' }, session);
  assert.equal(result, null);
  assert.equal(couponCreates, 0);
  assert.equal(outboxCreates, 0);
});

test('first-purchase WhatsApp reward is deduplicated by customer and queues one coupon/outbox row', async () => {
  let couponPayload;
  let messagePayload;
  const session = {};
  const { issueFirstPurchaseReward } = loadService({
    Customer: { findById: () => ({ session: () => ({ lean: async () => ({ _id: 'customer-id', name: 'Ayesha', phone: '03132956206', whatsappMarketingConsent: true }) }) }) },
    Order: { countDocuments: () => ({ session: async () => 0 }) },
    WhatsAppOutbox: {
      findOne: () => ({ session: () => ({ lean: async () => null }) }),
      create: async (rows) => { messagePayload = rows[0]; return [{ _id: 'outbox-id' }]; }
    },
    Setting: { findOne: () => ({ session: () => ({ lean: async () => ({ value: { welcomeRewardEnabled: true, welcomeDiscountPercent: 15, welcomeValidityDays: 30, whatsappTemplateName: 'afsana_first_purchase_reward', whatsappLanguage: 'en' } }) }) }) },
    Coupon: { create: async (rows) => { couponPayload = rows[0]; return [{ _id: 'coupon-id' }]; } }
  });
  const result = await issueFirstPurchaseReward({
    _id: 'order-id',
    customerId: 'customer-id',
    customer: { phone: '03132956206', name: 'Ayesha' }
  }, session);
  assert.equal(result, 'outbox-id');
  assert.equal(couponPayload.type, 'percentage');
  assert.equal(couponPayload.value, 15);
  assert.equal(couponPayload.usageLimit, 1);
  assert.equal(couponPayload.perCustomerLimit, 1);
  assert.equal(messagePayload.dedupeKey, 'first-purchase:customer-id');
  assert.equal(messagePayload.to, '923132956206');
  assert.equal(messagePayload.status, 'queued');
  assert.equal(messagePayload.templateName, 'afsana_first_purchase_reward');
  assert.equal(messagePayload.parameters.length, 5);
});

test('first-purchase WhatsApp reward reuses an existing outbox record without creating another coupon', async () => {
  let couponCreates = 0;
  const session = {};
  const { issueFirstPurchaseReward } = loadService({
    Customer: { findById: () => ({ session: () => ({ lean: async () => ({ _id: 'customer-id', whatsappMarketingConsent: true }) }) }) },
    Order: { countDocuments: () => ({ session: async () => 0 }) },
    WhatsAppOutbox: {
      findOne: () => ({ session: () => ({ lean: async () => ({ _id: 'existing-outbox-id' }) }) }),
      create: async () => [{ _id: 'unexpected' }]
    },
    Setting: { findOne: () => ({ session: () => ({ lean: async () => ({ value: { welcomeRewardEnabled: true } }) }) }) },
    Coupon: { create: async () => { couponCreates += 1; return [{ _id: 'coupon-id' }]; } }
  });
  const result = await issueFirstPurchaseReward({ _id: 'order-id', customerId: 'customer-id' }, session);
  assert.equal(result, 'existing-outbox-id');
  assert.equal(couponCreates, 0);
});
