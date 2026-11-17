import { API } from "../config.js";

// GET an admin endpoint with the saved login token.
// Returns { data } on success or { error } on failure.
export async function adminGet(path, params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== "" && v != null),
  ).toString();
  try {
    const res = await fetch(`${API}/api/admin/${path}${query ? "?" + query : ""}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error || "Request failed." };
    return { data };
  } catch {
    return { error: "Could not connect to server." };
  }
}