# AFSANA customer social sign-in

Customer accounts can sign in or create an account with Google or Facebook. Social identity is linked only to a customer account; the customer session remains the separate `afsana_customer` HTTP-only cookie. Staff/admin authentication is unchanged.

## Required Cloudflare Worker secrets

Add these as Worker secrets (do not put secret values in GitHub files or browser variables):

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `FACEBOOK_APP_ID`
- `FACEBOOK_APP_SECRET`

Google and Facebook buttons are enabled independently when that provider's two values are present.

## Google OAuth client

Create an OAuth client with application type **Web application**.

Authorized JavaScript origin:

`https://afsanaperfumes.store`

Authorized redirect URI:

`https://afsanaperfumes.store/api/account/oauth/google/callback`

Put its client ID and client secret in the matching Cloudflare Worker secrets above.

## Facebook Login app

Add the **Facebook Login** product to the Meta app, configure the website domain as `afsanaperfumes.store`, and add this Valid OAuth Redirect URI:

`https://afsanaperfumes.store/api/account/oauth/facebook/callback`

Put the Meta app ID and app secret in the matching Cloudflare Worker secrets above. Request the `email` and `public_profile` permissions. An app left in Development mode is limited to its configured app roles/testers; publish it and complete any Meta review that applies before opening login to all customers.

## Behaviour

- First Google/Facebook sign-in creates a customer account automatically.
- A later sign-in with the same social identity opens that customer account.
- If a verified Google email matches an existing customer account, the Google identity is linked to that account. Facebook email is not treated as independently verified, so an existing account with the same email must use its existing sign-in method first. Staff accounts are never linked to customer social sign-in.
- Existing email/password login, registration, forgot-password and customer checkout remain available.
- Provider tokens are exchanged and checked on the server. They are not stored as customer sessions or sent to browser storage.
- OAuth state is signed and bound to a short-lived HTTP-only cookie. Google uses PKCE. Return paths are restricted to this storefront's own origin.
- The UI checks provider readiness and keeps an unconfigured provider button disabled rather than pretending it works.

The OAuth routes are:

- `GET /api/account/oauth/providers`
- `GET /api/account/oauth/google`
- `GET /api/account/oauth/google/callback`
- `GET /api/account/oauth/facebook`
- `GET /api/account/oauth/facebook/callback`

No production deployment is performed by this change.
