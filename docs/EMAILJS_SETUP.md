# AFSANA email delivery and OTP setup

AFSANA sends administrator login/password-reset OTPs and customer password-reset links through configured Worker-side email providers. Provider credentials remain in Cloudflare secrets; never add them to frontend code or chat.

## Provider behavior

**Administrator OTPs** use this fallback order:
1. EmailJS, when all four EmailJS values are present.
2. Gmail OAuth, when its client ID, client secret and refresh token are present.
3. Resend, when both its API key and sender address are present.

A partial or failing EmailJS setup does not block a separately configured Gmail or Resend provider. If every configured provider fails, the API returns a safe \`503 EMAIL_UNAVAILABLE\` response; it must not claim that an OTP was sent.

**Customer password-reset links** use:
1. Gmail OAuth.
2. Resend.
3. EmailJS only when a dedicated \`EMAILJS_PASSWORD_RESET_TEMPLATE_ID\` is configured.

The Worker health response (\`/api/health\`) reports \`emailProviders.adminOtp\` and \`emailProviders.customerPasswordReset\` separately. A green configuration check means the required provider credentials exist; it does not prove that a real message reached the recipient inbox.

## 1. EmailJS administrator OTP template

1. Create/sign in to EmailJS: https://www.emailjs.com/
2. Open Email Services and connect the AFSANA sender Gmail account.
3. Create an Email Template for OTP messages.
4. Set **To Email** to exactly \`{{to_email}}\` (do not hard-code an address).
5. Set **From Name** to \`AFSANA Security\`.
6. Set **Subject** to \`{{subject}}\`.
7. Use this content:

AFSANA · THE ART OF SCENT

Security verification

Your \`{{purpose}}\` code is:

\`{{otp}}\`

This code expires in \`{{expiry_minutes}}\` minutes. If you did not request it, ignore this message.

The code expires in 5 minutes for new-device administrator login verification and 10 minutes for staff password-reset verification.

## 2. EmailJS customer password-reset template (optional)

Customer reset does not use the OTP template. Create a separate template only if you want EmailJS to deliver customer reset links and Gmail/Resend are unavailable or not preferred.

Suggested fields:
- **To Email:** \`{{to_email}}\`
- **Subject:** \`{{subject}}\`
- **Reset button/link:** \`{{reset_url}}\`
- Optional text: \`{{message}}\`
- Expiry label: \`{{expiry_minutes}}\` (30 minutes)
- Brand label: \`{{app_name}}\`

Add its template ID as the Worker secret \`EMAILJS_PASSWORD_RESET_TEMPLATE_ID\`. The link must remain exactly as provided by the Worker; it is an HTTPS, single-use reset URL.

## 3. Cloudflare Worker variables and secrets

Open Cloudflare → Workers & Pages → \`afsana-perfumes11\` → Settings → Variables and Secrets.

EmailJS values (all four are needed for its OTP provider):
| Name | Type |
| --- | --- |
| \`EMAILJS_SERVICE_ID\` | Secret |
| \`EMAILJS_TEMPLATE_ID\` | Secret |
| \`EMAILJS_PUBLIC_KEY\` | Secret |
| \`EMAILJS_PRIVATE_KEY\` | Secret |

Optional EmailJS reset template:
| Name | Type |
| --- | --- |
| \`EMAILJS_PASSWORD_RESET_TEMPLATE_ID\` | Secret |

Gmail OAuth values (used for OTP fallback and customer password resets):
| Name | Type |
| --- | --- |
| \`GMAIL_CLIENT_ID\` | Secret |
| \`GMAIL_CLIENT_SECRET\` | Secret |
| \`GMAIL_REFRESH_TOKEN\` | Secret |
| \`GMAIL_SENDER_EMAIL\` | Secret, optional |

The configured \`OWNER_EMAIL\` is used as the fallback sender address when \`GMAIL_SENDER_EMAIL\` is absent. Resend can also be configured with \`RESEND_API_KEY\` and \`EMAIL_FROM\`.

Do not paste credentials into ChatGPT or commit them to Git.

## 4. Real delivery verification

The automated tests mock the provider network and verify:
- EmailJS-to-Gmail fallback for administrator OTPs.
- Partial EmailJS configuration does not block a separately configured provider.
- Gmail OAuth customer reset delivery formatting and safe 503 handling on provider outage.
- Customer email lookup is case-insensitive and exact.
- Missing customer reset provider is reported as unavailable rather than silently logging a fake send.

A real inbox check is still required:
1. In a private browser/device, start a new-device administrator login and confirm the OTP arrives in the configured owner inbox.
2. Use a dedicated test customer account with a saved email to request a password-reset link and confirm it arrives.
3. Complete the reset with the single-use link and sign in with the new password.
4. Do not intentionally enter three wrong passwords on the real Owner account; its lockout is 3 minutes.

EmailJS documents a one-request-per-second API limit. Use it for low-volume security messages, not bulk campaigns. Check the provider's current pricing/quota before planning campaign email.
