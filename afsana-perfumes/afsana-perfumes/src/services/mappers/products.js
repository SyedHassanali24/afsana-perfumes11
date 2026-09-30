// The ONLY place that knows both the API shape and the admin UI shape for products.
export const money = (n) => `PKR ${Number(n || 0).toLocaleString('en-PK')}`;

// GET /products/admin/list item -> table row
export const toRow = (p) => ({
  id: p._id, name: p.name, sku: p.sku, status: p.status,
  category: p.category || '—', categoryId: p.categoryId,
  price: p.priceFrom ? `From ${money(p.priceFrom)}` : '—',
  stock: p.stock?.available ?? 0,
});

export const EMPTY_FORM = {
  name: '', sku: '', categoryId: '', status: 'Draft', shortDescription: '',
  // create-only: first variant
  sizeMl: '50', variantSku: '', price: '', salePrice: '', stock: '0',
};

// GET /products/admin/:id -> form values (+ variants for price editing)
export const toForm = ({ product, variants }) => ({
  values: {
    ...EMPTY_FORM,
    name: product.name, sku: product.sku, categoryId: product.categoryId || '',
    status: product.status, shortDescription: product.content?.shortDescription || '',
  },
  content: product.content || {}, // PATCH replaces nested objects wholesale -> keep the rest of `content`
  variants: variants.map((v) => ({
    id: v._id, label: v.label, sizeMl: v.sizeMl, sku: v.sku,
    price: String(v.price ?? ''), salePrice: v.salePrice ? String(v.salePrice) : '',
    stock: v.stock?.current ?? 0, reserved: v.stock?.reserved ?? 0,
    original: { price: v.price ?? 0, salePrice: v.salePrice || 0 },
  })),
});

const optNum = (v) => (v === '' || v === undefined ? undefined : Number(v));

// form -> POST /products/admin
export const toCreatePayload = (f) => ({
  name: f.name.trim(), sku: f.sku.trim(), categoryId: f.categoryId, status: f.status,
  content: { shortDescription: f.shortDescription.trim() },
  variants: [{
    sku: (f.variantSku.trim() || `${f.sku.trim()}-${f.sizeMl}`),
    sizeMl: Number(f.sizeMl), price: Number(f.price),
    ...(optNum(f.salePrice) ? { salePrice: Number(f.salePrice) } : {}),
    stock: Number(f.stock || 0),
  }],
});

// form -> PATCH /products/admin/:id
export const toPatchPayload = (f, content) => ({
  name: f.name.trim(), sku: f.sku.trim(), categoryId: f.categoryId, status: f.status,
  content: { ...content, shortDescription: f.shortDescription.trim() },
});

// variants whose price/salePrice changed (server needs confirmPassword for these). salePrice 0 = no sale.
export const changedVariants = (variants) =>
  variants.filter((v) => Number(v.price) !== v.original.price || Number(v.salePrice || 0) !== v.original.salePrice);

// API validation details [{path,message}] -> { fieldName: message }
export function fieldErrors(err) {
  const out = {};
  (err?.details || []).forEach((d) => {
    const path = String(d.path || '');
    const key = path.startsWith('variants.') ? path.split('.').slice(2).join('.') : path;
    if (!out[key]) out[key] = d.message;
  });
  return out;
}
