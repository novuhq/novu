import { FeatureFlagsKeysEnum } from '@novu/shared';
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { ConnectBreadcrumbProvider } from '@/components/dashboard-shell/connect-breadcrumb-provider';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { buildRoute, ROUTES } from '@/utils/routes';

type ConnectProtectedRouteProps = {
  children: ReactNode;
};

export function ConnectProtectedRoute({ children }: ConnectProtectedRouteProps) {
  const isConnectEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CONNECT_DASHBOARD_ENABLED, false);
  const { currentEnvironment } = useEnvironment();

  if (!isConnectEnabled) {
    const fallback = currentEnvironment?.slug
      ? buildRoute(ROUTES.WORKFLOWS, { environmentSlug: currentEnvironment.slug })
      : ROUTES.ROOT;

    return <Navigate to={fallback} replace />;
  }

  return <ConnectBreadcrumbProvider>{children}</ConnectBreadcrumbProvider>;
}
