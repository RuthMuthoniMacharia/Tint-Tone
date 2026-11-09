import { useState } from "react";
import { StoreContext } from "./StoreContext.js";
import { PRODUCTS } from "../data/products.js";
import { shippingFor } from "../utils/money.js";
import { nextStatus } from "../data/statuses.js";

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

  // Users (mock data until the backend exists)
  const [users, setUsers] = useState([
    {
      username: "admin",
      email: "admin@tintandtone.co.ke",
      password: "admin123",
      role: "admin",
    },
  ]);
  const [user, setUser] = useState(null); // the signed-in user, or null

  const signIn = (username, password) => {
    const found = users.find(
      (u) =>
        u.username.toLowerCase() === username.trim().toLowerCase() &&
        u.password === password,
    );
    if (!found) return null;
    setUser(found);
    return found;
  };

  const signUp = ({ username, email, password }) => {
    const created = {
      username: username.trim(),
      email,
      password,
      role: "customer",
    };
    setUsers([...users, created]);
    setUser(created);
  };

  const signOut = () => setUser(null);

  // Orders (mock data until the backend exists)
  const [orders, setOrders] = useState([]);

  const placeOrder = ({ address, method }) => {
    // Re-check stock at the moment of ordering: it may have changed
    const short = cartItems.filter((i) => i.stock < i.qty);
    if (short.length) {
      return {
        ok: false,
        error: "Not enough stock for: " + short.map((i) => i.name).join(", "),
      };
    }
    const shipping = shippingFor(subtotal);
    const id = 1001 + orders.length;

    // Deduct the stock that was bought
    setProducts(
      products.map((p) => {
        const bought = cartItems.find((i) => i.id === p.id);
        return bought ? { ...p, stock: p.stock - bought.qty } : p;
      }),
    );
    setOrders([
      ...orders,
      {
        id,
        user: user.username,
        items: cartItems.map(({ id: productId, name, qty, price }) => ({
          id: productId,
          name,
          qty,
          price,
        })),
        subtotal,
        shipping,
        total: subtotal + shipping,
        status: "Processing",
        date: new Date().toLocaleDateString(),
        address,
        method,
      },
    ]);
    clearCart();
    return { ok: true, id };
  };

  // Admin actions
  const updateProduct = (id, patch) =>
    setProducts(products.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const addProduct = ({ name, cat, price, stock }) =>
    setProducts([
      ...products,
      {
        id: Date.now(),
        name,
        cat,
        price,
        stock,
        active: true,
        icon: cat === "skin" ? "🧴" : "💄",
        hue: 340,
      },
    ]);

  const advanceOrder = (id) =>
    setOrders(
      orders.map((o) =>
        o.id === id && nextStatus(o.status)
          ? { ...o, status: nextStatus(o.status) }
          : o,
      ),
    );

  const value = {
    products,
    setProducts,
    cartItems,
    cartCount,
    subtotal,
    addToCart,
    setQty,
    clearCart,
    users,
    user,
    signIn,
    signOut,
    signUp,
    orders,
    placeOrder,
    updateProduct,
    addProduct,
    advanceOrder,
  };

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}
