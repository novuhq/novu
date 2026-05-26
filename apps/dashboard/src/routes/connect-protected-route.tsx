import { FeatureFlagsKeysEnum } from '@novu/shared';
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { ConnectBreadcrumbProvider } from '@/components/dashboard-shell/connect-breadcrumb-provider';
import { IS_HOSTNAME_SPLIT_ENABLED, IS_NOVU_CONNECT } from '@/config';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { buildRoute, ROUTES } from '@/utils/routes';

type ConnectProtectedRouteProps = {
  children: ReactNode;
};

export function ConnectProtectedRoute({ children }: ConnectProtectedRouteProps) {
  const isConnectFlagEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CONNECT_DASHBOARD_ENABLED, false);
  const { currentEnvironment } = useEnvironment();

  // Hostname split + Connect host + LD rollout flag must all align.
  const isAllowed = IS_HOSTNAME_SPLIT_ENABLED && IS_NOVU_CONNECT && isConnectFlagEnabled;

  if (!isAllowed) {
    const fallback = currentEnvironment?.slug
      ? buildRoute(ROUTES.WORKFLOWS, { environmentSlug: currentEnvironment.slug })
      : ROUTES.ROOT;

    return <Navigate to={fallback} replace />;
  }

  return <ConnectBreadcrumbProvider>{children}</ConnectBreadcrumbProvider>;
}
