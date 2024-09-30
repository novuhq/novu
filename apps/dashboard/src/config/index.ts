export const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

export const LAUNCH_DARKLY_CLIENT_SIDE_ID = import.meta.env.VITE_LAUNCH_DARKLY_CLIENT_SIDE_ID;

export const HUBSPOT_PORTAL_ID = import.meta.env.VITE_HUBSPOT_EMBED;

export const IS_EE_AUTH_ENABLED = import.meta.env.VITE_IS_EE_AUTH_ENABLED === 'true';

export const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

export const APP_ID = import.meta.env.VITE_NOVU_APP_ID || '';

if (IS_EE_AUTH_ENABLED && !CLERK_PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key');
}
