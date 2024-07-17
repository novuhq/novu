import { Navigate, useLocation } from 'react-router-dom';
import { type PropsWithChildren, useLayoutEffect } from 'react';
import { useAuth, useEnvironment } from './hooks';
import { isStudioRoute } from './studio/utils/routing';
import { ROUTES } from './constants/routes';
import { IS_EE_AUTH_ENABLED } from './config/index';

export function ApplicationReadyGuard({ children }: PropsWithChildren<{}>) {
  const location = useLocation();
  const { isUserLoading, isOrganizationLoading, inPublicRoute, currentUser, currentOrganization } = useAuth();
  const { isLoading: isEnvironmentLoading } = useEnvironment();

  const isLoading = isStudioRoute(location.pathname)
    ? isUserLoading || isOrganizationLoading
    : isUserLoading || isOrganizationLoading || isEnvironmentLoading;

  console.log('isLoading', isLoading, isUserLoading, isOrganizationLoading, isEnvironmentLoading);

  /*
   * Clean up the skeleton loader when the app is ready for public and private paths
   * In public paths the app is ready immediately
   * In private paths the app is ready when user, organization and environment are loaded
   */
  useLayoutEffect(() => {
    if (inPublicRoute || !isLoading) {
      document.getElementById('loader')?.remove();
    }
  }, [inPublicRoute, isLoading]);

  function isOnboardingComplete() {
    if (IS_EE_AUTH_ENABLED) {
      // TODO: replace with actual check property (e.g. isOnboardingCompleted)
      return currentOrganization?.productUseCases !== undefined;
    }

    return currentOrganization;
  }

  if (inPublicRoute) {
    return <>{children}</>;
  }

  if (isLoading) {
    return null;
  }

  if (!currentUser && location.pathname !== ROUTES.AUTH_LOGIN) {
    return <Navigate to={ROUTES.AUTH_LOGIN} replace />;
  }

  if (!isOnboardingComplete() && location.pathname !== ROUTES.AUTH_APPLICATION) {
    return <Navigate to={ROUTES.AUTH_APPLICATION} replace />;
  }

  return <>{children}</>;
}
