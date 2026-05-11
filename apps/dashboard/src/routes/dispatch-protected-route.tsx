import { FeatureFlagsKeysEnum } from '@novu/shared';
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { buildRoute, ROUTES } from '@/utils/routes';

type DispatchProtectedRouteProps = {
  children: ReactNode;
};

export function DispatchProtectedRoute({ children }: DispatchProtectedRouteProps) {
  const isDispatchEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_DISPATCH_DASHBOARD_ENABLED, false);
  const { currentEnvironment } = useEnvironment();

  if (!isDispatchEnabled) {
    const fallback = currentEnvironment?.slug
      ? buildRoute(ROUTES.WORKFLOWS, { environmentSlug: currentEnvironment.slug })
      : ROUTES.ROOT;

    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
