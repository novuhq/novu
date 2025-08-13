import { FeatureFlagsKeysEnum } from '@novu/shared';
import { RiLoader4Line } from 'react-icons/ri';
import { Navigate, useLocation } from 'react-router-dom';
import { buildRoute, ROUTES } from '@/utils/routes';
import { useEnvironment } from '../context/environment/hooks';
import { useFeatureFlag } from '../hooks/use-feature-flag';

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
