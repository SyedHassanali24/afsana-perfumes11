import { useCallback, useEffect, useState } from "react";
import { X, Plus } from "lucide-react";
import Button from "../components/Button";
import Drawer from "../components/Drawer";
import ConfirmPasswordModal from "../components/ConfirmPasswordModal";
import { Check, Field, Input, Select, Textarea } from "../components/FormFields";
import { productsApi } from "../../src/services";
import { useAuth } from "../../src/auth/AuthContext";
import { EMPTY_FORM, toForm, variantsToForm, toCreatePayload, toPatchPayload, toVariantPayload, changedVariants, badImage, fieldErrors } from "../../src/services/mappers/products";

const NO_OPTIONS = { categories: [], brands: [], collections: [], families: [] };
const NEW_SIZE = { sizeMl: "", sku: "", price: "", salePrice: "", stock: "0" };
const Section = ({ title, children }) => <div className="space-y-3 border-t border-border pt-4"><p className="text-sm text-ink">{title}</p>{children}</div>;

/**
 * @param {string|null} productId - id to edit, null to create
 * @param {{categories,brands,collections,families}} options - dropdown data from GET /products/admin/categories
 * @param {boolean} canPrice - user has products.managePrice (UX only; server enforces)
 */
export default function ProductFormDrawer({ open, onClose, productId, options = NO_OPTIONS, canPrice, onSaved }) {
  const { can } = useAuth();
  const isEdit = Boolean(productId);
  const [values, setValues] = useState(EMPTY_FORM);
  const [base, setBase] = useState({ content: {}, fragrance: {} });
  const [variants, setVariants] = useState([]);
  const [newSize, setNewSize] = useState(NEW_SIZE);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [topError, setTopError] = useState("");
  const [askPassword, setAskPassword] = useState(false);
  const [delVariant, setDelVariant] = useState(null);

  useEffect(() => {
    if (!open) return;
    setErrors({}); setTopError(""); setAskPassword(false); setNewSize(NEW_SIZE);
    if (!productId) { setValues({ ...EMPTY_FORM, categoryId: options.categories[0]?.id || "" }); setVariants([]); return; }
    let live = true;
    setLoading(true);
    productsApi.adminGet(productId)
      .then((r) => { if (!live) return; const f = toForm(r); setValues(f.values); setBase(f.base); setVariants(f.variants); })
      .catch((e) => live && setTopError(e.message))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, productId]);

  // Re-read sizes after adding/deleting one, keeping any price edits not yet saved.
  const refreshVariants = useCallback(async () => {
    const r = await productsApi.adminGet(productId);
    setVariants((old) => variantsToForm(r.variants).map((nv) => { const o = old.find((x) => x.id === nv.id); return o ? { ...nv, price: o.price, salePrice: o.salePrice } : nv; }));
  }, [productId]);

  const setField = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));
  const setVariantField = (id, key) => (e) => setVariants((vs) => vs.map((v) => (v.id === id ? { ...v, [key]: e.target.value } : v)));
  const setImage = (i, k, val) => setValues((v) => ({ ...v, images: v.images.map((im, n) => (n === i ? { ...im, [k]: val } : im)) }));

  const validate = () => {
    const er = {};
    if (values.name.trim().length < 2) er.name = "Product name is required.";
    if (!values.sku.trim()) er.sku = "SKU is required.";
    if (!values.categoryId) er.categoryId = "Choose a category.";
    const bi = badImage(values.images);
    if (bi >= 0) er.media = `Picture ${bi + 1} isn't a valid web address (it should start with https://).`;
    if (!isEdit) {
      if (!(Number(values.sizeMl) > 0)) er.sizeMl = "Enter the size in ml.";
      if (values.price === "" || Number(values.price) < 0) er.price = "Price is required.";
      if (values.salePrice && Number(values.salePrice) >= Number(values.price)) er.salePrice = "Must be lower than price.";
      if (Number(values.stock) < 0 || !Number.isInteger(Number(values.stock || 0))) er.stock = "Whole number, 0 or more.";
    } else {
      variants.forEach((v) => {
        if (v.price === "" || Number(v.price) < 0) er[`price_${v.id}`] = "Required.";
        else if (v.salePrice && Number(v.salePrice) >= Number(v.price)) er[`price_${v.id}`] = "Sale must be lower than price.";
      });
    }
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  // Variant prices go first: a wrong password fails before anything is saved.
  const save = async (password) => {
    if (!isEdit) { await productsApi.create(toCreatePayload(values)); return; }
    for (const v of changedVariants(variants)) {
      await productsApi.updateVariant(productId, v.id, { price: Number(v.price), salePrice: Number(v.salePrice || 0), confirmPassword: password });
    }
    await productsApi.update(productId, toPatchPayload(values, base));
  };
  const fail = (err) => {
    const fe = fieldErrors(err);
    if (Object.keys(fe).length) setErrors((e) => ({ ...e, ...fe }));
    setTopError(err.code === "VALIDATION_ERROR" ? "Please fix the highlighted fields." : err.message);
  };
  const handleSubmit = async (e) => {
    e.preventDefault(); setTopError("");
    if (!validate()) return;
    if (isEdit && changedVariants(variants).length) { setAskPassword(true); return; }
    setBusy(true);
    try { await save(); onSaved(); } catch (err) { fail(err); } finally { setBusy(false); }
  };

  const addSize = async () => {
    setTopError("");
    const s = newSize;
    if (!(Number(s.sizeMl) > 0)) return setTopError("Enter the new size in ml.");
    if (s.price === "" || Number(s.price) < 0) return setTopError("Enter a price for the new size.");
    if (s.salePrice && Number(s.salePrice) >= Number(s.price)) return setTopError("Sale price must be lower than the price.");
    try { await productsApi.addVariant(productId, toVariantPayload(s, values.sku.trim())); setNewSize(NEW_SIZE); await refreshVariants(); }
    catch (err) { fail(err); }
  };
  const toggleCollection = (id, on) => setValues((v) => ({ ...v, collectionIds: on ? [...v.collectionIds, id] : v.collectionIds.filter((x) => x !== id) }));

  return (
    <>
      <Drawer open={open} onClose={onClose} size="lg" title={isEdit ? "Edit product" : "Add product"}
        footer={<><Button variant="secondary" onClick={onClose} type="button">Cancel</Button><Button type="submit" form="product-form" disabled={busy || loading}>{busy ? "Saving…" : isEdit ? "Save changes" : "Add product"}</Button></>}>
        {loading ? <p className="text-sm text-ink-muted">Loading product…</p> : (
          <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
            {topError && <p role="alert" className="text-sm text-danger bg-danger-soft rounded-sm px-3 py-2">{topError}</p>}

            <Field label="Product name" error={errors.name}><Input value={values.name} error={!!errors.name} onChange={setField("name")} placeholder="e.g. Oud Rihan" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="SKU" error={errors.sku}><Input value={values.sku} error={!!errors.sku} onChange={setField("sku")} placeholder="AF-OUD" /></Field>
              <Field label="Status"><Select value={values.status} onChange={setField("status")}><option>Draft</option><option>Active</option><option>Inactive</option><option>Archived</option></Select></Field>
              <Field label="Category" error={errors.categoryId}>
                <Select value={values.categoryId} error={!!errors.categoryId} onChange={setField("categoryId")}>
                  <option value="" disabled>Select…</option>
                  {options.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Brand">
                <Select value={values.brandId} onChange={setField("brandId")}>
                  <option value="">None</option>
                  {options.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Short description" hint="Shown on product cards in the store"><Textarea rows={2} value={values.shortDescription} onChange={setField("shortDescription")} /></Field>

            <Section title="Fragrance">
              <div className="grid grid-cols-3 gap-3">
                <Field label="Family"><Select value={values.familyId} onChange={setField("familyId")}><option value="">—</option>{options.families.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</Select></Field>
                <Field label="For"><Select value={values.gender} onChange={setField("gender")}><option value="">—</option><option>Men</option><option>Women</option><option>Unisex</option></Select></Field>
                <Field label="Concentration"><Input value={values.concentration} onChange={setField("concentration")} placeholder="EDP, EDT, Attar…" /></Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Top notes" hint="Comma separated"><Input value={values.notesTop} onChange={setField("notesTop")} placeholder="Saffron, Bergamot" /></Field>
                <Field label="Heart notes"><Input value={values.notesHeart} onChange={setField("notesHeart")} placeholder="Rose, Oud" /></Field>
                <Field label="Base notes"><Input value={values.notesBase} onChange={setField("notesBase")} placeholder="Amber, Musk" /></Field>
              </div>
            </Section>

            {options.collections.length > 0 && (
              <Section title="Collections">
                <div className="grid grid-cols-2 gap-2">{options.collections.map((c) => <Check key={c.id} label={c.name} checked={values.collectionIds.includes(c.id)} onChange={(on) => toggleCollection(c.id, on)} />)}</div>
              </Section>
            )}

            {can("products.manageImages") && (
              <Section title="Pictures">
                <p className="text-xs text-ink-muted">Paste the web address of each hosted image. The first one is the main picture.</p>
                {errors.media && <p role="alert" className="text-xs text-danger">{errors.media}</p>}
                {values.images.map((im, i) => (
                  <div key={i} className="grid grid-cols-[1fr_9rem_2rem] gap-2 items-center">
                    <Input value={im.url} placeholder="https://…" aria-label={`Picture ${i + 1} address`} onChange={(e) => setImage(i, "url", e.target.value)} />
                    <Input value={im.alt} placeholder="Describe it" aria-label={`Picture ${i + 1} description`} onChange={(e) => setImage(i, "alt", e.target.value)} />
                    <button type="button" onClick={() => setValues((v) => ({ ...v, images: v.images.filter((_, n) => n !== i) }))} className="p-2 text-ink-muted hover:text-danger" aria-label={`Remove picture ${i + 1}`}><X className="w-4 h-4" /></button>
                  </div>
                ))}
                <Button type="button" variant="secondary" size="sm" icon={Plus} onClick={() => setValues((v) => ({ ...v, images: [...v.images, { url: "", alt: "", kind: "gallery" }] }))}>Add picture</Button>
              </Section>
            )}

            {!isEdit && (
              <Section title="First size & price">
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Size (ml)" error={errors.sizeMl}><Input type="number" min="1" value={values.sizeMl} error={!!errors.sizeMl} onChange={setField("sizeMl")} /></Field>
                  <Field label="Price (PKR)" error={errors.price}><Input type="number" min="0" value={values.price} error={!!errors.price} onChange={setField("price")} placeholder="8500" /></Field>
                  <Field label="Sale price" error={errors.salePrice} hint="Optional"><Input type="number" min="0" value={values.salePrice} error={!!errors.salePrice} onChange={setField("salePrice")} /></Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Size SKU" hint="Blank = SKU-size"><Input value={values.variantSku} onChange={setField("variantSku")} /></Field>
                  <Field label="Opening stock" error={errors.stock}><Input type="number" min="0" value={values.stock} error={!!errors.stock} onChange={setField("stock")} /></Field>
                </div>
                <p className="text-xs text-ink-muted">More sizes can be added after the product is created.</p>
              </Section>
            )}

            {isEdit && (
              <Section title="Sizes & prices">
                {!canPrice && <p className="text-xs text-ink-muted">You don't have permission to change prices.</p>}
                {variants.map((v) => (
                  <div key={v.id} className="grid grid-cols-[1fr_1fr_1fr_2rem] gap-3 items-start">
                    <div className="text-sm text-ink pt-7">{v.label}<span className="block text-xs text-ink-muted">Stock {v.stock} · change in Inventory</span></div>
                    <Field label="Price" error={errors[`price_${v.id}`]}><Input type="number" min="0" disabled={!canPrice} value={v.price} onChange={setVariantField(v.id, "price")} /></Field>
                    <Field label="Sale price"><Input type="number" min="0" disabled={!canPrice} value={v.salePrice} onChange={setVariantField(v.id, "salePrice")} placeholder="—" /></Field>
                    {can("products.delete") && variants.length > 1 ? <button type="button" onClick={() => setDelVariant(v)} className="mt-7 p-1.5 text-ink-muted hover:text-danger" aria-label={`Delete ${v.label}`}><X className="w-4 h-4" /></button> : <span />}
                  </div>
                ))}
                {canPrice && <p className="text-xs text-ink-muted">Changing a price asks for your password and is logged.</p>}
                {can("products.edit") && (
                  <div className="border border-border rounded-sm p-3 space-y-3">
                    <p className="text-sm text-ink">Add another size</p>
                    <div className="grid grid-cols-4 gap-3">
                      <Field label="Size (ml)"><Input type="number" min="1" value={newSize.sizeMl} onChange={(e) => setNewSize({ ...newSize, sizeMl: e.target.value })} /></Field>
                      <Field label="Price"><Input type="number" min="0" value={newSize.price} onChange={(e) => setNewSize({ ...newSize, price: e.target.value })} /></Field>
                      <Field label="Sale price"><Input type="number" min="0" value={newSize.salePrice} onChange={(e) => setNewSize({ ...newSize, salePrice: e.target.value })} /></Field>
                      <Field label="Opening stock"><Input type="number" min="0" value={newSize.stock} onChange={(e) => setNewSize({ ...newSize, stock: e.target.value })} /></Field>
                    </div>
                    <Button type="button" variant="secondary" size="sm" icon={Plus} onClick={addSize}>Add size</Button>
                  </div>
                )}
              </Section>
            )}
          </form>
        )}
      </Drawer>

      <ConfirmPasswordModal open={askPassword} title="Confirm price change" message="Prices affect what customers pay. Enter your password to continue." confirmLabel="Save changes" onClose={() => setAskPassword(false)}
        onConfirm={async (pw) => { try { await save(pw); } catch (err) { if (err.code === "REAUTH_FAILED" || err.code === "REAUTH_REQUIRED") throw err; setAskPassword(false); fail(err); throw err; } onSaved(); }} />
      <ConfirmPasswordModal open={Boolean(delVariant)} danger title={`Delete the ${delVariant?.label || ""} size?`} message="It disappears from the store. Sizes with units reserved for open orders can't be deleted." confirmLabel="Delete size" onClose={() => setDelVariant(null)}
        onConfirm={async (pw) => { await productsApi.removeVariant(productId, delVariant.id, pw); await refreshVariants(); }} />
    </>
  );
}
