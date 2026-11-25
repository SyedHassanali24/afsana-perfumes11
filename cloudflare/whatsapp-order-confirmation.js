const FREE_SERVICE_REPLY_LIMIT = 1000;

function phoneDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function samePakistaniPhone(a, b) {
  const left = phoneDigits(a).slice(-10);
  const right = phoneDigits(b).slice(-10);
  return left.length === 10 && right.length === 10 && left === right;
}

export function parseAfsanaOrderConfirmation(text) {
  const match = /^\s*confirm\s+afsana\s+order\s+(AFS-[A-Z0-9-]{3,30})\s*$/i.exec(String(text || ""));
  return match ? match[1].toUpperCase() : null;
}

function billingMonth(now, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timeZone || "Asia/Karachi",
    year: "numeric",
    month: "2-digit"
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return year + "-" + month;
}

async function markAttempt(attempts, messageId, values) {
  await attempts.updateOne({ _id: messageId }, { $set: values });
}

async function reserveFreeReplySlot(db, { phoneNumberId, messageId, from, now, timeZone }) {
  const attempts = db.collection("whatsapp_service_reply_attempts");
  try {
    await attempts.insertOne({
      _id: messageId,
      from,
      phoneNumberId,
      createdAt: now,
      status: "reserved"
    });
  } catch (error) {
    if (error?.code === 11000) return { reserved: false, reason: "duplicate_inbound_message" };
    throw error;
  }

  const month = billingMonth(now, timeZone);
  const counterId = phoneNumberId + ":" + month;
  try {
    const result = await db.collection("whatsapp_service_usage").updateOne(
      { _id: counterId, count: { $lt: FREE_SERVICE_REPLY_LIMIT } },
      {
        $inc: { count: 1 },
        $setOnInsert: { phoneNumberId, month, createdAt: now },
        $set: { updatedAt: now }
      },
      { upsert: true }
    );
    if (result.matchedCount === 1 || result.upsertedCount === 1) {
      return { reserved: true, month, counterId };
    }
  } catch (error) {
    if (error?.code !== 11000) throw error;
  }

  await markAttempt(attempts, messageId, { status: "free_limit_reached", month, updatedAt: now });
  return { reserved: false, reason: "free_limit_reached", month };
}

function formatOrderReply(order) {
  const amount = Math.max(0, Math.round(Number(order.total || 0))).toLocaleString("en-PK");
  const paymentLabels = {
    COD: "Cash on Delivery",
    BANK_TRANSFER: "Bank Transfer",
    CARD: "Card"
  };
  const payment = paymentLabels[order.paymentMethod] || String(order.paymentMethod || "—");
  const status = String(order.status || "New");
  return [
    "Assalam-o-Alaikum " + String(order.customer?.name || "there").trim() + ",",
    "Thank you for choosing AFSANA — THE ART OF SCENT.",
    "We have received your order " + order.orderNumber + " successfully.",
    "Total: PKR " + amount,
    "Payment: " + payment,
    "Current status: " + status,
    "Track your order: https://afsanaperfumes.store/track?order=" + encodeURIComponent(order.orderNumber)
  ].join("\n");
}

export async function handleAfsanaOrderConfirmation({
  db,
  message,
  env = {},
  fetchImpl = fetch,
  now = new Date()
}) {
  const orderNumber = parseAfsanaOrderConfirmation(message?.text?.body);
  if (!orderNumber || !message?.id || !message?.from) return { handled: false };

  // Meta service replies are permitted only while the inbound customer's
  // 24-hour service window is open. Never send a delayed webhook reply.
  const inboundAt = Number(message.timestamp) * 1000;
  if (!Number.isFinite(inboundAt) || inboundAt <= 0 || now.getTime() < inboundAt - 5 * 60 * 1000) {
    return { handled: true, sent: false, reason: "invalid_message_timestamp" };
  }
  if (now.getTime() - inboundAt > 24 * 60 * 60 * 1000) {
    return { handled: true, sent: false, reason: "service_window_expired" };
  }

  const from = phoneDigits(message.from);
  if (!/^[1-9]\d{7,14}$/.test(from)) return { handled: false, reason: "invalid_sender" };

  const orders = db.collection("orders");
  const order = await orders.findOne({ orderNumber });
  if (!order || (order.storeId && order.storeId !== "main")) {
    return { handled: false, reason: "order_not_found" };
  }

  const orderPhones = [order.customer?.phone, order.shippingAddress?.phone].filter(Boolean);
  if (!orderPhones.some((phone) => samePakistaniPhone(phone, from))) {
    return { handled: false, reason: "sender_order_mismatch" };
  }

  // The customer's inbound request authorizes this one confirmation reply only.
  // It does not opt the customer into marketing or ongoing order updates.

  const accessToken = String(env.WHATSAPP_ACCESS_TOKEN || "").trim();
  const phoneNumberId = String(env.WHATSAPP_PHONE_NUMBER_ID || "").trim();
  if (!accessToken || !/^\d+$/.test(phoneNumberId)) {
    return { handled: true, sent: false, reason: "not_configured" };
  }

  const reservation = await reserveFreeReplySlot(db, {
    phoneNumberId,
    messageId: message.id,
    from,
    now,
    timeZone: env.WHATSAPP_BILLING_TIME_ZONE || "Asia/Karachi"
  });
  if (!reservation.reserved) {
    return { handled: true, sent: false, reason: reservation.reason, month: reservation.month };
  }

  const version = String(env.WHATSAPP_GRAPH_API_VERSION || "v26.0").trim();
  if (!/^v\d+\.\d+$/.test(version)) {
    await markAttempt(db.collection("whatsapp_service_reply_attempts"), message.id, {
      status: "configuration_error",
      reason: "invalid_graph_api_version",
      updatedAt: now
    });
    return { handled: true, sent: false, reason: "configuration_error" };
  }

  let response;
  try {
    response = await fetchImpl(
      "https://graph.facebook.com/" + version + "/" + phoneNumberId + "/messages",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + accessToken,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: from,
          type: "text",
          text: { preview_url: false, body: formatOrderReply(order) }
        })
      }
    );
  } catch (error) {
    await markAttempt(db.collection("whatsapp_service_reply_attempts"), message.id, {
      status: "send_failed",
      reason: String(error?.message || "network_error").slice(0, 240),
      updatedAt: now
    });
    return { handled: true, sent: false, reason: "send_failed" };
  }

  if (!response.ok) {
    const details = (await response.text().catch(() => "")).slice(0, 500);
    await markAttempt(db.collection("whatsapp_service_reply_attempts"), message.id, {
      status: "send_failed",
      httpStatus: response.status,
      reason: details || "WhatsApp API rejected the reply.",
      updatedAt: now
    });
    return { handled: true, sent: false, reason: "send_failed", httpStatus: response.status };
  }

  const payload = await response.json().catch(() => ({}));
  await markAttempt(db.collection("whatsapp_service_reply_attempts"), message.id, {
    status: "accepted",
    outboundMessageId: payload?.messages?.[0]?.id || null,
    updatedAt: now
  });
  return { handled: true, sent: true, month: reservation.month };
}

export { FREE_SERVICE_REPLY_LIMIT };
