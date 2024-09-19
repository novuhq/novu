import { FeatureFlagsKeysEnum, getContextPath, NovuComponentEnum } from '@novu/shared';
import { version } from '../../package.json';

function isBrowser() {
  return typeof window !== 'undefined';
}

function autodetectApiRoot() {
  const { origin } = window.location;
  const matcher = /web|dashboard/;

  const isValidTargetForReplace = !origin.includes('localhost') && matcher.test(origin);

  return isValidTargetForReplace ? origin.replace(matcher, 'api') : '';
}

declare global {
  interface Window {
    _env_: Record<string, string | undefined>;
  }
}

const isPlaywright = isBrowser() && (window as any).isPlaywright;

export const API_ROOT =
  window._env_.VITE_API_URL || isPlaywright
    ? window._env_.VITE_API_URL || process.env.VITE_API_URL || autodetectApiRoot() || 'http://localhost:1336'
    : window._env_.VITE_API_URL || process.env.VITE_API_URL || autodetectApiRoot() || 'http://localhost:3000';

export const WS_URL = isPlaywright
  ? window._env_.VITE_WS_URL || import.meta.env.VITE_WS_URL || 'http://localhost:1340'
  : window._env_.VITE_WS_URL || import.meta.env.VITE_WS_URL || 'http://localhost:3002';

export const SENTRY_DSN = window._env_.VITE_SENTRY_DSN || import.meta.env.VITE_SENTRY_DSN;

export const NOVU_GTM_ID = window._env_.VITE_NOVU_GTM_ID || import.meta.env.VITE_NOVU_GTM_ID;

export const ENV = window._env_.VITE_ENVIRONMENT || import.meta.env.VITE_ENVIRONMENT;

const blueprintApiUrlByEnv =
  ENV === 'production' || ENV === 'prod' ? 'https://api.novu.co' : 'https://api.novu-staging.co';

export const BLUEPRINTS_API_URL =
  window._env_.VITE_BLUEPRINTS_API_URL || isPlaywright
    ? window._env_.VITE_BLUEPRINTS_API_URL || import.meta.env.VITE_BLUEPRINTS_API_URL || 'http://localhost:1336'
    : blueprintApiUrlByEnv;

export const APP_ID = window._env_.VITE_NOVU_APP_ID || import.meta.env.VITE_NOVU_APP_ID;

export const WIDGET_EMBED_PATH =
  window._env_.VITE_WIDGET_EMBED_PATH ||
  import.meta.env.VITE_WIDGET_EMBED_PATH ||
  'http://localhost:4701/embed.umd.min.js';

export const IS_DOCKER_HOSTED =
  window._env_.VITE_DOCKER_HOSTED_ENV === 'true' || import.meta.env.VITE_DOCKER_HOSTED_ENV === 'true';

export const VITE_VERSION = version;

export const INTERCOM_APP_ID =
  window._env_.VITE_INTERCOM_APP_ID || process.env.VITE_INTERCOM_APP_ID || import.meta.env.VITE_INTERCOM_APP_ID || '';

export const CONTEXT_PATH = getContextPath(NovuComponentEnum.WEB);

export const WEBHOOK_URL = isPlaywright
  ? window._env_.VITE_WEBHOOK_URL || import.meta.env.VITE_WEBHOOK_URL || 'http://localhost:1341'
  : window._env_.VITE_WEBHOOK_URL || import.meta.env.VITE_WEBHOOK_URL || 'http://localhost:3003';

export const MAIL_SERVER_DOMAIN =
  window._env_.VITE_MAIL_SERVER_DOMAIN || import.meta.env.VITE_MAIL_SERVER_DOMAIN || 'dev.inbound-mail.novu.co';

export const LAUNCH_DARKLY_CLIENT_SIDE_ID =
  window._env_.VITE_LAUNCH_DARKLY_CLIENT_SIDE_ID || import.meta.env.VITE_LAUNCH_DARKLY_CLIENT_SIDE_ID;

export const FEATURE_FLAGS = Object.values(FeatureFlagsKeysEnum).reduce(
  (prev, key) => {
    const defaultValue = 'false';
    prev[key] = window._env_[key] || import.meta.env[key] || defaultValue;

    return prev;
  },
  {} as Record<FeatureFlagsKeysEnum, string | undefined>
);

export const HUBSPOT_PORTAL_ID = window._env_.VITE_HUBSPOT_EMBED || import.meta.env.VITE_HUBSPOT_EMBED;

export const IS_EU_ENV = (ENV === 'production' || ENV === 'prod') && API_ROOT.includes('eu.api.novu.co');

export const IS_EE_AUTH_ENABLED =
  window._env_.REACT_APP_IS_EE_AUTH_ENABLED === 'true' || process.env.REACT_APP_IS_EE_AUTH_ENABLED === 'true';

export const CLERK_PUBLISHABLE_KEY =
  window._env_.REACT_APP_CLERK_PUBLISHABLE_KEY || process.env.REACT_APP_CLERK_PUBLISHABLE_KEY || '';

if (IS_EE_AUTH_ENABLED && !CLERK_PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key');
}

export const BRIDGE_SYNC_SAMPLE_ENDPOINT = 'https://deploy-preview-8--onboarding-sandbox.netlify.app/api/novu';
/**
 * This is used for versioning the sandbox endpoints across revisions
 * On change, we should move the current one to the legacy list
 */
export const BRIDGE_ENDPOINTS_LEGACY_VERSIONS = [
  'https://onboarding-sandbox.netlify.app/api/novu',
  'https://deploy-preview-1--onboarding-sandbox.netlify.app/api/novu',
  'https://deploy-preview-4--onboarding-sandbox.netlify.app/api/novu',
  'https://deploy-preview-6--onboarding-sandbox.netlify.app/api/novu',
];
