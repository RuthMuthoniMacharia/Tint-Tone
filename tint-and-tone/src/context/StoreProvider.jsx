import { useState } from "react";
import { StoreContext } from "./StoreContext.js";
import { PRODUCTS } from "../data/products.js";

export default function StoreProvider({ children }) {
  const [products, setProducts] = useState(PRODUCTS);
  const [cart, setCart] = useState({}); // { productId: quantity }

  const addToCart = (product) => {
    const have = cart[product.id] || 0;
    if (have >= product.stock) return false; // can't exceed stock
    setCart({ ...cart, [product.id]: have + 1 });
    return true;
  };

  const setQty = (product, qty) => {
    const next = { ...cart };
    if (qty <= 0) delete next[product.id];
    else next[product.id] = Math.min(qty, product.stock);
    setCart(next);
  };

  const clearCart = () => setCart({});

  // Derived values: calculated from state, not stored separately
  const cartItems = Object.entries(cart).map(([id, qty]) => ({
    ...products.find((p) => p.id === Number(id)),
    qty,
  }));
  const cartCount = cartItems.reduce((sum, i) => sum + i.qty, 0);
  const subtotal = cartItems.reduce((sum, i) => sum + i.qty * i.price, 0);

  const value = {
    products,
    setProducts,
    cartItems,
    cartCount,
    subtotal,
    addToCart,
    setQty,
    clearCart,
  };

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}
