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

/** Publicly reachable API host for agent webhooks/OAuth (e.g. ngrok). Falls back to `API_HOSTNAME`. */
export const AGENT_API_HOSTNAME = window._env_?.VITE_AGENT_API_HOSTNAME || import.meta.env.VITE_AGENT_API_HOSTNAME;

/** Base URL for agent webhook/OAuth URLs shown to external providers (Slack, Teams, Meta, etc.). */
export function getAgentApiBaseUrl(): string {
  return (AGENT_API_HOSTNAME || API_HOSTNAME || 'https://api.novu.co').replace(/\/$/, '');
}

/** Hostname portion of {@link getAgentApiBaseUrl} for manifests that require a domain only. */
export function getAgentApiHostname(): string {
  try {
    return new URL(getAgentApiBaseUrl()).hostname;
  } catch {
    return 'api.novu.co';
  }
}

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

/**
 * Deployment-mode flags. There are exactly three modes, baked at build time by the
 * release workflows (see prepare-cloud-release / prepare-self-hosted-release /
 * prepare-enterprise-self-hosted-release):
 *
 * - Cloud: neither VITE_SELF_HOSTED nor VITE_NOVU_ENTERPRISE is set -> `IS_CLOUD`
 * - Community Edition (CE): VITE_SELF_HOSTED=true only -> `IS_SELF_HOSTED_CE`
 * - Enterprise Edition (EE): VITE_SELF_HOSTED=true + VITE_NOVU_ENTERPRISE=true -> `IS_SELF_HOSTED_EE`
 *
 * Canonical gating patterns — prefer these over hand-written combos of the raw flags:
 * - Feature not available in CE (available on Cloud + EE): `!IS_SELF_HOSTED_CE`
 * - Feature behaves differently on EE than on Cloud: `IS_SELF_HOSTED_EE`
 * - Feature is cloud-only regardless of edition: `IS_CLOUD`
 * - Behavior common to any self-hosted deployment (CE or EE): `IS_SELF_HOSTED`
 */
export const IS_SELF_HOSTED = import.meta.env.VITE_SELF_HOSTED === 'true';

export const IS_ENTERPRISE = import.meta.env.VITE_NOVU_ENTERPRISE === 'true';

export const IS_CLOUD = !IS_SELF_HOSTED;

export const IS_SELF_HOSTED_EE = IS_SELF_HOSTED && IS_ENTERPRISE;

export const IS_SELF_HOSTED_CE = IS_SELF_HOSTED && !IS_ENTERPRISE;

// AI features call Novu-hosted services and are cloud-only: disabled on both CE and EE.
export const IS_AI_FEATURES_ENABLED = IS_CLOUD;

if (IS_CLOUD && EE_AUTH_PROVIDER === 'clerk' && !CLERK_PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key');
}

if (IS_CLOUD && EE_AUTH_PROVIDER === 'better-auth' && !BETTER_AUTH_BASE_URL) {
  throw new Error('Missing Better Auth Base URL');
}

export const SELF_HOSTED_UPGRADE_REDIRECT_URL = 'https://go.novu.co/hosted-upgrade';

export const SUPPORT_EMAIL = 'support@novu.co';

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
