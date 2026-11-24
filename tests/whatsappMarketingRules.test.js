'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isMarketingOptOutMessage, phoneTailRegex } = require('../services/whatsappMarketingRules');

test('WhatsApp marketing opt-out recognises explicit stop phrases only', () => {
  for (const phrase of ['STOP', 'stop offers', 'UNSUBSCRIBE', 'CANCEL', 'STOP PROMOTIONS', ' STOP   ALL ']) {
    assert.equal(isMarketingOptOutMessage(phrase), true, phrase);
  }
  assert.equal(isMarketingOptOutMessage('Please stop sending me offers!'), false);
  assert.equal(isMarketingOptOutMessage('No thanks'), false);
});

test('WhatsApp opt-out phone matcher supports Pakistani number formats', () => {
  const expression = phoneTailRegex('+92 325 2032321');
  assert.ok(expression);
  assert.match('0325-2032321', expression);
  assert.match('+92 (325) 2032321', expression);
  assert.doesNotMatch('0325-2032322', expression);
  assert.equal(phoneTailRegex('bad-number'), null);
});
