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
3. **Site configuration, Environment variables** mein yeh 4 add karein:

| Naam | Value |
|---|---|
| `MONGODB_URI` | Atlas wali connection string |
| `MONGODB_DB_NAME` | `afsana_live` |
| `JWT_SECRET` | naya lamba random text (neeche command) |
| `SITE_URL` | `https://aap-ka-site.netlify.app` (apna asli address) |

Random JWT_SECRET banane ke liye apne PC par:
`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

Admin ka email/password Netlify mein **mat** daalein (sirf Step 4 mein apne PC par chahiye).
4. **Deploy** dabayein. Pehli build 2-3 minute leti hai.

## Step 4: Live database ka pehla setup (apne PC se, sirf ek baar)
Project folder mein `.env` file mein yeh 4 cheezein live wali rakhein: `MONGODB_URI`, `MONGODB_DB_NAME=afsana_live`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (kam az kam 12 harf).
Phir ek ek command chalayein:
```
npm install
npm run db:setup
npm run db:indexes:preflight
npm run db:indexes
```
Screen par aana chahiye: `Owner created: aap-ka-email`, phir indexes ka message.
Is se demo perfumes nahi banenge. Products aap admin se khud daalenge.

## Pehle health check (har masle mein sab se pehle yeh)
Browser mein kholein: `https://aap-ka-site.netlify.app/api/health`
- `"ok":true` aaye to env variables aur database sahi hain.
- `"ok":false` aaye to `"fix"` mein likha hota hai ke kya theek karna hai (password galat, IP block, cluster paused, variable missing). Yeh koi password ya connection string nahi dikhata.
- `"setupDone":false` ho to Step 4 (`npm run db:setup`) abhi baqi hai.

## Step 5: Check karein
1. `https://aap-ka-site.netlify.app/admin/login` kholein, ADMIN_EMAIL/PASSWORD se login karein.
2. Dashboard khulna chahiye (khali, no sales).
3. Products mein ek product banayein, Inventory mein stock dalein. Phir `https://aap-ka-site.netlify.app/shop` par woh dikhna chahiye.
4. Ek test order dein (COD) aur admin Orders mein dekhein.
5. Kuch bhi kaam na kare to Netlify mein **Functions, logs** dekhein aur error mujhe bhej dein.

## Zaroori hifazati kaam (live karne se pehle)
- Pehle screenshot mein jo secrets nazar aaye (`JWT_SECRET`, `ADMIN_PASSWORD`, purana Mongo password) un ko **badal dein**. Live ke liye sab naye banayein.
- `.env.example` mein asli values kabhi na likhein.
- Owner ka password bhool jayein to: `.env` mein naya `ADMIN_PASSWORD` likh kar `npm run admin:reset` chalayein.
- Free Atlas mein khud-ba-khud backup nahi hota. Live hone ke baad paid tier ya backup script zaroor lagayein (HANDOFF mein "Later" mein likha hai).
