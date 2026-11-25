# AFSANA WhatsApp — customer-initiated order confirmation

AFSANA keeps WhatsApp transactional replies separate from marketing and bulk campaigns. There is no paid provider or unofficial WhatsApp Web automation.

## Customer order confirmation flow

1. The customer places an order on AFSANA.
2. The order success page shows **Confirm on WhatsApp** with a prefilled message: **Confirm AFSANA order AFS-...**.
3. The customer opens WhatsApp and presses **Send**.
4. The Cloudflare webhook receives that customer message. The Worker matches the order number and verifies that the WhatsApp sender is the phone saved on that order.
5. Only for a matching order, AFSANA sends one plain-text, non-template reply inside the customer-initiated 24-hour service window. This customer-initiated request authorizes that confirmation reply only; it does not enrol the customer in marketing or ongoing order-update messages.
6. The existing admin dashboard notification and email alert remain unchanged.

If the order number or phone does not match, AFSANA does not disclose order information and does not send a reply.

## Monthly free service-message hard limit

- The application reserves a maximum of **1,000 automated service-reply attempts per business phone number per billing month**. This local cap is conservative and may stop earlier than Meta's delivered-message count when an API attempt fails.
- The monthly counter is keyed by the WhatsApp Business phone-number ID and uses **WHATSAPP_BILLING_TIME_ZONE** (defaults to **Asia/Karachi**).
- A slot is reserved before calling Meta. This is intentionally conservative: failed API attempts also use a local slot so the application cannot accidentally exceed its own 1,000-attempt cap.
- At 1,000 reservations, the Worker stops sending automated replies until the next billing month. There is no paid fallback, no template send, and no payment method is added.
- This local hard limit controls AFSANA's automated confirmation replies. Do not send other API service messages from the same business phone number outside this integration unless their usage is also counted.

## Required Cloudflare Worker secrets / variables

- **WHATSAPP_ACCESS_TOKEN**: a valid System User access token with whatsapp_business_messaging permission.
- **WHATSAPP_PHONE_NUMBER_ID**: the numeric ID of the connected AFSANA WhatsApp Business Platform sender number (not the visible phone number).
- **META_APP_SECRET**: verifies Meta webhook signatures.
- **WHATSAPP_VERIFY_TOKEN**: validates the Meta webhook subscription.
- Optional **WHATSAPP_GRAPH_API_VERSION**: defaults to **v26.0** (the current Meta Graph API version as of November 25, 2026).
- Optional **WHATSAPP_BILLING_TIME_ZONE**: defaults to **Asia/Karachi**; set this to the WhatsApp Business Account's billing timezone if it differs.

Webhook callback URL:
https://afsanaperfumes.store/api/whatsapp/webhook

Subscribe to the WhatsApp **messages** webhook field. The existing webhook route validates X-Hub-Signature-256 before processing events.

## What remains manual

- WhatsApp marketing campaigns and offer sharing remain manual.
- No automatic admin WhatsApp alert is sent to the sender number itself.
- The dashboard bell and email alerts remain active.
- The app never sends templates or messages outside the 24-hour window.

## Safety and delivery notes

The API reply is attempted only after a fresh inbound customer message. Meta must accept the number, token, app mode and webhook subscription. If credentials are missing or invalid, no outbound request is made or the API error is recorded; the app never switches to a paid vendor.
