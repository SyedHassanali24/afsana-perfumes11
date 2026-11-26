# AFSANA WhatsApp order-confirmation template

The automatic checkout message is an optional, business-initiated WhatsApp Utility template. It is separate from the free-form 24-hour service replies and is disabled by default so no paid message is sent until AFSANA explicitly enables it.

## Template to submit in WhatsApp Manager

- Name: `afsana_order_confirmation`
- Category: `Utility`
- Language: `English (US) / en_US`
- Body:

```text
Assalam-o-Alaikum {{1}},

Thank you for placing your order with AFSANA — THE ART OF SCENT.

We have received your order {{2}} successfully.
Order total: PKR {{3}}.

Our team will process it shortly.
Track your order: https://afsanaperfumes.store/track
```

Use three BODY text variables in this order: customer name, order number, and order total. Submit it for approval. Keep it strictly transactional; do not add coupons or promotional copy.

## Worker configuration after approval

Set these on the `afsana-perfumes11` Worker:

- Secret `WHATSAPP_ACCESS_TOKEN`
- Secret `WHATSAPP_PHONE_NUMBER_ID`
- Variable `WHATSAPP_ORDER_TEMPLATE_NAME=afsana_order_confirmation`
- Variable `WHATSAPP_ORDER_TEMPLATE_LANGUAGE=en_US`
- Variable `WHATSAPP_ORDER_CONFIRMATION_ENABLED=true`

A checkout sends the template only when the customer ticks the separate WhatsApp order-confirmation consent checkbox and all settings exist. Marketing consent remains separate. There is no automatic retry, paid provider fallback, or automatic message without explicit customer consent. Meta may charge for delivered Utility templates. If the flag is not exactly `true`, the send is skipped.
