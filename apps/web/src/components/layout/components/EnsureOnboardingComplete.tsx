import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { ROUTES } from '../../../constants/routes';
import { useBlueprint, useRedirectURL } from '../../../hooks';

export function EnsureOnboardingComplete({ children }: any) {
  useBlueprint();
  const location = useLocation();
  const { getRedirectURL } = useRedirectURL();
  const { currentOrganization, environmentId } = useAuth();

  if ((!currentOrganization || !environmentId) && location.pathname !== ROUTES.AUTH_APPLICATION) {
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
