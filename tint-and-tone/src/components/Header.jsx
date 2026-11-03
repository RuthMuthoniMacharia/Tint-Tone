import { Link } from "react-router-dom";
import { useStore } from "../context/useStore.js";

export default function Header() {
  const { cartCount, user } = useStore();
  return (
    <header className="top">
      <div className="bar">
        <Link className="btn ghost" to="/cart">
          🛒 Cart ({cartCount})
        </Link>
      </div>
      <Link className="brand" to="/">
        <h1>Tint &amp; Tone</h1>
      </Link>
      <div className="bar">
        <Link className="btn" to="/account">
          {user ? "👤 " + user.username : "Account"}
        </Link>
      </div>
    </header>
  );
}
