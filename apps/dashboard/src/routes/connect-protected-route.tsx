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

  // With the hostname split configured, the source of truth for Connect access is the hostname
  // itself — the LD flag is only consulted as a per-tenant gate on top of that. Without the
  // split, the flag remains the sole gate so legacy single-origin deployments are unchanged.
  // Cross-origin redirects from Platform → Connect are handled by HostnameGuard before this
  // route ever mounts, so here we only need to guard the "in Connect but flag off" case.
  const isAllowed = IS_HOSTNAME_SPLIT_ENABLED ? IS_NOVU_CONNECT && isConnectFlagEnabled : isConnectFlagEnabled;

  if (!isAllowed) {
    const fallback = currentEnvironment?.slug
      ? buildRoute(ROUTES.WORKFLOWS, { environmentSlug: currentEnvironment.slug })
      : ROUTES.ROOT;

    return <Navigate to={fallback} replace />;
  }

  return <ConnectBreadcrumbProvider>{children}</ConnectBreadcrumbProvider>;
}
