import { useState } from "react";
import ProductCard from "../components/ProductCard.jsx";
import { useStore } from "../context/useStore.js";
import { FAQ } from "../data/faq.js";

const TABS = [
  { key: "skin", label: "Skin care" },
  { key: "makeup", label: "Make-up" },
  { key: "help", label: "Help" },
];

export default function Shop() {
  const { products, addToCart } = useStore();
  const [tab, setTab] = useState("skin");
  const [query, setQuery] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [message, setMessage] = useState("");

  const flash = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(""), 2200);
  };

  const handleAdd = (product) => {
    if (addToCart(product)) flash(`${product.name} added to cart`);
    else flash(`Only ${product.stock} in stock`);
  };

  // Derived value: recalculated on every render from the state above
  const searching = query.trim() !== "";
  const visible = products.filter(
    (p) =>
      p.active &&
      (searching || p.cat === tab) && // searching looks across all categories
      p.name.toLowerCase().includes(query.trim().toLowerCase()) &&
      (minPrice === "" || p.price >= Number(minPrice)) &&
      (maxPrice === "" || p.price <= Number(maxPrice)),
  );

  const showHelp = tab === "help" && !searching;
  const badRange =
    minPrice !== "" && maxPrice !== "" && Number(minPrice) > Number(maxPrice);

  return (
    <>
      <div className="tools">
        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              className={"tab" + (tab === t.key ? " on" : "")}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          className="inp search"
          placeholder="🔍 Search products"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <section className="shop-panel">
        {showHelp ? (
          <>
            <h2>Help &amp; FAQs</h2>
            {FAQ.map(([question, answer]) => (
              <div className="faq" key={question}>
                <strong>{question}</strong>
                <div className="muted">{answer}</div>
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="filters">
              Price (KES):
              <input
                className="inp"
                type="number"
                min="0"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
              to
              <input
                className="inp"
                type="number"
                min="0"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
              {searching && <span>Searching all categories</span>}
            </div>
            {badRange && (
              <div className="note bad">
                Minimum price is higher than maximum.
              </div>
            )}
            {visible.length === 0 && <p>No products match your search.</p>}
            <div className="grid">
              {visible.map((p) => (
                <ProductCard key={p.id} product={p} onAdd={handleAdd} />
              ))}
            </div>
          </>
        )}
      </section>

      {message && <div className="toast">{message}</div>}
    </>
  );
}
