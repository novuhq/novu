export const SENTRY_DSN = import.meta.env.REACT_APP_SENTRY_DSN;

export const LAUNCH_DARKLY_CLIENT_SIDE_ID = import.meta.env
  .REACT_APP_LAUNCH_DARKLY_CLIENT_SIDE_ID;

export const HUBSPOT_PORTAL_ID = import.meta.env.REACT_APP_HUBSPOT_EMBED;

export const IS_EE_AUTH_ENABLED =
  import.meta.env.REACT_APP_IS_EE_AUTH_ENABLED === "true";

export const CLERK_PUBLISHABLE_KEY =
  import.meta.env.REACT_APP_CLERK_PUBLISHABLE_KEY || "";

if (IS_EE_AUTH_ENABLED && !CLERK_PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key");
}
