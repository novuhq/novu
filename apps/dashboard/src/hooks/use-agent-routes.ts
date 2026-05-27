import { useCurrentApp } from '@/hooks/use-current-app';
import { type AgentRouteTemplates, getAgentRouteTemplates } from '@/utils/apps';

export function useAgentRoutes(): AgentRouteTemplates {
  return getAgentRouteTemplates(useCurrentApp());
}
