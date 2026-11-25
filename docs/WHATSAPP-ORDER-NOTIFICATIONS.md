# AFSANA WhatsApp — zero-cost manual mode

AFSANA is configured to operate WhatsApp with **no paid WhatsApp Cloud API sending**.

## What stays available

- The admin notification bell remains active.
- Existing admin and customer email notifications remain active.
- The website Contact, Gifting, login-help and floating WhatsApp links open a manual WhatsApp chat to the AFSANA support number **+92 313 2956206**.
- Checkout can record optional consent for manual order contact and manually shared offers.
- The admin WhatsApp Marketing page can save offer drafts for contacts who explicitly opted in. It shows the consent-based audience count and provides a WhatsApp share link. The admin selects the recipient or broadcast list and presses Send manually in WhatsApp.

## What is disabled

- No automatic admin WhatsApp alerts.
- No automatic customer order-confirmation messages.
- No WhatsApp Cloud API calls from the application.
- No automated or bulk campaign sending from the server.
- Campaign start/process API routes reject automatic sending in zero-cost mode.

The application-side WhatsApp sender returns `manual_only` without making a network request, even if old credentials are present. The Cloudflare Worker credentials `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` should be removed from the Worker to prevent accidental API use.

## Manual offer sharing

1. Open Admin → WhatsApp Marketing.
2. Create and save an offer draft.
3. In Offer draft history, click **Open WhatsApp to share**.
4. In WhatsApp choose the recipient or broadcast list, review the message and press Send yourself.

Only contacts with stored WhatsApp marketing consent are counted for the draft audience. Creating a draft does not send a message or start a campaign.

## Costs

AFSANA does not pay Meta WhatsApp Cloud API message charges in this mode. WhatsApp manual sharing uses the normal internet/mobile data connection already available to the sender. No payment method is required for the AFSANA website to create a draft or open a WhatsApp share link.

## Webhook

The existing webhook route may remain available for inbound Meta events and consent opt-out handling. It does not send outbound WhatsApp messages.
