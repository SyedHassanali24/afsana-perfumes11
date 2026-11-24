'use strict';

const { recipientDigits } = require('./whatsappService');

function isMarketingOptOutMessage(value) {
  const text = String(value || '').trim().toUpperCase().replace(/[.!?]+$/g, '').replace(/\\s+/g, ' ');
  return /^(?:STOP|STOP ALL|STOP OFFERS|STOP PROMOTIONS|UNSUBSCRIBE|CANCEL|END|QUIT)$/.test(text);
}

function phoneTailRegex(value) {
  let digits;
  try { digits = recipientDigits(value); } catch { return null; }
  const tail = digits.slice(-10);
  if (tail.length !== 10) return null;
  return new RegExp(tail.split('').join('[^0-9]*'));
}

module.exports = { isMarketingOptOutMessage, phoneTailRegex };
