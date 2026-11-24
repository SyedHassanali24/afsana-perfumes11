# AFSANA WhatsApp order notifications

This feature sends two separate transactional WhatsApp notifications after a new order is committed:

- Admin alert: sent to the admin recipient configured with the Worker secret \`WHATSAPP_ADMIN_PHONE\`.
- Customer confirmation: sent only when the customer ticks the separate **Send my order confirmation on WhatsApp** checkbox at checkout. The existing marketing-offer opt-in remains a separate choice.

WhatsApp sending is best-effort background work. A WhatsApp outage or missing configuration never blocks checkout or changes the existing email delivery.

## Cloudflare Worker configuration

In Cloudflare Dashboard, open **Workers & Pages → afsana-perfumes11 → Settings → Variables and Secrets**.

Add these as Worker secrets (never put the access token or recipient phone number in Git):

| Name | Value |
|---|---|
| \`WHATSAPP_ADMIN_PHONE\` | Admin WhatsApp recipient, international format, digits only. For the admin number supplied for AFSANA, use \`923252032321\`. |
| \`WHATSAPP_ACCESS_TOKEN\` | Existing Meta WhatsApp Cloud API access token |
| \`WHATSAPP_PHONE_NUMBER_ID\` | Phone Number ID of the approved AFSANA business sender |

Optional plain-text variables (these are template identifiers, not credentials):

| Name | Default |
|---|---|
| \`WHATSAPP_ADMIN_ORDER_TEMPLATE\` | \`afsana_new_order_alert\` |
| \`WHATSAPP_CUSTOMER_ORDER_TEMPLATE\` | \`afsana_order_confirmation\` |
| \`WHATSAPP_TEMPLATE_LANGUAGE\` | \`en_US\` |
| \`WHATSAPP_API_VERSION\` | \`v27.0\` |

The sender must be the AFSANA WhatsApp Business Platform phone number. A personal recipient phone number is not the sender ID.

## Meta message templates to create and get approved

Create both as **UTILITY** templates in WhatsApp Manager, using English (US), and wait for Meta to show **Approved**. The template names and body placeholders must match exactly because the Worker sends positional parameters.

### 1. Admin alert — \`afsana_new_order_alert\`

Body:
\`New AFSANA order {{1}} received. Customer: {{2}}. Phone: {{3}}. Items: {{4}}. Total: {{5}}. Payment: {{6}}. Please open the AFSANA admin dashboard to process this order.\`

Example values for Meta's template review:
- \`AFS-000123\`
- \`Ayesha Khan\`
- \`+923001234567\`
- \`Busy Man 50ml × 1\`
- \`PKR 7,500\`
- \`Cash on Delivery\`

### 2. Customer confirmation — \`afsana_order_confirmation\`

Body:
\`Hello {{1}}, we have received your AFSANA order {{2}}. Your order total is {{3}} and payment method is {{4}}. Track your order: {{5}}. Thank you for choosing AFSANA.\`

Example values:
- \`Ayesha\`
- \`AFS-000123\`
- \`PKR 7,500\`
- \`Cash on Delivery\`
- \`https://afsanaperfumes.store/track-order\`

Keep these templates transactional. Do not add sales, discounts, coupon offers, or promotional copy to a UTILITY template.

## Readiness and verification

- A valid production access token and approved AFSANA sender Phone Number ID are required.
- In Meta development mode, test recipients must be added to the app's allowed test-recipient list.
- Customer confirmations are sent only after explicit checkout consent. Admin alerts go only to the configured admin recipient.
- Cloud API acceptance is not the same as final delivery. Use WhatsApp webhooks / Meta message statuses to confirm delivery.
- If WhatsApp is not configured or Meta rejects a template, the order still succeeds and the existing email flow continues; the failure is logged without exposing access tokens or phone details.
