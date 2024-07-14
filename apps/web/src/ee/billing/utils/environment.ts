declare global {
  interface Window {
    _env_: Record<string, string | undefined>;
  }
}

export const STRIPE_CLIENT_KEY =
  window._env_.REACT_APP_STRIPE_CLIENT_KEY || process.env.REACT_APP_STRIPE_CLIENT_KEY || '';
export const HUBSPOT_PORTAL_ID = window._env_.REACT_APP_HUBSPOT_EMBED || process.env.REACT_APP_HUBSPOT_EMBED || '';
