import { useState } from "react";
import Field from "./Field.jsx";
import { kes } from "../utils/money.js";
import { validateCheckout } from "../utils/validate.js";

const EMPTY = { address: "", phone: "", card: "", exp: "", cvv: "" };

export default function CheckoutForm({ total, onPaid }) {
  const [method, setMethod] = useState("mpesa");
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const change = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const found = validateCheckout(form, method);
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    // Simulated payment: replace with a real API call later
    setTimeout(() => {
      setBusy(false);
      if (method === "card" && form.card.replace(/\s/g, "").endsWith("0000")) {
        setErrors({
          pay: "Payment declined. Please retry or use another method.",
        });
        return;
      }
      onPaid({ address: form.address.trim(), method });
    }, 1300);
  };

  return (
    <form className="stack" onSubmit={handleSubmit} noValidate>
      {errors.pay && <div className="note bad">{errors.pay}</div>}
      <div className="bar">
        <button
          type="button"
          className={"btn sm" + (method === "mpesa" ? "" : " ghost")}
          onClick={() => setMethod("mpesa")}
        >
          M-Pesa
        </button>
        <button
          type="button"
          className={"btn sm" + (method === "card" ? "" : " ghost")}
          onClick={() => setMethod("card")}
        >
          Card
        </button>
      </div>

      <Field
        label="Delivery address"
        name="address"
        value={form.address}
        onChange={change}
        error={errors.address}
        autoComplete="street-address"
      />

      {method === "mpesa" ? (
        <Field
          label="M-Pesa phone number"
          name="phone"
          value={form.phone}
          onChange={change}
          error={errors.phone}
          autoComplete="tel"
        />
      ) : (
        <>
          <Field
            label="Card number"
            name="card"
            value={form.card}
            onChange={change}
            error={errors.card}
            autoComplete="cc-number"
          />
          <div className="bar">
            <Field
              label="Expiry (MM/YY)"
              name="exp"
              value={form.exp}
              onChange={change}
              error={errors.exp}
              autoComplete="cc-exp"
            />
            <Field
              label="CVV"
              name="cvv"
              value={form.cvv}
              onChange={change}
              error={errors.cvv}
              autoComplete="cc-csc"
            />
          </div>
        </>
      )}

      <button className="btn" type="submit" disabled={busy}>
        {busy ? "Processing payment..." : "Pay " + kes(total)}
      </button>
      <small className="muted">
        Simulation only. A card ending in 0000 is declined to demo the retry
        path.
      </small>
    </form>
  );
}
