import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { ROUTES } from '../../../constants/routes';
import { useBlueprint } from '../../../hooks/index';

export function EnsureOnboardingComplete({ children }: any) {
  useBlueprint();
  const location = useLocation();
  const { currentUser, currentOrganization } = useAuth();

  if (!currentUser) {
    return <Navigate to={ROUTES.AUTH_LOGIN} replace />;
  }

  // TODO: Ensure orgs and envs are created at the same time
  if (!currentOrganization && location.pathname !== ROUTES.AUTH_APPLICATION) {
    return <Navigate to={ROUTES.AUTH_APPLICATION} replace />;
  }

  return children;
}
