import { useState } from "react";
import Field from "./Field.jsx";
import { kes } from "../utils/money.js";
import { validateCheckout } from "../utils/validate.js";

const EMPTY = { address: "", phone: "", card: "", exp: "", cvv: "" };
const API = 'http://localhost:5000';

export default function CheckoutForm({ cartItems, total, onPaid }) {
  const [method, setMethod] = useState("mpesa");
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  // Delivery map state
  const [deliveryLat, setDeliveryLat] = useState(null);
  const [deliveryLng, setDeliveryLng] = useState(null);
  const [deliveryFee, setDeliveryFee] = useState(0);

  const grandTotal = (Number(total) || 0) + (Number(deliveryFee) || 0);

  const change = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validateCheckout(form, method);
    
    // Require user to select a delivery point on the map
    if (!deliveryLat || !deliveryLng) {
      found.map = "Please select a delivery point on the map.";
    }

    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);

    try {
      const token = localStorage.getItem("token"); // Retrieve JWT auth token

      const res = await fetch(`${API}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          items: cartItems || [{ product_id: 6, quantity: 1 }], // Fallback to current items
          shipping_address: form.address.trim(),
          payment_method: method,
          phone: form.phone,
          delivery_lat: deliveryLat,
          delivery_lng: deliveryLng
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({ pay: data.error || "Failed to place order. Please try again." });
        setBusy(false);
        return;
      }

      setBusy(false);
      onPaid({ 
        orderId: data.order_id, 
        address: form.address.trim(), 
        method, 
        total: grandTotal,
        message: data.message 
      });

    } catch (err) {
      setBusy(false);
      setErrors({ pay: "Could not connect to server. Please check your connection." });
    }
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

      {/* Summary Breakdown */}
      <div style={{ marginTop: '10px', fontSize: '0.9rem' }}>
        <div className="row">
          <span>Items Subtotal:</span>
          <span>{kes(total)}</span>
        </div>
        <div className="row">
          <span>Delivery Fee:</span>
          <span>{deliveryFee ? kes(deliveryFee) : 'KES 0.00'}</span>
        </div>
        <div className="row" style={{ fontWeight: 'bold', fontSize: '1.05rem', borderBottom: 'none' }}>
          <span>Grand Total:</span>
          <span>{kes(grandTotal)}</span>
        </div>
      </div>

      <button className="btn" type="submit" disabled={busy}>
        {busy ? "Processing payment..." : "Pay " + kes(grandTotal)}
      </button>
    </form>
  );
}