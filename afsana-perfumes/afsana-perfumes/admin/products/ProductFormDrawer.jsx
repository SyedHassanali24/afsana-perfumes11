import { useState } from "react";
import Button from "../components/Button";
import Drawer from "../components/Drawer";
import { Field, Input, Select, Textarea } from "../components/FormFields";
import { mockCategories } from "./mockProductsData";

const EMPTY_PRODUCT = {
  name: "",
  sku: "",
  category: mockCategories[0],
  price: "",
  salePrice: "",
  stock: "",
  status: "Draft",
  shortDescription: "",
};

/**
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {object} [product] - pass an existing product to edit, omit to create
 * @param {(product: object) => void} onSave - called with the form values on submit
 */
export default function ProductFormDrawer({ open, onClose, product, onSave }) {
  const isEdit = Boolean(product);
  const [values, setValues] = useState(() => ({ ...EMPTY_PRODUCT, ...product }));
  const [errors, setErrors] = useState({});

  const setField = (key) => (e) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!values.name.trim()) nextErrors.name = "Product name is required.";
    if (!values.sku.trim()) nextErrors.sku = "SKU is required.";
    if (!values.price) nextErrors.price = "Price is required.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // Phase 3: POST /api/products (create) or PATCH /api/products/:id (edit)
    // instead of calling onSave directly with local state.
    onSave({ ...values, id: product?.id });
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit product" : "Add product"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" form="product-form">
            {isEdit ? "Save changes" : "Add product"}
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
        <Field label="Product name" error={errors.name}>
          <Input value={values.name} onChange={setField("name")} placeholder="e.g. Oud Rihan" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="SKU" error={errors.sku}>
            <Input value={values.sku} onChange={setField("sku")} placeholder="AF-OUD-050" />
          </Field>
          <Field label="Category">
            <Select value={values.category} onChange={setField("category")}>
              {mockCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Price" error={errors.price}>
            <Input type="number" value={values.price} onChange={setField("price")} placeholder="8500" />
          </Field>
          <Field label="Sale price" hint="Optional">
            <Input type="number" value={values.salePrice} onChange={setField("salePrice")} placeholder="—" />
          </Field>
          <Field label="Stock">
            <Input type="number" value={values.stock} onChange={setField("stock")} placeholder="0" />
          </Field>
        </div>

        <Field label="Status">
          <Select value={values.status} onChange={setField("status")}>
            <option>Draft</option>
            <option>Active</option>
            <option>Inactive</option>
            <option>Archived</option>
          </Select>
        </Field>

        <Field label="Short description" hint="Shown on product cards in the storefront">
          <Textarea
            rows={3}
            value={values.shortDescription}
            onChange={setField("shortDescription")}
            placeholder="A warm, woody oud with a smoky finish."
          />
        </Field>
      </form>
    </Drawer>
  );
}
