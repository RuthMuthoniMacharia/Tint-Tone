import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CartRow from "../components/CartRow.jsx";
import CheckoutForm from "../components/CheckoutForm.jsx";
import { useStore } from "../context/useStore.js";
import { kes, shippingFor } from "../utils/money.js";

export default function Cart() {
  const { cartItems, subtotal, setQty, user, placeOrder } = useStore();
  const navigate = useNavigate();
  const [step, setStep] = useState("cart"); // "cart" | "pay" | "done"
  const [orderId, setOrderId] = useState(null);
  const [error, setError] = useState("");

  const shipping = shippingFor(subtotal);
  const total = subtotal + shipping;

  const startCheckout = () => {
    if (!user) {
      // Send them to sign in, and bring them back here afterwards
      navigate("/account", {
        state: {
          from: "/cart",
          notice: "Please sign in or create an account to check out.",
        },
      });
      return;
    }
    setError("");
    setStep("pay");
  };

  const handlePaid = (details) => {
    const result = placeOrder(details);
    if (result.ok) {
      setOrderId(result.id);
      setStep("done");
    } else {
      setError(result.error);
      setStep("cart");
    }
  };

  // The order of these checks matters: "done" comes first because
  // placing an order empties the cart.
  if (step === "done") {
    return (
      <section className="panel center">
        <div className="big">🎉</div>
        <h2>Order #{orderId} placed!</h2>
        <p>Track it under your account.</p>
        <Link className="btn" to="/">
          Keep shopping
        </Link>
      </section>
    );
  }

  if (cartItems.length === 0) {
    return (
      <section className="panel">
        <h2>Your cart is empty</h2>
        <p>Add something lovely from the shop.</p>
        <Link className="btn" to="/">
          Browse products
        </Link>
      </section>
    );
  }

  return (
    <div className="two">
      <section className="panel">
        <h2>Your cart</h2>
        {error && <div className="note bad">{error}</div>}
        {cartItems.map((item) => (
          <CartRow key={item.id} item={item} onQty={setQty} />
        ))}
        <div className="row">
          <span>Subtotal</span>
          <span>{kes(subtotal)}</span>
        </div>
        <div className="row">
          <span>Shipping {subtotal >= 5000 && "(free over KES 5,000)"}</span>
          <span>{kes(shipping)}</span>
        </div>
        <div className="row">
          <strong>Total</strong>
          <strong>{kes(total)}</strong>
        </div>
      </section>

      <section className="panel">
        <h2>Checkout</h2>
        {step === "cart" ? (
          <>
            <p className="muted">
              {user
                ? `Signed in as ${user.username}`
                : "You need an account to place an order."}
            </p>
            <button className="btn" onClick={startCheckout}>
              Proceed to checkout
            </button>
          </>
        ) : (
         <CheckoutForm cartItems={cartItems} total={total} onPaid={handlePaid} />
        )}
      </section>
    </div>
  );
}
