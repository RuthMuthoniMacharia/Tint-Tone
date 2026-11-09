import { Link } from "react-router-dom";
import { useStore } from "../context/useStore.js";

export default function Header() {
  const { cartCount, user, signOut } = useStore();

  return (
    <header className="top">
      {/* Left: cart with live item count */}
      <div className="bar">
        <Link className="btn ghost" to="/cart">
          🛒 Cart ({cartCount})
        </Link>
      </div>

      {/* Centre: brand */}
      <Link className="brand" to="/">
        <h1>Tint &amp; Tone</h1>
      </Link>

      {/* Right: admins get the panel + sign out, everyone else gets Account */}
      <div className="bar">
        {user?.role === "admin" ? (
          <>
            <Link className="btn" to="/admin">
              ⚙ Admin panel
            </Link>
            <button className="btn ghost" onClick={signOut}>
              Sign out
            </button>
          </>
        ) : (
          <Link className="btn" to="/account">
            {user ? "👤 " + user.username : "Account"}
          </Link>
        )}
      </div>
    </header>
  );
}
