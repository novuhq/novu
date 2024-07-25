import { Navigate, useLocation } from 'react-router-dom';
import { type PropsWithChildren, useLayoutEffect } from 'react';
import { useAuth, useEnvironment, useMonitoring, useRouteScopes } from './hooks';
import { ROUTES } from './constants/routes';
import { IS_EE_AUTH_ENABLED } from './config/index';

export function ApplicationReadyGuard({ children }: PropsWithChildren<{}>) {
  useMonitoring();
  const location = useLocation();
  const { inPublicRoute, inStudioRoute } = useRouteScopes();
  const { isUserLoaded, isOrganizationLoaded, currentUser, currentOrganization } = useAuth();
  const { isLoaded: isEnvironmentLoaded } = useEnvironment();

  const isLoaded = isUserLoaded && isOrganizationLoaded && isEnvironmentLoaded;

  // Clean up the skeleton loader when the app is ready
  useLayoutEffect(() => {
    if (inPublicRoute || inStudioRoute || isLoaded) {
      const el = document.getElementById('loader');

      if (!el) {
        return;
      }

      /*
       * Playwright doesn't always trigger transitionend, so we are using setTimeout
       * instead to remove the skeleton loader at the end of the animation.
       */
      setTimeout(() => el.remove(), 550);
      requestAnimationFrame(() => el.classList.add('fade-out'));
    }
  }, [inPublicRoute, inStudioRoute, isLoaded]);

  function isOnboardingComplete() {
    if (IS_EE_AUTH_ENABLED) {
      // TODO: replace with actual check property (e.g. isOnboardingCompleted)
      return currentOrganization?.productUseCases !== undefined;
    }

    return currentOrganization;
  }

  if (inPublicRoute || inStudioRoute) {
    return <>{children}</>;
  }

  if (!isLoaded) {
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
