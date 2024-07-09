import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { ROUTES } from '../../../constants/routes';
import { useBlueprint } from '../../../hooks/index';
import { IS_EE_AUTH_ENABLED } from '../../../config/index';

export function EnsureOnboardingComplete({ children }: any) {
  useBlueprint();
  const location = useLocation();
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

  return children;
}
