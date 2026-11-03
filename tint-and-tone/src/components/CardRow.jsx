import { kes } from "../utils/money.js";

export default function CartRow({ item, onQty }) {
  return (
    <div className="row">
      <span>
        {item.icon} {item.name}
        <br />
        <small className="muted">{kes(item.price)}</small>
      </span>
      <div className="qty">
        <button aria-label="Decrease" onClick={() => onQty(item, item.qty - 1)}>
          -
        </button>
        {item.qty}
        <button aria-label="Increase" onClick={() => onQty(item, item.qty + 1)}>
          +
        </button>
      </div>
      <strong>{kes(item.price * item.qty)}</strong>
    </div>
  );
}
