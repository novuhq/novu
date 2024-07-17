import { Navigate, useLocation } from 'react-router-dom';
import { type PropsWithChildren, useLayoutEffect } from 'react';
import { useAuth, useEnvironment, useMonitoring, useRoutes } from './hooks';
import { ROUTES } from './constants/routes';
import { IS_EE_AUTH_ENABLED } from './config/index';

export function ApplicationReadyGuard({ children }: PropsWithChildren<{}>) {
  useMonitoring();
  const location = useLocation();
  const { inPublicRoute, inStudioRoute } = useRoutes();
  const { isUserLoaded, isOrganizationLoaded, currentUser, currentOrganization } = useAuth();
  const { isLoaded: isEnvironmentLoaded } = useEnvironment();

  const isLoaded = isUserLoaded && isOrganizationLoaded && isEnvironmentLoaded;

  useLayoutEffect(() => {
    if (inPublicRoute || inStudioRoute || isLoaded) {
      const el = document.getElementById('loader');

      if (!el) {
        return;
      }

      el.addEventListener('transitionend', () => el.remove(), { once: true });

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
