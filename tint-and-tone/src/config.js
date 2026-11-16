// Backend URL. Set VITE_API_URL in tint-and-tone/.env to override.
// Empty string = same origin (uses the Vite /api proxy). Unset = same host, port 5000.
export const API =
  import.meta.env.VITE_API_URL ?? `http://${window.location.hostname}:5000`;