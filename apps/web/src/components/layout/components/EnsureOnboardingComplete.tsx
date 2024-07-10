import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { ROUTES } from '../../../constants/routes';
import { IS_EE_AUTH_ENABLED } from '../../../config/index';
import { useBlueprint, useRedirectURL } from '../../../hooks';

export function EnsureOnboardingComplete({ children }: any) {
  useBlueprint();
  const location = useLocation();
  const { getRedirectURL } = useRedirectURL();
  const { currentOrganization, environmentId } = useAuth();

  function isOnboardingComplete() {
    if (IS_EE_AUTH_ENABLED) {
      return currentOrganization?.productUseCases !== undefined;
    }

    return !currentOrganization || !environmentId;
  }

  if (!currentOrganization) {
    return null;
  } else if (!isOnboardingComplete() && location.pathname !== ROUTES.AUTH_APPLICATION) {
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
