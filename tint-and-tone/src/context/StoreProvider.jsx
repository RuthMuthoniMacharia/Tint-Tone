import { useState, useEffect, useCallback } from "react";
import { StoreContext } from "./StoreContext.js";
import { shippingFor } from "../utils/money.js";
import { nextStatus } from "../data/statuses.js";

import { API } from "../config.js";

// Header with the saved login token, for admin requests
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

// The database has no icon column, so pick an icon and colour from the product name
const LOOKS = [
  [/cleanser|wash/i, "🧴", 200],
  [/serum|vitamin/i, "🍊", 35],
  [/spf|sun/i, "☀️", 50],
  [/moistur/i, "💧", 190],
  [/night|cream/i, "🌙", 260],
  [/toner|mist|rose/i, "🌹", 345],
  [/lip/i, "💄", 335],
  [/foundation|concealer/i, "🎨", 25],
  [/mascara|eye|liner/i, "👁️", 280],
  [/blush|palette/i, "🌸", 350],
  [/powder|setting/i, "✨", 40],
  [/bronzer|contour/i, "🌞", 30],
];

// Convert a database row into the shape the UI uses
const fromDb = (r) => {
  const cat = /make/i.test(r.category_name || "") ? "makeup" : "skin";
  const look = LOOKS.find(([re]) => re.test(r.name));
  return {
    id: r.product_id,
    category_id: r.category_id,
    name: r.name,
    cat,
    price: Number(r.price),
    stock: r.stock_quantity,
    active: r.is_active === undefined ? true : !!r.is_active,
    icon: look ? look[1] : cat === "skin" ? "🧴" : "💄",
    hue: look ? look[2] : cat === "skin" ? 200 : 340,
  };
};

export default function StoreProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
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

  // Users list (only used by the sign-up form's local checks)
  const [users] = useState([]);
  const [user, setUser] = useState(null); // the signed-in user, or null

  const signIn = async (email, password) => {
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || "Sign in failed." };
      localStorage.setItem("token", data.token);
      const u = {
        username: data.user.name,
        email: data.user.email,
        role: data.user.role === "super_admin" ? "admin" : data.user.role,
      };
      setUser(u);
      return { user: u };
    } catch {
      return { error: "Could not connect to server." };
    }
  };

  const signUp = async ({ username, email, password }) => {
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: username.trim(), email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || "Sign up failed." };
      return await signIn(email, password);
    } catch {
      return { error: "Could not connect to server." };
    }
  };

  const signOut = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  // Load products from the database. Admins also see discontinued ones.
  const loadProducts = useCallback(async (asAdmin) => {
    try {
      const res = await fetch(
        asAdmin ? `${API}/api/admin/products` : `${API}/api/products`,
        asAdmin ? { headers: authHeaders() } : undefined,
      );
      if (!res.ok) return;
      const rows = await res.json();
      setProducts(rows.map(fromDb));
    } catch {
      /* server unreachable: keep the current list */
    }
  }, []);

  useEffect(() => {
    const asAdmin = user?.role === "admin";
    fetch(
      asAdmin ? `${API}/api/admin/products` : `${API}/api/products`,
      asAdmin ? { headers: authHeaders() } : undefined,
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((rows) => rows && setProducts(rows.map(fromDb)))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    fetch(`${API}/api/categories`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setCategories)
      .catch(() => {});
  }, []);

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

  // Admin actions: saved to the database, then the list is reloaded
  const updateProduct = async (id, patch) => {
    const p = products.find((x) => x.id === id);
    if (!p) return { error: "Product not found." };
    const next = { ...p, ...patch };
    try {
      const res = await fetch(`${API}/api/admin/products/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          category_id: next.category_id,
          name: next.name,
          price: next.price,
          stock_quantity: next.stock,
          is_active: next.active,
        }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || "Could not update product." };
      await loadProducts(true);
      return { ok: true };
    } catch {
      return { error: "Could not connect to server." };
    }
  };

  const addProduct = async ({ name, cat, price, stock }) => {
    const category = categories.find((c) => (cat === "skin") === /skin/i.test(c.name));
    if (!category) return { error: "Categories not loaded. Try again." };
    try {
      const res = await fetch(`${API}/api/admin/products`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          category_id: category.category_id,
          name,
          price,
          stock_quantity: stock,
        }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || "Could not add product." };
      await loadProducts(true);
      return { ok: true };
    } catch {
      return { error: "Could not connect to server." };
    }
  };

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
    refreshProducts: () => loadProducts(user?.role === "admin"),
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