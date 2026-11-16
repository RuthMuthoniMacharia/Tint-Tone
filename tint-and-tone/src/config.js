// Backend URL. Set VITE_API_URL in tint-and-tone/.env to override.
// Default: same host the site is opened from, port 5000 (works on localhost and on LAN IPs).
export const API =
  import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;
