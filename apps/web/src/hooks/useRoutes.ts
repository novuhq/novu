import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { PUBLIC_ROUTES_PREFIXES } from '../constants/routes';

export function useRoutes() {
  const location = useLocation();
  const inPublicRoute = useMemo(
    () => !!Array.from(PUBLIC_ROUTES_PREFIXES.values()).find((prefix) => location.pathname.startsWith(prefix)),
    [location]
  );
  const inPrivateRoute = !inPublicRoute;
  const inStudioRoute = location.pathname.startsWith('/studio');

  return {
    inPublicRoute,
    inPrivateRoute,
    inStudioRoute,
  };
}
