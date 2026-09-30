import { useEffect, useState } from "react";
import Button from "../components/Button";
import Drawer from "../components/Drawer";
import ConfirmPasswordModal from "../components/ConfirmPasswordModal";
import { Field, Input, Select, Textarea } from "../components/FormFields";
import { productsApi } from "../../src/services";
import { EMPTY_FORM, toForm, toCreatePayload, toPatchPayload, changedVariants, fieldErrors } from "../../src/services/mappers/products";

/**
 * @param {boolean} open
 * @param {string|null} productId - id to edit, null to create
 * @param {{id:string,name:string}[]} categories
 * @param {boolean} canPrice - user has products.managePrice (UX only; server enforces)
 * @param {() => void} onSaved - called after a successful save (parent reloads + closes)
 */
export default function ProductFormDrawer({ open, onClose, productId, categories, canPrice, onSaved }) {
  const isEdit = Boolean(productId);
  const [values, setValues] = useState(EMPTY_FORM);
  const [content, setContent] = useState({});
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [topError, setTopError] = useState("");
  const [askPassword, setAskPassword] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({}); setTopError(""); setAskPassword(false);
    if (!productId) { setValues({ ...EMPTY_FORM, categoryId: categories[0]?.id || "" }); setVariants([]); return; }
    let live = true;
    setLoading(true);
    productsApi.adminGet(productId)
      .then((r) => { if (!live) return; const f = toForm(r); setValues(f.values); setContent(f.content); setVariants(f.variants); })
      .catch((e) => live && setTopError(e.message))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [open, productId, categories]);

  const setField = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));
  const setVariantField = (id, key) => (e) => setVariants((vs) => vs.map((v) => (v.id === id ? { ...v, [key]: e.target.value } : v)));

  const validate = () => {
    const er = {};
    if (values.name.trim().length < 2) er.name = "Product name is required.";
    if (!values.sku.trim()) er.sku = "SKU is required.";
    if (!values.categoryId) er.categoryId = "Choose a category.";
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

  // Runs the actual API calls. Variant prices go first: a wrong password fails before anything is saved.
  const save = async (password) => {
    if (!isEdit) { await productsApi.create(toCreatePayload(values)); return; }
    for (const v of changedVariants(variants)) {
      await productsApi.updateVariant(productId, v.id, { price: Number(v.price), salePrice: Number(v.salePrice || 0), confirmPassword: password });
    }
    await productsApi.update(productId, toPatchPayload(values, content));
  };

  const finish = () => onSaved();
  const fail = (err) => {
    const fe = fieldErrors(err);
    if (Object.keys(fe).length) setErrors((e) => ({ ...e, ...fe }));
    setTopError(err.code === "VALIDATION_ERROR" ? "Please fix the highlighted fields." : err.message);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTopError("");
    if (!validate()) return;
    if (isEdit && changedVariants(variants).length) { setAskPassword(true); return; }
    setBusy(true);
    try { await save(); finish(); } catch (err) { fail(err); } finally { setBusy(false); }
  };

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title={isEdit ? "Edit product" : "Add product"}
        footer={
          <>
            <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
            <Button type="submit" form="product-form" disabled={busy || loading}>
              {busy ? "Saving…" : isEdit ? "Save changes" : "Add product"}
            </Button>
          </>
        }
      >
        {loading ? (
          <p className="text-sm text-ink-muted">Loading product…</p>
        ) : (
          <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
            {topError && <p role="alert" className="text-sm text-danger bg-danger-soft rounded-sm px-3 py-2">{topError}</p>}

            <Field label="Product name" error={errors.name}>
              <Input value={values.name} error={!!errors.name} onChange={setField("name")} placeholder="e.g. Oud Rihan" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="SKU" error={errors.sku}>
                <Input value={values.sku} error={!!errors.sku} onChange={setField("sku")} placeholder="AF-OUD" />
              </Field>
              <Field label="Category" error={errors.categoryId}>
                <Select value={values.categoryId} error={!!errors.categoryId} onChange={setField("categoryId")}>
                  <option value="" disabled>Select…</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
            </div>

            <Field label="Status">
              <Select value={values.status} onChange={setField("status")}>
                <option>Draft</option><option>Active</option><option>Inactive</option><option>Archived</option>
              </Select>
            </Field>

            {!isEdit && (
              <div className="space-y-3 border-t border-border pt-4">
                <p className="text-sm text-ink">First size &amp; price <span className="text-ink-muted">(more sizes can be added after)</span></p>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Size (ml)" error={errors.sizeMl}>
                    <Input type="number" min="1" value={values.sizeMl} error={!!errors.sizeMl} onChange={setField("sizeMl")} />
                  </Field>
                  <Field label="Price (PKR)" error={errors.price}>
                    <Input type="number" min="0" value={values.price} error={!!errors.price} onChange={setField("price")} placeholder="8500" />
                  </Field>
                  <Field label="Sale price" error={errors.salePrice} hint="Optional">
                    <Input type="number" min="0" value={values.salePrice} error={!!errors.salePrice} onChange={setField("salePrice")} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Variant SKU" hint="Blank = SKU-size">
                    <Input value={values.variantSku} onChange={setField("variantSku")} />
                  </Field>
                  <Field label="Opening stock" error={errors.stock}>
                    <Input type="number" min="0" value={values.stock} error={!!errors.stock} onChange={setField("stock")} />
                  </Field>
                </div>
              </div>
            )}

            {isEdit && (
              <div className="space-y-3 border-t border-border pt-4">
                <p className="text-sm text-ink">Sizes &amp; prices</p>
                {!canPrice && <p className="text-xs text-ink-muted">You don't have permission to change prices.</p>}
                {variants.map((v) => (
                  <div key={v.id} className="grid grid-cols-[1fr_1fr_1fr] gap-3 items-start">
                    <div className="text-sm text-ink pt-7">
                      {v.label}
                      <span className="block text-xs text-ink-muted">Stock {v.stock} · change in Inventory</span>
                    </div>
                    <Field label="Price" error={errors[`price_${v.id}`]}>
                      <Input type="number" min="0" disabled={!canPrice} value={v.price} onChange={setVariantField(v.id, "price")} />
                    </Field>
                    <Field label="Sale price">
                      <Input type="number" min="0" disabled={!canPrice} value={v.salePrice} onChange={setVariantField(v.id, "salePrice")} placeholder="—" />
                    </Field>
                  </div>
                ))}
                {canPrice && <p className="text-xs text-ink-muted">Changing a price asks for your password and is logged.</p>}
              </div>
            )}

            <Field label="Short description" hint="Shown on product cards in the storefront">
              <Textarea rows={3} value={values.shortDescription} onChange={setField("shortDescription")} />
            </Field>
          </form>
        )}
      </Drawer>

      <ConfirmPasswordModal
        open={askPassword}
        title="Confirm price change"
        message="Prices affect what customers pay. Enter your password to continue."
        confirmLabel="Save changes"
        onClose={() => setAskPassword(false)}
        onConfirm={async (pw) => { try { await save(pw); } catch (err) { if (err.code === "REAUTH_FAILED" || err.code === "REAUTH_REQUIRED") throw err; setAskPassword(false); fail(err); throw err; } finish(); }}
      />
    </>
  );
}
