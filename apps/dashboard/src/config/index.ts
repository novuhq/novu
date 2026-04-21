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

export const PLAIN_SUPPORT_CHAT_APP_ID = import.meta.env.VITE_PLAIN_SUPPORT_CHAT_APP_ID;

export const ONBOARDING_DEMO_WORKFLOW_ID = 'onboarding-demo-workflow';

export const IS_SELF_HOSTED = (window._env_?.VITE_SELF_HOSTED || import.meta.env.VITE_SELF_HOSTED) === 'true';

export const IS_ENTERPRISE = (window._env_?.VITE_NOVU_ENTERPRISE || import.meta.env.VITE_NOVU_ENTERPRISE) === 'true';

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
