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
  name: '', sku: '', categoryId: '', brandId: '', status: 'Draft', shortDescription: '',
  familyId: '', gender: '', concentration: '', notesTop: '', notesHeart: '', notesBase: '',
  collectionIds: [], images: [], // images: [{ url, alt, kind }]  (first = main picture)
  // create-only: first size
  sizeMl: '50', variantSku: '', price: '', salePrice: '', stock: '0',
};

const variantsToForm = (variants) => variants.map((v) => ({
  id: v._id, label: v.label, sizeMl: v.sizeMl, sku: v.sku,
  price: String(v.price ?? ''), salePrice: v.salePrice ? String(v.salePrice) : '',
  stock: v.stock?.current ?? 0, reserved: v.stock?.reserved ?? 0,
  original: { price: v.price ?? 0, salePrice: v.salePrice || 0 },
}));
export { variantsToForm };

// GET /products/admin/:id -> form values (+ variants for price editing)
export const toForm = ({ product, variants }) => ({
  values: {
    ...EMPTY_FORM,
    name: product.name, sku: product.sku, categoryId: product.categoryId || '', brandId: product.brandId || '',
    status: product.status, shortDescription: product.content?.shortDescription || '',
    familyId: product.fragrance?.familyId || '', gender: product.fragrance?.gender || '', concentration: product.fragrance?.concentration || '',
    notesTop: (product.notes?.top || []).join(', '), notesHeart: (product.notes?.heart || []).join(', '), notesBase: (product.notes?.base || []).join(', '),
    collectionIds: (product.collectionIds || []).map(String),
    images: [...(product.media || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map((m) => ({ url: m.url, alt: m.alt || '', kind: m.kind })),
  },
  // PATCH replaces nested objects wholesale -> keep what the form doesn't edit
  base: { content: product.content || {}, fragrance: product.fragrance || {} },
  variants: variantsToForm(variants),
});

const optNum = (v) => (v === '' || v === undefined ? undefined : Number(v));
const list = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
const media = (images) => images.filter((i) => i.url.trim()).map((i, idx) => ({
  kind: idx === 0 ? 'main' : (i.kind && i.kind !== 'main' ? i.kind : 'gallery'), url: i.url.trim(), alt: i.alt.trim() || undefined, sortOrder: idx,
}));
const fragrance = (f, base = {}) => {
  const o = { ...base };
  f.familyId ? (o.familyId = f.familyId) : delete o.familyId;
  f.gender ? (o.gender = f.gender) : delete o.gender;
  f.concentration.trim() ? (o.concentration = f.concentration.trim()) : delete o.concentration;
  return o;
};
const notes = (f) => ({ top: list(f.notesTop), heart: list(f.notesHeart), base: list(f.notesBase) });

// form -> POST /products/admin
export const toCreatePayload = (f) => ({
  name: f.name.trim(), sku: f.sku.trim(), categoryId: f.categoryId, status: f.status,
  ...(f.brandId ? { brandId: f.brandId } : {}),
  ...(f.collectionIds.length ? { collectionIds: f.collectionIds } : {}),
  fragrance: fragrance(f), notes: notes(f),
  ...(f.images.some((i) => i.url.trim()) ? { media: media(f.images) } : {}),
  content: { shortDescription: f.shortDescription.trim() },
  variants: [{
    sku: (f.variantSku.trim() || `${f.sku.trim()}-${f.sizeMl}`),
    sizeMl: Number(f.sizeMl), price: Number(f.price),
    ...(optNum(f.salePrice) ? { salePrice: Number(f.salePrice) } : {}),
    stock: Number(f.stock || 0),
  }],
});

// form -> PATCH /products/admin/:id
export const toPatchPayload = (f, base) => ({
  name: f.name.trim(), sku: f.sku.trim(), categoryId: f.categoryId, status: f.status,
  ...(f.brandId ? { brandId: f.brandId } : {}), // note: a brand can be changed but not cleared
  collectionIds: f.collectionIds,
  fragrance: fragrance(f, base.fragrance), notes: notes(f), media: media(f.images),
  content: { ...base.content, shortDescription: f.shortDescription.trim() },
});

// form -> POST /products/admin/:id/variants
export const toVariantPayload = (v, productSku) => ({
  sku: (v.sku.trim() || `${productSku}-${v.sizeMl}`), sizeMl: Number(v.sizeMl), price: Number(v.price),
  ...(optNum(v.salePrice) ? { salePrice: Number(v.salePrice) } : {}), stock: Number(v.stock || 0),
});

// variants whose price/salePrice changed (server needs confirmPassword for these). salePrice 0 = no sale.
export const changedVariants = (variants) =>
  variants.filter((v) => Number(v.price) !== v.original.price || Number(v.salePrice || 0) !== v.original.salePrice);

const isUrl = (s) => { try { const u = new URL(s); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; } };
export const badImage = (images) => images.findIndex((i) => i.url.trim() && !isUrl(i.url.trim()));

// API validation details [{path,message}] -> { fieldName: message }
export function fieldErrors(err) {
  const out = {};
  (err?.details || []).forEach((d) => {
    const path = String(d.path || '');
    const key = path.startsWith('variants.') ? path.split('.').slice(2).join('.') : path.split('.')[0];
    if (!out[key]) out[key] = d.message;
  });
  return out;
}
