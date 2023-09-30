import { Navigate, useLocation } from 'react-router-dom';
import { ROUTES } from '../../constants/routes.enum';
import { useBlueprint, getToken, getTokenPayload } from '../../hooks';
import { useAuthContext } from '../providers/AuthProvider';
import decode from 'jwt-decode';
import { IJwtPayload } from '@novu/shared';

function jwtHasKey(key: string) {
  const token = getToken();

  if (!token) return false;
  const jwt = decode<IJwtPayload>(token);

  return jwt && jwt[key];
}

export function RequiredAuth({ children }: any) {
  useBlueprint();
  const { logout } = useAuthContext();
  const location = useLocation();

  // TODO: remove after env migration
  const payload = getTokenPayload();
  if (payload && (payload as any).applicationId) {
    logout();
    window.location.reload();
  }

  // Logout if token.exp is in the past (expired)
  if (payload && payload.exp && payload.exp <= Date.now() / 1000) {
    logout();

    return null;
  }

  if (!getToken()) {
    return <Navigate to={ROUTES.AUTH_LOGIN} replace />;
  } else if (
    !jwtHasKey('organizationId') ||
    (!jwtHasKey('environmentId') && location.pathname !== ROUTES.AUTH_APPLICATION)
  ) {
    return <Navigate to={ROUTES.AUTH_APPLICATION} replace />;
  } else {
    return children;
  }
}
