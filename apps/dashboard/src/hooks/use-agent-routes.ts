import { ROUTES } from '@/utils/routes';

export type AgentRouteTemplates = {
  list: string;
  details: string;
  detailsTab: string;
  integrationDetail: string;
};

const AGENT_ROUTE_TEMPLATES: AgentRouteTemplates = {
  list: ROUTES.AGENTS,
  details: ROUTES.AGENT_DETAILS,
  detailsTab: ROUTES.AGENT_DETAILS_TAB,
  integrationDetail: ROUTES.AGENT_DETAILS_INTEGRATIONS_DETAIL,
};

export function useAgentRoutes(): AgentRouteTemplates {
  return AGENT_ROUTE_TEMPLATES;
}
