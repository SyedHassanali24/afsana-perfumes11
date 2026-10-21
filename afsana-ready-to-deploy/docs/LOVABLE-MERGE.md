# Lovable storefront ko merge karne ka tareeqa

Maqsad: Lovable ka design (dikhawa) lena, lekin hamara kaam karne wala code (API, cart, checkout, login, admin) na tootay.

## Sunehri rule
**Lovable sirf "kaisa dikhta hai" deta hai. "Kaam kaise karta hai" hamare paas pehle se hai.**
Lovable ke pages mein jo bhi dummy data / fake `fetch` / localStorage cart ho, woh hata kar hamare hooks aur `src/services` se jorna hai.

## Kya touch NAHI karna (in ko Lovable se overwrite mat karna)
| Folder / file | Kyun |
|---|---|
| `netlify/`, `services/`, `middleware/`, `database/`, `validation/`, `tests/` | Poora backend |
| `admin/` | Admin portal |
| `src/services/` (`api.js`, `index.js`, `mappers/`) | Backend se baat karne wala layer |
| `src/auth/`, `src/customer/` | Staff aur customer login |
| `src/shop/CartContext.jsx`, `cartLogic.js`, `WishlistContext.jsx`, `useQuote.js`, `useShopSettings.js` | Cart / quote / wishlist ka logic |
| `src/main.jsx` | Provider ka order: Auth > CustomerAuth > Cart > Wishlist (agar badla to cart/login toot jate hain) |
| `package.json`, `netlify.toml`, `vite.config.*` | Sirf nayi dependency add karni ho to package.json mein sirf wohi line add karein |

## Kya Lovable se lena hai (sirf look)
- Page layouts (JSX ka structure), colors, fonts, spacing, images, icons
- CSS / Tailwind classes. Agar Lovable Tailwind use karta hai aur hamara project nahi, to pehle yeh poochein: "Tailwind add karein ya CSS mein convert karein?"
- `ShopLayout.jsx` (header/footer), `ProductCard.jsx`, `HomePage.jsx`, `ShopPage.jsx` ka design

## Page-by-page jodna (Lovable page -> hamara page, data kahan se aata hai)
| Hamara route | File | Data / action jo rehna chahiye |
|---|---|---|
| `/` | `src/shop/pages/HomePage.jsx` | `shopContentApi.get()` (banners, FAQ, announcement), `productsApi` (public list) |
| `/shop` | `ShopPage.jsx` | `productsApi.list` (public) + `publicTaxonomyApi` filters |
| `/product/:slug` | `ProductPage.jsx` | product detail, variants, `<ReviewsSection slug={slug} />` ko **rakhein** |
| `/cart` | `CartPage.jsx` | `useCart()` + `useQuote(items, couponCode, city)`; totals server se aate hain, khud hisaab na lagayein |
| `/checkout` | `CheckoutPage.jsx` | `useQuote(..., f.city)`, `ordersApi` checkout; **city field zaroor rahe** (delivery fee isi se) |
| `/order-success/:orderNumber` | `OrderSuccessPage.jsx` | order number + bank details |
| `/track` | `TrackOrderPage.jsx` | `ShipmentInfo` component rakhein |
| `/account`, `/wishlist`, `/account/orders/:n` | `src/shop/account/*` | login required (`mine(...)` wrapper in `App.jsx`) |

## Zaroori rules jab code merge karein
1. **Prices kabhi client par mat banayen.** Client sirf `{variantId, quantity}` bhejta hai; total/shipping/discount server ka `quote` batata hai.
2. **`city` hamesha quote mein bhejein** warna delivery fee Settings wali flat fee par chali jati hai.
3. **Shipment ka link sirf `ShipmentInfo` se dikhayen** (yeh sirf https link kholta hai).
4. **Reviews:** `ReviewsSection` product page par rahe; naya design chahiye to sirf uska CSS badlein.
5. **Fake data hataein:** `mockProducts`, `localStorage` cart, `setTimeout` wale fake orders, Supabase/Lovable Cloud calls (agar hain) — sab hatana hai.
6. **Routes:** `src/App.jsx` ka route table hi chalega. Lovable ke router ya `BrowserRouter` ko dobara wrap na karein.
7. **Env / secrets:** Lovable ke koi API keys ya `.env` copy na karein.

## Merge ke baad checklist (aap ko karna hai)
1. `npm install` (agar nayi library aayi) -> `npm test` -> `npm run check` -> `npm run build` — teeno saaf aane chahiye.
2. `npm run api` chalayen, phir `npm run e2e` — saare PASS.
3. Browser mein: home, shop, product (reviews dikhein), cart mein item daal kar city badlein (delivery fee badalni chahiye), checkout se order, `/track`, login/register, wishlist, mobile view.
4. Browser console (F12) mein red error nahi aana chahiye. CSP (`netlify.toml`) kisi image/font ko rok sakti hai; agar aaye to error ka text mujhe bhej dein.

## Mujhe kya dena hai
Lovable ka poora zip (ya GitHub link) + batayein kaun se pages ready hain. Main pehle ek page ka diff dekh kar bataunga ke kya lena hai, phir ek ek karke merge karunga (ek step, ek zip).
