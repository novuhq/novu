import { buildRoute, ROUTES } from './routes';

export type AppId = 'novu' | 'connect';

export const APP_IDS = {
  NOVU: 'novu',
  CONNECT: 'connect',
} as const satisfies Record<string, AppId>;

const CONNECT_PATH_REGEX = /^\/env\/[^/]+\/connect(\/.*)?$/;

export function getAppIdFromPathname(pathname: string): AppId {
  if (CONNECT_PATH_REGEX.test(pathname)) {
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
