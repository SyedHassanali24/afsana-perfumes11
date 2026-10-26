// Single fetch wrapper for the whole frontend. Cookies carry the session (HTTP-only), never tokens in JS.
export class ApiError extends Error {
  constructor(status, code, message, details) { super(message); this.status = status; this.code = code; this.details = details; }
}

const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN || window.location.origin).replace(/\/$/, "");
const IS_GITHUB_PAGES = import.meta.env.BASE_URL !== "/" && !import.meta.env.VITE_API_ORIGIN;
const DEMO_ORDER_KEY = "afsana_demo_orders_v1";

const DEMO_PRODUCTS = [
  { id: "demo-oud-noir", slug: "oud-noir", name: "Oud Noir", priceFrom: 6990, inStock: true, gender: "Men", image: { url: "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=900&q=85", alt: "Oud Noir perfume" } },
  { id: "demo-velvet-rose", slug: "velvet-rose", name: "Velvet Rose", priceFrom: 6490, inStock: true, gender: "Women", image: { url: "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=900&q=85", alt: "Velvet Rose perfume" } },
  { id: "demo-amber-night", slug: "amber-night", name: "Amber Night", priceFrom: 7290, inStock: true, gender: "Unisex", image: { url: "https://images.unsplash.com/photo-1587017539504-67cfbddac569?auto=format&fit=crop&w=900&q=85", alt: "Amber Night perfume" } },
  { id: "demo-mystic-oud", slug: "mystic-oud", name: "Mystic Oud", priceFrom: 7990, inStock: true, gender: "Unisex", image: { url: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=900&q=85", alt: "Mystic Oud perfume" } },
];

const DEMO_DETAILS = Object.fromEntries(DEMO_PRODUCTS.map((p) => [p.slug, {
  product: {
    _id: p.id, ...p,
    content: { shortDescription: "A deep, memorable fragrance crafted for evenings that leave an impression.", fullDescription: "Afsana's signature demo collection. Product details, stock and final pricing will be supplied by the production catalogue." },
    fragrance: { gender: p.gender, concentration: "Eau de Parfum", longevity: "Long lasting", projection: "Moderate", seasons: ["Evening", "All year"] },
    notes: { top: ["Bergamot", "Saffron"], heart: ["Rose", "Amber"], base: ["Oud", "Musk"] },
    media: [{ kind: "main", url: p.image.url, alt: p.image.alt }],
  },
  variants: [{ id: p.id + "-50", label: "50ml", sizeMl: 50, price: p.priceFrom, salePrice: 0, available: 12 }],
  related: DEMO_PRODUCTS.filter((x) => x.slug !== p.slug).slice(0, 3),
}]));

function demoOrders() {
  try { return JSON.parse(localStorage.getItem(DEMO_ORDER_KEY) || "[]"); } catch { return []; }
}
function saveDemoOrders(orders) {
  try { localStorage.setItem(DEMO_ORDER_KEY, JSON.stringify(orders)); } catch {}
}

function githubPagesMock(path, body, query = {}) {
  if (!IS_GITHUB_PAGES) return null;

  if (path === "/auth/me" || path === "/account/me") {
    return Promise.reject(new ApiError(401, "UNAUTHENTICATED", "Not signed in."));
  }
  if (path === "/account/addresses") return Promise.reject(new ApiError(401, "UNAUTHENTICATED", "Sign in to use saved addresses."));
  if (path === "/wishlist") {
    try {
      const ids = JSON.parse(localStorage.getItem("afsana_wishlist_v1") || "[]").map(String);
      const products = DEMO_PRODUCTS.filter((p) => ids.includes(String(p.id)));
      return Promise.resolve({ success: true, ids, products });
    } catch {
      return Promise.resolve({ success: true, ids: [], products: [] });
    }
  }
  if (path === "/products") {
    const q = String(query.q || "").trim().toLowerCase();
    let products = DEMO_PRODUCTS.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (query.gender && p.gender !== query.gender) return false;
      if (query.category && query.category !== "all" && !String(query.category).includes(p.gender.toLowerCase())) return false;
      if (query.minPrice && p.priceFrom < Number(query.minPrice)) return false;
      if (query.maxPrice && p.priceFrom > Number(query.maxPrice)) return false;
      return true;
    });
    if (query.sort === "price_asc") products.sort((a, b) => a.priceFrom - b.priceFrom);
    if (query.sort === "price_desc") products.sort((a, b) => b.priceFrom - a.priceFrom);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 12);
    const start = (page - 1) * limit;
    return Promise.resolve({ success: true, products: products.slice(start, start + limit), pagination: { page, pages: Math.max(1, Math.ceil(products.length / limit)), total: products.length } });
  }
  if (path.startsWith("/products/")) {
    const slug = decodeURIComponent(path.split("/")[2] || "");
    const d = DEMO_DETAILS[slug];
    if (d) return Promise.resolve({ success: true, ...d });
    return Promise.reject(new ApiError(404, "NOT_FOUND", "This perfume could not be found."));
  }
  if (path === "/taxonomy/public/categories") return Promise.resolve({ success: true, items: [
    { id: "cat-men", slug: "men", name: "For Him" },
    { id: "cat-women", slug: "women", name: "For Her" },
    { id: "cat-unisex", slug: "unisex", name: "Unisex" },
  ]});
  if (path === "/taxonomy/public/brands") return Promise.resolve({ success: true, items: [] });
  if (path === "/cms/public") return Promise.resolve({ success: true, banners: [], faqs: [], announcement: null });
  if (path === "/settings/public") return Promise.resolve({ success: true, store: { name: "Afsana Perfumes" }, shipping: { freeAbove: 10000, defaultRate: 250 }, returns: { days: 7 }, bank: null });
  if (path.startsWith("/reviews/product/")) return Promise.resolve({ success: true, summary: { avg: 0, count: 0, breakdown: {} }, reviews: [], pagination: { page: 1, pages: 1, total: 0 } });
  if (path === "/cart/quote") {
    const lines = (body?.items || []).map((item) => {
      const v = Object.values(DEMO_DETAILS).flatMap((x) => x.variants).find((x) => x.id === item.variantId);
      const p = DEMO_PRODUCTS.find((x) => x.id === String(item.variantId).split("-50")[0]);
      const quantity = Math.max(1, Number(item.quantity) || 1);
      return v && p ? { variantId: v.id, quantity, available: v.available, status: "ok", name: p.name, slug: p.slug, label: v.label, unitPrice: v.price, lineTotal: v.price * quantity, image: p.image.url } : { variantId: item.variantId, quantity, available: 0, status: "unavailable", name: "Unavailable item", lineTotal: 0 };
    });
    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    const shipping = subtotal >= 10000 ? 0 : 250;
    return Promise.resolve({ success: true, lines, subtotal, discount: 0, shipping, total: subtotal + shipping, freeShippingRemaining: Math.max(0, 10000 - subtotal), delivery: { estDays: "3–5 working days" }, coupon: null, canCheckout: lines.length > 0 && lines.every((l) => l.status === "ok") });
  }
  if (path === "/orders" && body) {
    const lines = (body.items || []).map((item) => {
      const v = Object.values(DEMO_DETAILS).flatMap((x) => x.variants).find((x) => x.id === item.variantId);
      const p = DEMO_PRODUCTS.find((x) => x.id === String(item.variantId).split("-50")[0]);
      const quantity = Math.max(1, Number(item.quantity) || 1);
      return v && p ? { variantId: v.id, name: p.name, label: v.label, quantity, unitPrice: v.price, lineTotal: v.price * quantity } : null;
    }).filter(Boolean);
    if (!lines.length || lines.length !== (body.items || []).length) return Promise.reject(new ApiError(400, "ITEM_UNAVAILABLE", "One or more items are unavailable."));
    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    const shipping = subtotal >= 10000 ? 0 : 250;
    const orderNumber = "AFS-DEMO-" + String(Date.now()).slice(-6);
    const now = new Date().toISOString();
    const order = {
      orderNumber, status: "Pending", paymentStatus: body.paymentMethod === "COD" ? "Pending" : "Awaiting payment",
      paymentMethod: body.paymentMethod, total: subtotal + shipping, customer: body.customer, shippingAddress: body.shippingAddress, lines, shipment: null,
      timeline: [{ event: "Order placed", at: now }],
    };
    saveDemoOrders([order, ...demoOrders()]);
    return Promise.resolve({ success: true, order });
  }
  if (path.startsWith("/orders/track/")) {
    const number = decodeURIComponent(path.split("/").pop() || "").toUpperCase();
    const phone = String(query.phone || body?.phone || "").replace(/\D/g, "");
    const order = demoOrders().find((x) => x.orderNumber === number && String(x.customer?.phone || "").replace(/\D/g, "") === phone);
    if (!order) return Promise.reject(new ApiError(404, "NOT_FOUND", "We could not find an order with those details."));
    return Promise.resolve({ success: true, order });
  }
  return null;
}

export async function api(path, { method = 'GET', body, query, idempotencyKey } = {}) {
  const mock = githubPagesMock(path, body, query);
  if (mock) return mock;

  const url = new URL(`/api${path}`, API_ORIGIN);
  Object.entries(query || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v); });
  let res;
  try {
    res = await fetch(url, {
      method, credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'afsana', ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch { throw new ApiError(0, 'NETWORK', 'Network error. Please check your connection.'); }
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok || !data || !data.success) {
    const e = (data && data.error) || {};
    const staffPath = !/^\/(account|cart|wishlist|returns\/mine)(\/|$)/.test(path);
    if (staffPath && res.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/me')) window.dispatchEvent(new Event('afsana:unauthorized'));
    if (staffPath && e.code === 'PASSWORD_CHANGE_REQUIRED') window.dispatchEvent(new Event('afsana:must-change-password'));
    throw new ApiError(res.status, e.code || 'ERROR', e.message || 'Something went wrong. Please try again.', e.details);
  }
  return data;
}
