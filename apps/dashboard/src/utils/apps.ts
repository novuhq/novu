import { IS_HOSTNAME_SPLIT_ENABLED, IS_NOVU_CONNECT, NOVU_CONNECT_HOSTNAME, NOVU_PLATFORM_HOSTNAME } from '@/config';
import { buildRoute, ROUTES } from './routes';

export type AppId = 'novu' | 'connect';

export const APP_IDS = {
  NOVU: 'novu',
  CONNECT: 'connect',
} as const satisfies Record<string, AppId>;

// Matches stale `/env/:slug/connect/*` bookmarks for the Platform → Connect host redirect.
export const LEGACY_CONNECT_PATH_REGEX = /^\/env\/[^/]+\/connect(\/.*)?$/;

// `pathname` is accepted for backward compatibility but ignored — product is hostname-driven.
export function getCurrentAppId(_pathname?: string): AppId {
  if (IS_HOSTNAME_SPLIT_ENABLED && IS_NOVU_CONNECT) {
    return APP_IDS.CONNECT;
  }

  return APP_IDS.NOVU;
}

export function buildAppHomeRoute(appId: AppId, environmentSlug: string | undefined): string | undefined {
  if (!environmentSlug) {
    return undefined;
  }

  if (appId === APP_IDS.CONNECT) {
    return buildRoute(ROUTES.CONNECT_HOME, { environmentSlug });
  }

  return buildRoute(ROUTES.WORKFLOWS, { environmentSlug });
}

type BuildOtherAppExternalUrlOptions = {
  // Route through org-list so cross-app entry resolves the target product workspace first.
  useOrgResolutionEntry?: boolean;
};

export function buildOtherAppExternalUrl(
  targetAppId: AppId,
  environmentSlug: string | undefined,
  options?: BuildOtherAppExternalUrlOptions
): string | undefined {
  const path = options?.useOrgResolutionEntry
    ? ROUTES.SIGNUP_ORGANIZATION_LIST
    : buildAppHomeRoute(targetAppId, environmentSlug);

  if (!path) {
    return undefined;
  }

  const host = targetAppId === APP_IDS.CONNECT ? NOVU_CONNECT_HOSTNAME : NOVU_PLATFORM_HOSTNAME;

  if (!host || typeof window === 'undefined') {
    return path;
  }

  return `${window.location.protocol}//${host}${path}`;
}

export function isAbsoluteUrl(target: string): boolean {
  return /^https?:\/\//i.test(target);
}

const SAFE_NAVIGATION_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Whitelist hrefs handed to `window.location.assign` / `window.open` / anchor `href` so
 * `javascript:`, `data:`, `vbscript:`, etc. can't ride through CrossAppLink / useCrossAppNavigation.
 * Absolute hrefs are parsed; relative paths (start with `/`) and same-page fragments are trusted.
 */
export function isSafeNavigationHref(href: string): boolean {
  if (!href) return false;
  // Reject protocol-relative URLs (e.g. `//evil.example`) before the "starts with `/`" shortcut —
  // browsers resolve them against the current scheme and can leak the user to arbitrary hosts.
  if (href.startsWith('//')) return false;
  if (href.startsWith('/') || href.startsWith('#') || href.startsWith('?')) return true;

  try {
    const parsed = new URL(href, window.location.origin);

    return SAFE_NAVIGATION_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

export const APP_LABELS: Record<AppId, string> = {
  novu: 'Platform',
  connect: 'Connect',
};

export type AgentRouteTemplates = {
  list: string;
  details: string;
  detailsTab: string;
  integrationDetail: string;
};

const AGENT_ROUTE_TEMPLATES: Record<AppId, AgentRouteTemplates> = {
  novu: {
    list: ROUTES.AGENTS,
    details: ROUTES.AGENT_DETAILS,
    detailsTab: ROUTES.AGENT_DETAILS_TAB,
    integrationDetail: ROUTES.AGENT_DETAILS_INTEGRATIONS_DETAIL,
  },
  connect: {
    list: ROUTES.CONNECT_AGENTS,
    details: ROUTES.CONNECT_AGENT_DETAILS,
    detailsTab: ROUTES.CONNECT_AGENT_DETAILS_TAB,
    integrationDetail: ROUTES.CONNECT_AGENT_DETAILS_INTEGRATIONS_DETAIL,
  },
};

export function getAgentRouteTemplates(appId: AppId): AgentRouteTemplates {
  return AGENT_ROUTE_TEMPLATES[appId];
}

export type ConnectSectionId = 'dashboard' | 'agents' | 'conversations' | 'api-keys' | 'settings';

export const CONNECT_SECTION_LABELS: Record<ConnectSectionId, string> = {
  dashboard: 'Dashboard',
  agents: 'Agents',
  conversations: 'Conversations',
  'api-keys': 'API Keys',
  settings: 'Settings',
};

const CONNECT_SEGMENT_TO_SECTION: Record<string, ConnectSectionId> = {
  agents: 'agents',
  conversations: 'conversations',
  'api-keys': 'api-keys',
  settings: 'settings',
};

export function getConnectSectionFromPathname(pathname: string): ConnectSectionId {
  const match = pathname.match(/^\/env\/[^/]+\/connect(?:\/([^/]+))?/);

  if (!match) {
    return 'dashboard';
  }

  const firstSegment = match[1];

  if (!firstSegment) {
    return 'dashboard';
  }

  return CONNECT_SEGMENT_TO_SECTION[firstSegment] ?? 'dashboard';
}
