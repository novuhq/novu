import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { ROUTES } from '../../../constants/routes';
import { IS_EE_AUTH_ENABLED } from '../../../config/index';
import { useBlueprint, useEnvironment, useRedirectURL } from '../../../hooks';
import { useEffect, useState } from 'react';

export function EnsureOnboardingComplete({ children }: any) {
  useBlueprint();
  const location = useLocation();
  const { getRedirectURL } = useRedirectURL();
  const { currentUser, currentOrganization } = useAuth();
  const { currentEnvironment } = useEnvironment();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentOrganization && currentEnvironment) {
      setIsLoading(false);
    }
  }, [currentOrganization, currentEnvironment]);

  function isOnboardingComplete() {
    if (IS_EE_AUTH_ENABLED) {
      // TODO: replace with actual check property (e.g. isOnboardingCompleted)
      return currentOrganization?.productUseCases !== undefined;
    }

    return currentOrganization && currentEnvironment;
  }

  if (isLoading) {
    return null;
  }

  if (!currentUser) {
    return <Navigate to={ROUTES.AUTH_LOGIN} replace />;
  }

  if (!isOnboardingComplete() && location.pathname !== ROUTES.AUTH_APPLICATION) {
    return <Navigate to={ROUTES.AUTH_APPLICATION} replace />;
  }

  const redirectURL = getRedirectURL();
  if (redirectURL) {
    // Note: Do not use react-router-dom. The version we have doesn't do instant cross origin redirects.
    window.location.replace(redirectURL);

    return null;
  }

  return children;
}
