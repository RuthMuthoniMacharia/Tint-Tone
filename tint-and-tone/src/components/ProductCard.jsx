import { kes } from "../utils/money.js";

const LOW_STOCK = 5;

function stockInfo(stock) {
  if (stock === 0) return { label: "Out of stock", className: "out" };
  if (stock <= LOW_STOCK)
    return { label: `Only ${stock} left`, className: "low" };
  return { label: "In stock", className: "in" };
}

export default function ProductCard({ product, onAdd }) {
  const stock = stockInfo(product.stock);
  return (
    <article className="prod">
      <div
        className="pic"
        style={{ background: `hsl(${product.hue} 70% 92%)` }}
      >
        {product.icon}
      </div>
      <strong>{product.name}</strong>
      <span className="price">{kes(product.price)}</span>
      <span className={`badge ${stock.className}`}>{stock.label}</span>
      <button
        className="btn sm"
        disabled={product.stock === 0}
        onClick={() => onAdd(product)}
      >
        Add to cart
      </button>
    </article>
  );
}
