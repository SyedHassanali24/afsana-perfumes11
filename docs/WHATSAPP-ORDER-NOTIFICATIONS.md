# AFSANA WhatsApp order notifications

This feature sends two separate transactional WhatsApp notifications after a new order is committed:

- Admin alert: sent to the admin recipient configured with the Worker secret `WHATSAPP_ADMIN_PHONE`.
- Customer confirmation: sent only when the customer ticks the separate **Send my order confirmation on WhatsApp** checkbox at checkout. The existing marketing-offer opt-in remains a separate choice.

WhatsApp sending is best-effort background work. A WhatsApp outage or missing configuration never blocks checkout or changes the existing email delivery.

## Cloudflare Worker configuration

In Cloudflare Dashboard, open **Workers & Pages → afsana-perfumes11 → Settings → Variables and Secrets**.

Add these as Worker secrets (never put the access token or recipient phone number in Git):

| Name | Value |
|---|---|
| `WHATSAPP_ADMIN_PHONE` | Admin WhatsApp recipient, international format, digits only. For the admin number supplied for AFSANA, use `<admin WhatsApp number in international digits-only format>`. |
| `WHATSAPP_ACCESS_TOKEN` | Existing Meta WhatsApp Cloud API access token |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone Number ID of the approved AFSANA business sender |

Optional plain-text variables (these are template identifiers, not credentials):

| Name | Default |
|---|---|
| `WHATSAPP_ADMIN_ORDER_TEMPLATE` | `afsana_new_order_alert` |
| `WHATSAPP_CUSTOMER_ORDER_TEMPLATE` | `afsana_order_confirmation` |
| `WHATSAPP_SITE_ALERT_TEMPLATE` | `afsana_site_alert` |
| `WHATSAPP_MARKETING_TEMPLATE` | `afsana_sale_offer` |
| `WHATSAPP_TEMPLATE_LANGUAGE` | `en_US` |
| `WHATSAPP_API_VERSION` | `v27.0` |

The sender must be the AFSANA WhatsApp Business Platform phone number. A personal recipient phone number is not the sender ID.

## Meta message templates to create and get approved

Create both as **UTILITY** templates in WhatsApp Manager, using English (US), and wait for Meta to show **Approved**. The template names and body placeholders must match exactly because the Worker sends positional parameters.

### 1. Admin alert — `afsana_new_order_alert`

Body:
`New AFSANA order {{1}} received. Customer: {{2}}. Phone: {{3}}. Items: {{4}}. Total: {{5}}. Payment: {{6}}. Please open the AFSANA admin dashboard to process this order.`

Example values for Meta's template review:
- `AFS-000123`
- `Ayesha Khan`
- `+923001234567`
- `Busy Man 50ml × 1`
- `PKR 7,500`
- `Cash on Delivery`

### 2. Customer confirmation — `afsana_order_confirmation`

Body:
`Hello {{1}}, we have received your AFSANA order {{2}}. Your order total is {{3}} and payment method is {{4}}. Track your order: {{5}}. Thank you for choosing AFSANA.`

Example values:
- `Ayesha`
- `AFS-000123`
- `PKR 7,500`
- `Cash on Delivery`
- `https://afsanaperfumes.store/track-order`

Keep these templates transactional. Do not add sales, discounts, coupon offers, or promotional copy to a UTILITY template.


## Website alerts to the admin WhatsApp

The existing central admin alert service now also sends a WhatsApp notification to the same `WHATSAPP_ADMIN_PHONE` recipient. This includes website events that use the shared `notifyAdmin()` path (for example low stock, new reviews, return requests and staff/profile alerts). New orders keep their dedicated `afsana_new_order_alert` template to avoid duplicate order alerts.

Create and get this template approved as **UTILITY** (English US):

### 3. Website admin alert — `afsana_site_alert`

Body:
`AFSANA website alert: {{1}}. {{2}}. Open dashboard: {{3}}`

Parameters are the alert title, a short detail, and the dashboard link.

## WhatsApp sale campaigns

The admin dashboard has a separate **WhatsApp Marketing** page at `/admin/whatsapp-marketing`. It prepares a draft and shows the unique eligible audience before sending. The admin must press **Send offer** and confirm the audience; preparing a draft never sends messages. Campaigns are paced in batches and delivery acceptance/failures are tracked.

The audience includes only:
- Customer profiles where `whatsappMarketingConsent` is true (captured by the explicit WhatsApp offers checkbox at checkout).
- Existing welcome-offer leads where `marketingConsent` is true and the lead has not unsubscribed.

A phone number present in an order or customer record is **not** marketing permission. The campaign audience is deduplicated by international phone number and limited to 5,000 recipients per campaign. Consent is checked again immediately before every send, so contacts who opt out or change their number are skipped.

Create and get this template approved as **MARKETING** (English US):

### 4. Sale offer — `afsana_sale_offer`

Body:
`Hello {{1}}, AFSANA offer {{2}}: {{3}} Promo code: {{4}}. Shop now: {{5}}. Reply STOP to stop promotional messages.`

Parameters are customer name, campaign name, offer message, promo code (or “No code required”), and the HTTPS shop link. Keep the template category as MARKETING because it carries promotional offers.

### Opt-out handling

When a customer replies with `STOP`, `STOP ALL`, `STOP OFFERS`, `STOP PROMOTIONS`, `UNSUBSCRIBE`, `CANCEL`, `END` or `QUIT`, the verified WhatsApp webhook marks the number as opted out from marketing on both the customer profile and welcome-offer lead. Future sale campaigns skip that number. Transactional order-confirmation consent remains separate from promotional consent.

**Billing:** WhatsApp marketing messages may be charged by Meta per delivered message. The campaign page displays the audience count and warns before sending; check the current WhatsApp Manager rate card and billing balance before confirming. No bulk campaign is sent automatically.

## Readiness and verification

- A valid production access token and approved AFSANA sender Phone Number ID are required.
- In Meta development mode, test recipients must be added to the app's allowed test-recipient list.
- Customer confirmations are sent only after explicit checkout consent. Admin alerts go only to the configured admin recipient.
- Cloud API acceptance is not the same as final delivery. Use WhatsApp webhooks / Meta message statuses to confirm delivery.
- If WhatsApp is not configured or Meta rejects a template, the order still succeeds and the existing email flow continues; the failure is logged without exposing access tokens or phone details.
