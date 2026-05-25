import { IS_HOSTNAME_SPLIT_ENABLED, IS_NOVU_CONNECT, NOVU_CONNECT_HOSTNAME, NOVU_PLATFORM_HOSTNAME } from '@/config';
import { buildRoute, ROUTES } from './routes';

export type AppId = 'novu' | 'connect';

export const APP_IDS = {
  NOVU: 'novu',
  CONNECT: 'connect',
} as const satisfies Record<string, AppId>;

/**
 * Matches the legacy `/env/:slug/connect/*` paths. Connect doesn't render on the Platform host
 * anymore, but bookmarks and stale links still arrive here — `HostnameGuard` uses this to do a
 * one-shot redirect to the Connect satellite.
 */
export const LEGACY_CONNECT_PATH_REGEX = /^\/env\/[^/]+\/connect(\/.*)?$/;

/**
 * Current product is driven exclusively by `window.location.host`. Connect requires the
 * hostname split to be configured; everywhere else this resolves to Platform.
 *
 * `pathname` is accepted for backward compatibility but is intentionally ignored — there's no
 * legacy in-path Connect to detect.
 */
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

/**
 * Build an absolute URL pointing at the other product. Returns:
 *  - `https://{hostname}{path}` when the corresponding hostname env var is set
 *  - the bare path (same-origin) as a fallback when no hostname is configured
 *  - undefined when no env slug is available so callers can disable the link
 */
type BuildOtherAppExternalUrlOptions = {
  /** Cross-app entry runs org resolution on org-list before loading the app shell. */
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

/**
 * Returns true when the given path string is an absolute URL (different origin). Helps callers
 * pick between `window.location.assign` and react-router `navigate`.
 */
export function isAbsoluteUrl(target: string): boolean {
  return /^https?:\/\//i.test(target);
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
