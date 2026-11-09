import { Navigate } from "react-router-dom";
import { useStore } from "../context/useStore.js";

// Wrap a route's element in this to restrict it to administrators.
export default function RequireAdmin({ children }) {
  const { user } = useStore();

  if (!user) {
    return (
      <Navigate
        to="/account"
        replace
        state={{
          from: "/admin",
          notice: "Please sign in as an administrator.",
        }}
      />
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="note bad">This area is for administrators only.</div>
    );
  }

  return children;
}
