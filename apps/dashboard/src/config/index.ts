export const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

export const MODE = import.meta.env.MODE;

export const LAUNCH_DARKLY_CLIENT_SIDE_ID = import.meta.env.VITE_LAUNCH_DARKLY_CLIENT_SIDE_ID;

export const EE_AUTH_PROVIDER = (window._env_?.VITE_EE_AUTH_PROVIDER ||
  import.meta.env.VITE_EE_AUTH_PROVIDER ||
  'clerk') as 'clerk' | 'better-auth';

export const CLERK_PUBLISHABLE_KEY =
  window._env_?.VITE_CLERK_PUBLISHABLE_KEY || import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

export const APP_ID = import.meta.env.VITE_NOVU_APP_ID || '';

export const API_HOSTNAME = window._env_?.VITE_API_HOSTNAME || import.meta.env.VITE_API_HOSTNAME;

export const BETTER_AUTH_BASE_URL =
  window._env_?.VITE_BETTER_AUTH_BASE_URL ||
  import.meta.env.VITE_BETTER_AUTH_BASE_URL ||
  API_HOSTNAME ||
  'http://localhost:3000';

export const IS_EU = API_HOSTNAME === 'https://eu.api.novu.co';

export const WEBSOCKET_HOSTNAME = window._env_?.VITE_WEBSOCKET_HOSTNAME || import.meta.env.VITE_WEBSOCKET_HOSTNAME;

export const SEGMENT_KEY = import.meta.env.VITE_SEGMENT_KEY;

export const MIXPANEL_KEY = import.meta.env.VITE_MIXPANEL_KEY;

export const CUSTOMER_IO_WRITE_KEY = import.meta.env.VITE_CUSTOMER_IO_WRITE_KEY;

export const LEGACY_DASHBOARD_URL =
  window._env_?.VITE_LEGACY_DASHBOARD_URL || import.meta.env.VITE_LEGACY_DASHBOARD_URL;

export const DASHBOARD_URL = window._env_?.VITE_DASHBOARD_URL || import.meta.env.VITE_DASHBOARD_URL;

// Connect satellite hostname. Empty when Connect is not deployed (self-hosted/dev).
export const NOVU_CONNECT_HOSTNAME =
  window._env_?.VITE_NOVU_CONNECT_HOSTNAME || import.meta.env.VITE_NOVU_CONNECT_HOSTNAME || '';

// Clerk primary hostname. Required when `NOVU_CONNECT_HOSTNAME` is set.
export const NOVU_PLATFORM_HOSTNAME =
  window._env_?.VITE_NOVU_PLATFORM_HOSTNAME || import.meta.env.VITE_NOVU_PLATFORM_HOSTNAME || '';

/** Lowercase host comparison — env may omit port locally while `location.host` includes it. */
export function normalizeAppHost(host: string): string {
  return host.trim().toLowerCase();
}

function getHostnameWithoutPort(host: string): string {
  return normalizeAppHost(host).split(':')[0];
}

export { getHostnameWithoutPort };

// Fail fast when the hostname split is half-configured. Without `NOVU_PLATFORM_HOSTNAME`,
// satellite → primary handoffs (Clerk sign-in, cross-product redirects) silently break.
if (NOVU_CONNECT_HOSTNAME && !NOVU_PLATFORM_HOSTNAME) {
  throw new Error(
    'NOVU_PLATFORM_HOSTNAME is required when NOVU_CONNECT_HOSTNAME is set. ' +
      'Set VITE_NOVU_PLATFORM_HOSTNAME to the Clerk primary host, or unset VITE_NOVU_CONNECT_HOSTNAME to disable the split.'
  );
}

export const IS_HOSTNAME_SPLIT_ENABLED = NOVU_CONNECT_HOSTNAME.length > 0;

export const IS_NOVU_CONNECT =
  IS_HOSTNAME_SPLIT_ENABLED &&
  typeof window !== 'undefined' &&
  normalizeAppHost(window.location.host) === normalizeAppHost(NOVU_CONNECT_HOSTNAME);

// True when the hostname split is disabled (single-host deploys) AND when the split is enabled
// but the current host does not match `NOVU_CONNECT_HOSTNAME`. Mirrors `IS_NOVU_CONNECT` /
// `IS_HOSTNAME_SPLIT_ENABLED` above. NOTE: all three constants evaluate once at module load
// (window.location.host is read on import), so their values will not change without a full
// page reload.
export const IS_NOVU_PLATFORM = !IS_NOVU_CONNECT;

export const PLAIN_SUPPORT_CHAT_APP_ID = import.meta.env.VITE_PLAIN_SUPPORT_CHAT_APP_ID;

export const ONBOARDING_DEMO_WORKFLOW_ID = 'onboarding-demo-workflow';

export const IS_SELF_HOSTED = (window._env_?.VITE_SELF_HOSTED || import.meta.env.VITE_SELF_HOSTED) === 'true';

export const IS_ENTERPRISE = (window._env_?.VITE_NOVU_ENTERPRISE || import.meta.env.VITE_NOVU_ENTERPRISE) === 'true';

export const IS_AI_FEATURES_ENABLED = !(IS_SELF_HOSTED && IS_ENTERPRISE);

if (!IS_SELF_HOSTED && EE_AUTH_PROVIDER === 'clerk' && !CLERK_PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key');
}

if (!IS_SELF_HOSTED && EE_AUTH_PROVIDER === 'better-auth' && !BETTER_AUTH_BASE_URL) {
  throw new Error('Missing Better Auth Base URL');
}

export const SELF_HOSTED_UPGRADE_REDIRECT_URL = 'https://go.novu.co/hosted-upgrade';

/**
 * Helper function to get environment variable with window._env_ fallback
 * Used by the multi-region configuration system
 */
export function getEnvVar(key: string, fallback: string = ''): string {
  return (
    (window._env_ as Record<string, string | undefined>)?.[key] ||
    (import.meta.env as Record<string, string | undefined>)[key] ||
    fallback
  );
}

/** Cursor cloud agent only: auto sign-in with the pre-seeded dev user (see .env.agent). */
export const CURSOR_AGENT_AUTO_LOGIN = getEnvVar('VITE_CURSOR_AGENT_AUTO_LOGIN') === 'true';

export const CURSOR_AGENT_SEED_EMAIL = getEnvVar('VITE_AGENT_SEED_EMAIL');

export const CURSOR_AGENT_SEED_PASSWORD = getEnvVar('VITE_AGENT_SEED_PASSWORD');
