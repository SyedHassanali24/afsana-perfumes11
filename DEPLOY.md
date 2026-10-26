# Afsana Perfumes: website ko live karne ki guide (Netlify + MongoDB Atlas)

Is ke baad site kisi bhi jagah se khulti hai, PC band ho tab bhi. Data MongoDB Atlas mein hamesha ke liye save rehta hai.
Ek waqt mein ek hi step karein, aur kahin atak jayein to screen ka message mujhe hu-ba-hu bhej dein.

## Step 1: MongoDB Atlas (database)
1. Atlas mein apna cluster kholein, **Database Access**: ek naya user banayein (naya, mazboot password, sirf is project ke liye).
2. **Network Access** mein `0.0.0.0/0` (Allow access from anywhere) add karein. Netlify ka koi fixed IP nahi hota, isliye yeh zaroori hai. Security phir user/password aur HTTPS se aati hai.
3. **Connect, Drivers** se connection string copy karein (`mongodb+srv://...`). Is mein user ka naya password likhein.
4. Live data ke liye naya database name rakhein, jaise `afsana_live` (testing wale `afsana_dev` se alag).

## Step 2: Code GitHub par
1. Is folder ko GitHub ki **private** repo mein push karein.
2. Dekh lein ke `.env` file repo mein nahi hai (`.gitignore` usay rokta hai). Asli passwords kabhi GitHub par nahi jane chahiye.

## Step 3: Netlify
1. Netlify mein **Add new site, Import from GitHub** chunein aur apni repo select karein.
2. Build settings khud `netlify.toml` se aa jati hain (`npm run build`, publish `dist`). Netlify Node 22 use karega. Kuch badalna nahi.
3. **Site configuration → Environment variables** mein production ke liye yeh variables add karein:

| Naam | Required | Value |
|---|---|---|
| `MONGODB_URI` | Yes | Atlas wali connection string |
| `MONGODB_DB_NAME` | Yes | `afsana_live` |
| `JWT_SECRET` | Yes | Naya random secret, kam az kam 32 characters |
| `SITE_URL` | Yes | Apni actual HTTPS site URL |
| `ALLOWED_ORIGINS` | Yes | Trusted frontend origin(s), e.g. apni HTTPS site URL |
| `RESEND_API_KEY` | Yes | Production password-reset email provider API key |
| `EMAIL_FROM` | Yes | Verified sender address |
| `UPSTASH_REDIS_REST_URL` | Yes | Production shared rate-limit Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Production shared rate-limit Redis REST token |
| `RATE_LIMIT_FAIL_OPEN` | No | Production mein false/empty rakhein |

Admin ka email/password Netlify mein **mat** daalein (sirf Step 4 mein apne PC par chahiye).
Production mein shared rate limiter required hai. Upstash variables missing hon to rate limiter production mein fail-closed karega.

Production password reset ke liye `RESEND_API_KEY` aur `EMAIL_FROM` required hain.

4. **Deploy** dabayein.

## Step 4: Live database ka pehla setup
Live database mein owner/admin aur indexes create karna zaroori hai:
`npm run db:setup`
`npm run db:indexes:preflight`
`npm run db:indexes`

## Pehle health check
Browser mein kholein: `/api/health`
- `"ok":true` aaye to env variables aur database sahi hain.
- `"ok":false` aaye to response ke `"fixes"` field mein missing configuration ya connection issue identify hota hai.

## Check
`/admin/login` par owner credentials se login karein.
`/shop` par products check karein.

<!-- Netlify production environment refresh marker -->
<!-- Environment values changed: production URL switched to a hidden custom Netlify subdomain. -->
