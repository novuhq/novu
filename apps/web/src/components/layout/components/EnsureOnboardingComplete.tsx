import { Navigate, useLocation } from 'react-router-dom';
import { ROUTES } from '../../../constants/routes.enum';
import { useBlueprint, useAuthController } from '../../../hooks/index';

export function EnsureOnboardingComplete({ children }: any) {
  useBlueprint();
  const location = useLocation();
  const { user } = useAuthController();

  if ((!user?.organizationId || !user?.environmentId) && location.pathname !== ROUTES.AUTH_APPLICATION) {
    return <Navigate to={ROUTES.AUTH_APPLICATION} replace />;
  } else {
    return children;
  }
}
