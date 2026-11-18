'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const captured = { updates: [], recipientBatches: [], campaignFilter: null };
const optedIn = [
  { _id: 'contact-1', email: 'one@example.com', name: 'One' },
  { _id: 'contact-2', email: 'two@example.com', name: 'Two' },
];

const stub = (relative, exports) => {
  const id = require.resolve(path.join(ROOT, relative));
  require.cache[id] = { id, filename: id, loaded: true, exports };
};

stub('database/models/index.js', {
  CustomerEmail: {
    updateOne: async (filter, update, options) => { captured.updates.push({ filter, update, options }); },
    find: (filter) => {
      captured.campaignFilter = filter;
      const query = {
        select() { return this; },
        sort() { return this; },
        limit() { return this; },
        lean: async () => optedIn,
      };
      return query;
    },
  },
  Campaign: {
    create: async (data) => ({ _id: 'campaign-1', ...data }),
  },
  CampaignRecipient: {
    insertMany: async (rows) => { captured.recipientBatches.push(rows); return rows; },
  },
  Order: { aggregate: async () => [] },
  Setting: {
    findOne: () => ({ lean: async () => ({ value: { completedAt: new Date().toISOString(), imported: 0 } }) }),
  },
});

const M = require('../services/emailMarketingService');

test('newsletter signup stores a normalized email with explicit marketing consent', async () => {
  captured.updates.length = 0;
  const result = await M.subscribe({ email: '  HELLO@Example.com  ', name: 'Afsana Friend' });
  assert.deepEqual(result, { subscribed: true });
  const write = captured.updates[0];
  assert.equal(write.filter.email, 'hello@example.com');
  assert.equal(write.update.$set.consentStatus, 'subscribed');
  assert.equal(write.update.$set.consentSource, 'website-newsletter');
  assert.ok(write.update.$set.consentAt);
  assert.equal(write.options.upsert, true);
});

test('campaign recipient snapshots include only consented email addresses', async () => {
  captured.recipientBatches.length = 0;
  captured.campaignFilter = null;
  const result = await M.createCampaign({ user: { _id: 'staff-1' } }, {
    name: 'Private offer',
    subject: 'A private note from AFSANA',
    message: 'Thank you for being part of AFSANA.',
  });
  assert.equal(result.campaignId, 'campaign-1');
  assert.equal(result.recipientCount, 2);
  assert.equal(captured.campaignFilter.consentStatus, 'subscribed');
  const recipients = captured.recipientBatches.flat();
  assert.deepEqual(recipients.map((r) => r.email), ['one@example.com', 'two@example.com']);
  assert.ok(recipients.every((r) => r.status === 'Pending'));
});
