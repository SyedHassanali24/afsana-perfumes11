import test from "node:test";
import assert from "node:assert/strict";
import {
  FREE_SERVICE_REPLY_LIMIT,
  handleAfsanaOrderConfirmation,
  parseAfsanaOrderConfirmation
} from "../cloudflare/whatsapp-order-confirmation.js";

function fakeDb({ count = 0, order } = {}) {
  const counters = new Map();
  const attempts = new Map();
  if (count > 0) counters.set("123456789:2026-11", { _id: "123456789:2026-11", count });
  const storedOrder = order || {
    _id: "order-id",
    storeId: "main",
    orderNumber: "AFS-000123",
    customer: { name: "Test Customer", phone: "+923132956206" },
    shippingAddress: { phone: "+923132956206" },
    total: 7500,
    paymentMethod: "COD",
    status: "New"
  };
  const collections = {
    orders: {
      findOne: async ({ orderNumber }) => storedOrder.orderNumber === orderNumber ? storedOrder : null,
      updateOne: async (_filter, update) => {
        Object.assign(storedOrder, update.$set || {});
        return { matchedCount: 1 };
      }
    },
    whatsapp_service_reply_attempts: {
      insertOne: async (doc) => {
        if (attempts.has(doc._id)) throw Object.assign(new Error("duplicate"), { code: 11000 });
        attempts.set(doc._id, { ...doc });
        return { insertedId: doc._id };
      },
      updateOne: async ({ _id }, update) => {
        const row = attempts.get(_id);
        if (row) Object.assign(row, update.$set || {});
        return { matchedCount: row ? 1 : 0 };
      }
    },
    whatsapp_service_usage: {
      updateOne: async (filter, update, options) => {
        const row = counters.get(filter._id);
        if (row) {
          if (row.count >= filter.count.$lt) {
            if (options?.upsert) throw Object.assign(new Error("duplicate"), { code: 11000 });
            return { matchedCount: 0, upsertedCount: 0 };
          }
          row.count += update.$inc.count;
          return { matchedCount: 1, upsertedCount: 0 };
        }
        if (!options?.upsert) return { matchedCount: 0, upsertedCount: 0 };
        const created = { _id: filter._id, ...update.$setOnInsert, count: update.$inc.count };
        counters.set(filter._id, created);
        return { matchedCount: 0, upsertedCount: 1 };
      }
    }
  };
  return {
    collection(name) { return collections[name]; },
    inspect: { counters, attempts, order: storedOrder }
  };
}

const env = {
  WHATSAPP_ACCESS_TOKEN: "test-token",
  WHATSAPP_PHONE_NUMBER_ID: "123456789",
  WHATSAPP_GRAPH_API_VERSION: "v26.0",
  WHATSAPP_BILLING_TIME_ZONE: "Asia/Karachi"
};
const inbound = (id = "wamid.test.1", from = "923132956206") => ({
  id,
  from,
  type: "text",
  text: { body: "Confirm AFSANA order AFS-000123" }
});

test("order confirmation command accepts only the generated AFSANA format", () => {
  assert.equal(parseAfsanaOrderConfirmation("Confirm AFSANA order AFS-000123"), "AFS-000123");
  assert.equal(parseAfsanaOrderConfirmation("hello AFSANA"), null);
  assert.equal(parseAfsanaOrderConfirmation("Confirm AFSANA order OTHER-123"), null);
});

test("a matching customer gets one non-template reply and order updates consent is recorded", async () => {
  const db = fakeDb();
  let request;
  const result = await handleAfsanaOrderConfirmation({
    db, message: inbound(), env,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, status: 200, json: async () => ({ messages: [{ id: "wamid.out.1" }] }) };
    },
    now: new Date("2026-11-25T08:00:00.000Z")
  });
  assert.equal(result.sent, true);
  assert.match(request.url, /v26\.0\/123456789\/messages$/);
  const body = JSON.parse(request.options.body);
  assert.equal(body.type, "text");
  assert.equal(body.to, "923132956206");
  assert.match(body.text.body, /AFS-000123/);
  assert.equal(db.inspect.order.whatsappOrderUpdatesOptIn, true);
  assert.equal(db.inspect.counters.get("123456789:2026-11").count, 1);
});

test("a different phone number cannot read or receive an order confirmation", async () => {
  const db = fakeDb();
  let called = false;
  const result = await handleAfsanaOrderConfirmation({
    db, message: inbound("wamid.mismatch", "923001112233"), env,
    fetchImpl: async () => { called = true; return { ok: true, status: 200, json: async () => ({}) }; }
  });
  assert.equal(result.reason, "sender_order_mismatch");
  assert.equal(called, false);
  assert.equal(db.inspect.counters.size, 0);
});

test("the system refuses the 1,001st monthly reply before calling WhatsApp", async () => {
  const db = fakeDb({ count: FREE_SERVICE_REPLY_LIMIT });
  let called = false;
  const result = await handleAfsanaOrderConfirmation({
    db, message: inbound("wamid.over-limit"), env,
    fetchImpl: async () => { called = true; return { ok: true, status: 200, json: async () => ({}) }; },
    now: new Date("2026-11-25T08:00:00.000Z")
  });
  assert.equal(result.reason, "free_limit_reached");
  assert.equal(called, false);
  assert.equal(db.inspect.counters.get("123456789:2026-11").count, FREE_SERVICE_REPLY_LIMIT);
});

test("duplicate webhook delivery does not consume a second free slot or send again", async () => {
  const db = fakeDb();
  let calls = 0;
  const options = {
    db, message: inbound("wamid.duplicate"), env,
    fetchImpl: async () => { calls += 1; return { ok: true, status: 200, json: async () => ({}) }; },
    now: new Date("2026-11-25T08:00:00.000Z")
  };
  const first = await handleAfsanaOrderConfirmation(options);
  const second = await handleAfsanaOrderConfirmation(options);
  assert.equal(first.sent, true);
  assert.equal(second.reason, "duplicate_inbound_message");
  assert.equal(calls, 1);
  assert.equal(db.inspect.counters.get("123456789:2026-11").count, 1);
});
