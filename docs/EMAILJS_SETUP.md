# AFSANA EmailJS OTP setup

This integration sends staff password-reset and privileged admin sign-in OTPs from the Cloudflare Worker through EmailJS. One email template handles both message types. The EmailJS private key stays on the server.

## 1. Connect the sending Gmail account

1. Create or sign in to an EmailJS account: https://www.emailjs.com/
2. Open Email Services and add Gmail.
3. Connect the AFSANA owner inbox (the address configured as OWNER_EMAIL in Cloudflare).
4. Send the dashboard test email and confirm it arrives before continuing.

EmailJS currently advertises 200 requests/month and 2 templates on its Free plan, and documents a one-request-per-second API limit. Check the pricing page for current terms before depending on the quota.

## 2. Create one security template

In Email Templates, create a single template that both OTP flows will use.

- To Email: {{to_email}}
- From Name: AFSANA Security
- Subject: {{subject}}
- Content:

AFSANA · THE ART OF SCENT

Security verification

Your {{purpose}} code is:

{{otp}}

This code expires in {{expiry_minutes}} minutes.
If you did not request this code, ignore this email.

Save the template. Do not hard-code a recipient in To Email. It must be exactly {{to_email}} so the Worker can address each message to the configured owner inbox.

## 3. Copy the four EmailJS identifiers and keys

From the EmailJS dashboard, note the Service ID from Email Services, the Template ID from the new template, and the Public Key plus Private Key from Account → General / API Keys.

Do not send these keys in ChatGPT. Add them directly to Cloudflare.

## 4. Add Cloudflare Worker secrets

Open Cloudflare → Workers & Pages → afsana-perfumes11 → Settings → Variables and Secrets. Add each value as a Secret:

| Secret name | Value |
| --- | --- |
| EMAILJS_SERVICE_ID | EmailJS Service ID |
| EMAILJS_TEMPLATE_ID | EmailJS Template ID |
| EMAILJS_PUBLIC_KEY | EmailJS Public Key |
| EMAILJS_PRIVATE_KEY | EmailJS Private Key |

Keep existing Gmail OAuth and Resend secrets in place for now. When all four EmailJS secrets exist, the Worker selects EmailJS first. If none are configured, existing provider selection remains unchanged. A partial EmailJS configuration fails clearly instead of silently falling back.

## 5. Verify both OTP flows

1. Open a private browser window and sign in to AFSANA Admin from an untrusted device. The six-digit login verification code should reach the owner inbox and expires in 5 minutes.
2. Use a dedicated test staff account to request a password reset. The reset OTP should reach the same owner inbox and expires in 10 minutes.
3. Do not trigger three incorrect passwords on the real owner account; that activates the 3-minute lockout.

EmailJS API rate limit is one send request per second. Use it for low-volume security notifications, not bulk campaigns.