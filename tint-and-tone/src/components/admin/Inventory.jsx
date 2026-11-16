import { useState } from "react";
import Field from "../Field.jsx";
import { useStore } from "../../context/useStore.js";

const EMPTY = { name: "", cat: "skin", price: "", stock: "" };

function validateProduct({ name, price, stock }) {
  const errors = {};
  if (name.trim().length < 2) errors.name = "Enter a product name";
  if (!(Number(price) > 0)) errors.price = "Price must be above 0";
  if (stock === "" || !(Number(stock) >= 0) || !Number.isInteger(Number(stock)))
    errors.stock = "Whole number, 0 or more";
  return errors;
}

export default function Inventory() {
  const { products, updateProduct, addProduct } = useStore();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  const change = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleAdd = async (e) => {
    e.preventDefault();
    const found = validateProduct(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    const result = await addProduct({
      name: form.name.trim(),
      cat: form.cat,
      price: Number(form.price),
      stock: Number(form.stock),
    });
    if (result?.error) return setErrors({ form: result.error });
    setForm(EMPTY);
  };

  // Run an update and show any error from the server
  const save = async (id, patch) => {
    const result = await updateProduct(id, patch);
    setErrors(result?.error ? { form: result.error } : {});
  };

  return (
    <>
      <h3>Current items</h3>
      {errors.form && <div className="note bad">{errors.form}</div>}
      <div className="adm-scroll">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Price (KES)</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className={p.active ? "" : "adm-off"}>
                <td>
                  {p.icon} {p.name}
                </td>
                <td>
                  <input
                    className="inp adm-price"
                    type="number"
                    min="1"
                    key={`${p.id}-${p.price}`}
                    defaultValue={p.price}
                    onBlur={(e) => {
                      const price = Number(e.target.value);
                      if (price > 0 && price !== p.price) save(p.id, { price });
                      else e.target.value = p.price;
                    }}
                  />
                </td>
                <td>
                  {p.stock}{" "}
                  {p.active && p.stock <= 5 && (
                    <span className="badge low">low</span>
                  )}
                </td>
                <td>{p.active ? "Active" : "Discontinued"}</td>
                <td>
                  <button
                    className="btn sm"
                    onClick={() => save(p.id, { stock: p.stock + 10 })}
                  >
                    +10 stock
                  </button>{" "}
                  <button
                    className="btn sm ghost"
                    onClick={() => save(p.id, { active: !p.active })}
                  >
                    {p.active ? "Discontinue" : "Restore"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="adm-gap">Add a product</h3>
      <form className="adm-add" onSubmit={handleAdd} noValidate>
        <Field
          label="Name"
          name="name"
          value={form.name}
          onChange={change}
          error={errors.name}
        />
        <div>
          <label htmlFor="cat">Category</label>
          <select
            id="cat"
            name="cat"
            className="inp"
            value={form.cat}
            onChange={change}
          >
            <option value="skin">Skin care</option>
            <option value="makeup">Make-up</option>
          </select>
        </div>
        <Field
          label="Price (KES)"
          name="price"
          type="number"
          value={form.price}
          onChange={change}
          error={errors.price}
        />
        <Field
          label="Stock"
          name="stock"
          type="number"
          value={form.stock}
          onChange={change}
          error={errors.stock}
        />
        <button className="btn" type="submit">
          Add product
        </button>
      </form>
    </>
  );
}