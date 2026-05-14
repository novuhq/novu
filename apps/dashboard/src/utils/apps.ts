import { buildRoute, ROUTES } from './routes';

export type AppId = 'novu' | 'dispatch';

export const APP_IDS = {
  NOVU: 'novu',
  DISPATCH: 'dispatch',
} as const satisfies Record<string, AppId>;

const DISPATCH_PATH_REGEX = /^\/env\/[^/]+\/dispatch(\/.*)?$/;

export function getAppIdFromPathname(pathname: string): AppId {
  if (DISPATCH_PATH_REGEX.test(pathname)) {
    return APP_IDS.DISPATCH;
  }

  return APP_IDS.NOVU;
}

export function buildAppHomeRoute(appId: AppId, environmentSlug: string | undefined): string | undefined {
  if (!environmentSlug) {
    return undefined;
  }

  if (appId === APP_IDS.DISPATCH) {
    return buildRoute(ROUTES.DISPATCH_HOME, { environmentSlug });
  }

  return buildRoute(ROUTES.WORKFLOWS, { environmentSlug });
}

export const APP_LABELS: Record<AppId, string> = {
  novu: 'Platform',
  dispatch: 'Dispatch',
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
  dispatch: {
    list: ROUTES.DISPATCH_AGENTS,
    details: ROUTES.DISPATCH_AGENT_DETAILS,
    detailsTab: ROUTES.DISPATCH_AGENT_DETAILS_TAB,
    integrationDetail: ROUTES.DISPATCH_AGENT_DETAILS_INTEGRATIONS_DETAIL,
  },
};

export function getAgentRouteTemplates(appId: AppId): AgentRouteTemplates {
  return AGENT_ROUTE_TEMPLATES[appId];
}

export type DispatchSectionId = 'dashboard' | 'agents' | 'conversations' | 'api-keys' | 'settings';

export const DISPATCH_SECTION_LABELS: Record<DispatchSectionId, string> = {
  dashboard: 'Dashboard',
  agents: 'Agents',
  conversations: 'Conversations',
  'api-keys': 'API Keys',
  settings: 'Settings',
};

const DISPATCH_SEGMENT_TO_SECTION: Record<string, DispatchSectionId> = {
  agents: 'agents',
  conversations: 'conversations',
  'api-keys': 'api-keys',
  settings: 'settings',
};

export function getDispatchSectionFromPathname(pathname: string): DispatchSectionId {
  const match = pathname.match(/^\/env\/[^/]+\/dispatch(?:\/([^/]+))?/);

  if (!match) {
    return 'dashboard';
  }

  const firstSegment = match[1];

  if (!firstSegment) {
    return 'dashboard';
  }

  return DISPATCH_SEGMENT_TO_SECTION[firstSegment] ?? 'dashboard';
}
