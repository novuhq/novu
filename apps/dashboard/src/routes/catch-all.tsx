import { RiLoader4Line } from 'react-icons/ri';
import { Navigate, useLocation } from 'react-router-dom';
import { buildRoute, ROUTES } from '@/utils/routes';
import { useAuth } from '../context/auth/hooks';
import { useEnvironment } from '../context/environment/hooks';

export const CatchAllRoute = () => {
  const { currentEnvironment, areEnvironmentsInitialLoading } = useEnvironment();
  const { isOrganizationLoaded, currentOrganization } = useAuth();
  const location = useLocation();
  const path = location.pathname.substring(1); // Remove leading slash

  // Show loading while organization or environments are loading
  // Note: areEnvironmentsInitialLoading is false when query is disabled (no org yet),
  // so we also check if organization is still loading
  const isLoading = areEnvironmentsInitialLoading || !isOrganizationLoaded;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RiLoader4Line className="text-primary-base size-8 animate-spin" />
          <div className="text-text-sub text-label-sm">Loading environment...</div>
        </div>
      </div>
    );
  }

  // If organization is loaded but no environment, there might be an issue
  // Show loader instead of redirecting to same URL (prevents infinite loop)
  if (!currentEnvironment?.slug) {
    // If we have an organization but no environments, something is wrong
    // Show a more helpful message or redirect to a setup page
    if (currentOrganization) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RiLoader4Line className="text-primary-base size-8 animate-spin" />
            <div className="text-text-sub text-label-sm">Setting up environment...</div>
          </div>
        </div>
      );
    }
    // No organization means user needs to create one
    return <Navigate to={ROUTES.SIGNUP_ORGANIZATION_LIST} />;
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

  return (
    <Navigate
      to={
        currentEnvironment?.slug
          ? buildRoute(ROUTES.WORKFLOWS, {
              environmentSlug: currentEnvironment.slug,
            })
          : ROUTES.ENV
      }
    />
  );
};
