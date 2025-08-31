export const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

export const MODE = import.meta.env.MODE;

export const LAUNCH_DARKLY_CLIENT_SIDE_ID = import.meta.env.VITE_LAUNCH_DARKLY_CLIENT_SIDE_ID;

export const HUBSPOT_PORTAL_ID = import.meta.env.VITE_HUBSPOT_EMBED;

export const IS_EE_AUTH_ENABLED = import.meta.env.VITE_IS_EE_AUTH_ENABLED === 'true';

export const CLERK_PUBLISHABLE_KEY =
  window._env_?.VITE_CLERK_PUBLISHABLE_KEY || import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

export const APP_ID = import.meta.env.VITE_NOVU_APP_ID || '';

export const API_HOSTNAME = window._env_?.VITE_API_HOSTNAME || import.meta.env.VITE_API_HOSTNAME;

export const IS_EU = API_HOSTNAME === 'https://eu.api.novu.co';

export const WEBSOCKET_HOSTNAME = window._env_?.VITE_WEBSOCKET_HOSTNAME || import.meta.env.VITE_WEBSOCKET_HOSTNAME;

export const INTERCOM_APP_ID = import.meta.env.VITE_INTERCOM_APP_ID;

export const SEGMENT_KEY = import.meta.env.VITE_SEGMENT_KEY;

export const MIXPANEL_KEY = import.meta.env.VITE_MIXPANEL_KEY;

export const LEGACY_DASHBOARD_URL =
  window._env_?.VITE_LEGACY_DASHBOARD_URL || import.meta.env.VITE_LEGACY_DASHBOARD_URL;

export const PLAIN_SUPPORT_CHAT_APP_ID = import.meta.env.VITE_PLAIN_SUPPORT_CHAT_APP_ID;

export const ONBOARDING_DEMO_WORKFLOW_ID = 'onboarding-demo-workflow';

export const IS_SELF_HOSTED = (window._env_?.VITE_SELF_HOSTED || import.meta.env.VITE_SELF_HOSTED) === 'true';

export const IS_ENTERPRISE = (window._env_?.VITE_NOVU_ENTERPRISE || import.meta.env.VITE_NOVU_ENTERPRISE) === 'true';

if (!IS_SELF_HOSTED && !CLERK_PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key');
}

export const SELF_HOSTED_UPGRADE_REDIRECT_URL = 'https://go.novu.co/hosted-upgrade';
