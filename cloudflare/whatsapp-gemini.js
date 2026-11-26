import { reserveFreeReplySlot } from './whatsapp-order-confirmation.js';
import gemini from '../services/geminiConcierge.js';
import whatsapp from '../services/whatsappService.js';

const { generateAfsanaReply, sanitizeChatText } = gemini;
const { sendWhatsAppText } = whatsapp;
const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;
let conversationIndexPromise;

function messageBody(message) {
  return String(
    message?.text?.body ||
    message?.button?.text ||
    message?.interactive?.button_reply?.title ||
    message?.interactive?.list_reply?.title ||
    ''
  ).trim();
}

function validTimestamp(message, now) {
  const inboundAt = Number(message?.timestamp) * 1000;
  return Number.isFinite(inboundAt) && inboundAt > 0 &&
    now.getTime() >= inboundAt - 5 * 60 * 1000 &&
    now.getTime() - inboundAt <= SERVICE_WINDOW_MS;
}

function digits(value) {
  return String(value || '').replace(/\D/g, '');
}

async function conversationId(phoneNumberId, from) {
  const bytes = new TextEncoder().encode(phoneNumberId + ':' + from);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return 'wa:' + Array.from(new Uint8Array(digest)).map((n) => n.toString(16).padStart(2, '0')).join('');
}

async function ensureConversationIndex(collection) {
  if (!conversationIndexPromise) {
    conversationIndexPromise = collection.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 }).catch(() => null);
  }
  await conversationIndexPromise;
}

async function markAttempt(db, messageId, values) {
  await db.collection('whatsapp_service_reply_attempts').updateOne(
    { _id: messageId },
    { $set: { ...values, updatedAt: new Date() } },
  );
}

export async function handleAfsanaGeminiReply({
  db,
  message,
  text,
  inboundPhoneNumberId,
  env = {},
  fetchImpl = fetch,
  now = new Date(),
}) {
  const body = String(text || messageBody(message)).trim();
  if (!body || !message?.id || !message?.from) return { handled: false };
  if (!validTimestamp(message, now)) return { handled: true, sent: false, reason: 'service_window_expired' };

  const phoneNumberId = String(env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  if (!/^\d+$/.test(phoneNumberId) || String(inboundPhoneNumberId || '') !== phoneNumberId) {
    return { handled: true, sent: false, reason: 'business_number_mismatch' };
  }
  if (!String(env.WHATSAPP_ACCESS_TOKEN || '').trim() || !String(env.GEMINI_API_KEY || '').trim()) {
    return { handled: true, sent: false, reason: 'not_configured' };
  }

  const from = digits(message.from);
  if (!/^[1-9]\d{7,14}$/.test(from)) return { handled: false, reason: 'invalid_sender' };

  const reservation = await reserveFreeReplySlot(db, {
    phoneNumberId,
    messageId: message.id,
    from,
    now,
    timeZone: env.WHATSAPP_BILLING_TIME_ZONE || 'Asia/Karachi',
  });
  if (!reservation.reserved) return { handled: true, sent: false, reason: reservation.reason };

  try {
    const conversations = db.collection('whatsapp_ai_conversations');
    await ensureConversationIndex(conversations);
    const key = await conversationId(phoneNumberId, from);
    const existing = await conversations.findOne({ _id: key, expireAt: { $gt: now } });
    const history = (existing?.messages || []).slice(-8);
    const products = await db.collection('products')
      .find({ storeId: 'main', status: 'Active', isDeleted: false }, {
        projection: { name: 1, slug: 1, priceFrom: 1, tags: 1, fragrance: 1, notes: 1, 'content.shortDescription': 1 },
      })
      .sort({ ratingCount: -1 })
      .limit(30)
      .toArray();

    const safeMessage = sanitizeChatText(body);
    const reply = await generateAfsanaReply({
      message: safeMessage,
      history,
      products,
      env,
      fetchImpl,
    });
    const sent = await sendWhatsAppText({ to: from, text: reply }, { env, fetchImpl });
    if (!sent.sent) {
      await markAttempt(db, message.id, { status: 'send_failed', reason: sent.reason || 'whatsapp_send_failed' });
      return { handled: true, sent: false, reason: sent.reason || 'whatsapp_send_failed' };
    }

    await conversations.updateOne(
      { _id: key },
      {
        $set: { updatedAt: now, expireAt: new Date(now.getTime() + SERVICE_WINDOW_MS) },
        $push: {
          messages: {
            $each: [
              { role: 'user', text: safeMessage, at: now },
              { role: 'model', text: reply, at: now },
            ],
            $slice: -10,
          },
        },
      },
      { upsert: true },
    );
    await markAttempt(db, message.id, {
      status: 'accepted',
      outboundMessageId: sent.messageId || null,
      replyType: 'gemini_service',
    });
    return { handled: true, sent: true, month: reservation.month };
  } catch (error) {
    await markAttempt(db, message.id, {
      status: 'send_failed',
      reason: String(error?.code || 'ai_or_whatsapp_error').slice(0, 120),
    });
    return { handled: true, sent: false, reason: error?.code || 'ai_or_whatsapp_error' };
  }
}
