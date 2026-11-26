'use strict';

const { createHandler } = require('../../../middleware/withApi');
const { res } = require('../../../middleware/http');
const { Product } = require('../../../database/models');
const S = require('../../../validation/schemas');
const { generateAfsanaReply } = require('../../../services/geminiConcierge');

const routes = [
  {
    method: 'POST',
    path: '/chat',
    public: true,
    body: S.conciergeBody,
    rateLimit: { limit: 12, windowMs: 60 * 1000 },
    handler: async ({ body }) => {
      if (!process.env.GEMINI_API_KEY) {
        return res(503, { error: { code: 'AI_NOT_CONFIGURED', message: 'AFSANA Concierge is being connected. Please try again soon.' } });
      }
      const products = await Product.find({ storeId: 'main', status: 'Active', isDeleted: false })
        .select('name slug priceFrom tags fragrance notes content.shortDescription')
        .sort({ ratingCount: -1 })
        .limit(30)
        .lean();
      try {
        const reply = await generateAfsanaReply({
          message: body.message,
          history: body.history,
          products,
          env: process.env,
        });
        return { reply };
      } catch (error) {
        if (error?.code === 'AI_RATE_LIMIT') {
          return res(429, { error: { code: 'AI_RATE_LIMIT', message: 'The free AI limit is temporarily reached. Please try again later.' } });
        }
        if (error?.code === 'AI_NOT_CONFIGURED') {
          return res(503, { error: { code: 'AI_NOT_CONFIGURED', message: 'AFSANA Concierge is being connected. Please try again soon.' } });
        }
        console.error('[afsana-ai-concierge] request failed:', error?.code || 'provider_error');
        return res(503, { error: { code: 'AI_TEMPORARILY_UNAVAILABLE', message: 'AFSANA Concierge is temporarily unavailable. Please try again soon.' } });
      }
    },
  },
];

exports.handler = createHandler('ai', routes);
