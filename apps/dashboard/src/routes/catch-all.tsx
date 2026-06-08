import { RiLoader4Line } from 'react-icons/ri';
import { Navigate, useLocation } from 'react-router-dom';
import { AGENT_TEMPLATE_ID_PARAM, readActiveAgentTemplateId } from '@/utils/agent-template-identity';
import {
  APP_IDS,
  buildAppHomeRoute,
  getAgentRouteTemplates,
  getCurrentAppId,
  LEGACY_CONNECT_PATH_REGEX,
} from '@/utils/apps';
import { buildRoute, ROUTES } from '@/utils/routes';
import { useEnvironment } from '../context/environment/hooks';

export const CatchAllRoute = () => {
  const { currentEnvironment, areEnvironmentsInitialLoading } = useEnvironment();
  const location = useLocation();
  const path = location.pathname.substring(1); // Remove leading slash

  if (areEnvironmentsInitialLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RiLoader4Line className="text-primary-base size-8 animate-spin" />
          <div className="text-text-sub text-label-sm">Loading environment...</div>
        </div>
      </div>
    );
  }

  if (!currentEnvironment?.slug) {
    return <Navigate to={ROUTES.ROOT} />;
  }

  const routeEntries = Object.entries(ROUTES);

  for (const [, routePath] of routeEntries) {
    if (
      typeof routePath === 'string' &&
      routePath.includes(':environmentSlug') &&
      routePath.startsWith('/env/:environmentSlug/') &&
      !routePath.includes('/', '/env/:environmentSlug/'.length)
    ) {
      const routeName = routePath.replace('/env/:environmentSlug/', '');

      if (path === routeName) {
        const targetPath = buildRoute(routePath, { environmentSlug: currentEnvironment.slug });
        return <Navigate to={`${targetPath}${location.search}${location.hash}`} />;
      }
    }
  }

  // A signed-in user arriving with an `agentTemplateId` (deep-link from an external app, possibly
  // persisted across the auth flow) is sent straight to the agents list, which opens the create
  // dialog prefilled from the matching template. Resolve the list route per app (Platform vs
  // Connect) so the redirect lands on a route that actually exists on the current host.
  const agentTemplateId = readActiveAgentTemplateId(new URLSearchParams(location.search).get(AGENT_TEMPLATE_ID_PARAM));

  if (agentTemplateId) {
    // Detect Connect by hostname (split-host deploys) or by the `/env/:slug/connect/*` path
    // (single-host dev, where the hostname can't tell the apps apart), so we land on the right
    // agents route for the active project.
    const isConnect =
      getCurrentAppId(location.pathname) === APP_IDS.CONNECT || LEGACY_CONNECT_PATH_REGEX.test(location.pathname);
    const agentsListRoute = getAgentRouteTemplates(isConnect ? APP_IDS.CONNECT : APP_IDS.NOVU).list;
    const agentsPath = buildRoute(agentsListRoute, { environmentSlug: currentEnvironment.slug });

    return <Navigate to={`${agentsPath}?${AGENT_TEMPLATE_ID_PARAM}=${encodeURIComponent(agentTemplateId)}`} />;
  }

  const homePath = buildAppHomeRoute(getCurrentAppId(location.pathname), currentEnvironment.slug);

  return <Navigate to={homePath ?? ROUTES.ENV} />;
};
