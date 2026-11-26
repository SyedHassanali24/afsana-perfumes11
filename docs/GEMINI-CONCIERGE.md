# AFSANA Gemini Concierge

The storefront Scent Concierge and incoming WhatsApp customer conversations use the same server-side Gemini integration. The API key is only read on the Worker/server; it is never included in frontend code.

## Configuration

Add `GEMINI_API_KEY` as a Cloudflare Worker secret and optionally set `GEMINI_MODEL=gemini-2.5-flash-lite`. The free-tier model is the default. The integration does not enable billing, use Google Search grounding, or fall back to a paid model. If Gemini returns a rate-limit response, the assistant stops and asks the visitor to try later.

The Gemini free tier may use submitted content to improve Google's products. The assistant therefore receives only public AFSANA catalogue details plus the visitor's message; email addresses, Pakistani phone numbers and AFSANA order references are redacted. Visitors are warned not to share personal, payment or delivery information. Do not send customer records, orders, addresses, email or phone data to Gemini.

## WhatsApp service replies

Incoming WhatsApp questions are answered only after the customer messages AFSANA, only when the inbound message belongs to the configured business phone-number ID, and only within Meta's 24-hour customer-service window. The existing monthly local cap of 1,000 outbound service replies is shared with the order-confirmation command. At the cap, the assistant stops sending; it has no paid fallback. STOP/unsubscribe messages are never sent to Gemini.

## Website

The current CMS `ai_concierge` section opens the chat UI. It calls `POST /api/ai/chat`, which reads the active public product catalogue and replies with the Gemini model. Chat history is kept only in the current browser session.
