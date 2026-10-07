import { useEffect, useState } from "react";
import Button from "../components/Button";
import Drawer from "../components/Drawer";
import { Check, Field, Input, Select } from "../components/FormFields";
import { couponsApi } from "../../src/services";
import { EMPTY_FORM, TYPE_OPTIONS, toForm, toPayload } from "../../src/services/mappers/coupons";

// Create / edit a coupon. `coupon` is an API coupon (from the list) or null for a new one.
export default function CouponDrawer({ open, coupon, onClose, onSaved }) {
  const [v, setV] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setV(coupon ? toForm(coupon) : EMPTY_FORM); setErrors({}); setError(""); } }, [open, coupon]);

  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }));
  const used = (coupon?.usedCount || 0) > 0;

  const submit = async (e) => {
    e.preventDefault(); setError(""); setErrors({});
    if (v.code.trim().length < 3) return setErrors({ code: "Enter a code (at least 3 characters)." });
    setBusy(true);
    try {
      const body = toPayload(v);
      coupon ? await couponsApi.update(coupon.id, body) : await couponsApi.create(body);
      onSaved(coupon ? "Coupon updated." : "Coupon created.");
    } catch (err) {
      const fe = {}; (err.details || []).forEach((d) => { fe[d.path] = d.message; });
      setErrors(fe);
      setError(err.code === "VALIDATION_ERROR" ? "Please fix the highlighted fields." : err.message);
    } finally { setBusy(false); }
  };

  return (
    <Drawer open={open} onClose={onClose} title={coupon ? `Edit ${coupon.code}` : "Add coupon"}
      footer={<><Button variant="secondary" type="button" onClick={onClose}>Cancel</Button><Button type="submit" form="coupon-form" disabled={busy}>{busy ? "Saving…" : "Save"}</Button></>}>
      <form id="coupon-form" onSubmit={submit} className="space-y-4">
        {error && <p role="alert" className="text-sm text-danger bg-danger-soft rounded-sm px-3 py-2">{error}</p>}
        <Field label="Code" error={errors.code} hint={used ? "Locked: this coupon has already been used." : "Letters, numbers, - or _ . Shoppers type this at checkout."}>
          <Input value={v.code} error={!!errors.code} disabled={used} maxLength={30} onChange={(e) => setV((x) => ({ ...x, code: e.target.value.toUpperCase() }))} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type" error={errors.type}>
            <Select value={v.type} onChange={set("type")}>{TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select>
          </Field>
          {v.type !== "free_shipping" && (
            <Field label={v.type === "percentage" ? "Percent (1-100)" : "Amount (PKR)"} error={errors.value}>
              <Input type="number" min="0" inputMode="numeric" value={v.value} error={!!errors.value} onChange={set("value")} />
            </Field>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Minimum order (PKR)" error={errors.minOrder} hint="Leave empty for none.">
            <Input type="number" min="0" inputMode="numeric" value={v.minOrder} error={!!errors.minOrder} onChange={set("minOrder")} />
          </Field>
          {v.type === "percentage" && (
            <Field label="Max discount (PKR)" error={errors.maxDiscount} hint="Leave empty for no cap.">
              <Input type="number" min="0" inputMode="numeric" value={v.maxDiscount} error={!!errors.maxDiscount} onChange={set("maxDiscount")} />
            </Field>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Total uses allowed" error={errors.usageLimit} hint="Empty = unlimited.">
            <Input type="number" min="1" inputMode="numeric" value={v.usageLimit} error={!!errors.usageLimit} onChange={set("usageLimit")} />
          </Field>
          <Field label="Uses per customer" error={errors.perCustomerLimit} hint="0 = unlimited.">
            <Input type="number" min="0" inputMode="numeric" value={v.perCustomerLimit} error={!!errors.perCustomerLimit} onChange={set("perCustomerLimit")} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Starts on" error={errors.startsAt} hint="Empty = already started."><Input type="date" value={v.startsAt} error={!!errors.startsAt} onChange={set("startsAt")} /></Field>
          <Field label="Expires on" error={errors.expiresAt} hint="Valid until the end of this day."><Input type="date" value={v.expiresAt} error={!!errors.expiresAt} onChange={set("expiresAt")} /></Field>
        </div>
        <div className="space-y-2">
          <Check label="First order only" checked={v.firstOrderOnly} onChange={(on) => setV((x) => ({ ...x, firstOrderOnly: on }))} />
          <div><Check label="Active (shoppers can use it)" checked={v.isActive} onChange={(on) => setV((x) => ({ ...x, isActive: on }))} /></div>
        </div>
      </form>
    </Drawer>
  );
}
