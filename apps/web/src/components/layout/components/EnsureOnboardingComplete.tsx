import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@novu/shared-web';
import { ROUTES } from '../../../constants/routes.enum';
import { useBlueprint } from '../../../hooks/index';

export function EnsureOnboardingComplete({ children }: any) {
  useBlueprint();
  const location = useLocation();
  const { claims } = useAuth();

  if ((!claims?.organizationId || !claims?.environmentId) && location.pathname !== ROUTES.AUTH_APPLICATION) {
    return <Navigate to={ROUTES.AUTH_APPLICATION} replace />;
  }

  return children;
}
