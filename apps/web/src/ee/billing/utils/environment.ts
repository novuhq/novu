declare global {
  interface Window {
    _env_: Record<string, string | undefined>;
  }
}

export const STRIPE_CLIENT_KEY =
  window._env_.VITE_STRIPE_CLIENT_KEY ||
  import.meta.env.VITE_STRIPE_CLIENT_KEY ||
  process.env.VITE_STRIPE_CLIENT_KEY ||
  '';
export const HUBSPOT_PORTAL_ID =
  window._env_.VITE_HUBSPOT_EMBED || import.meta.env.VITE_HUBSPOT_EMBED || process.env.VITE_HUBSPOT_EMBED || '';
