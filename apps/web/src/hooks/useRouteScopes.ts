import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { PUBLIC_ROUTES_PREFIXES } from '../constants/routes';

export function useRouteScopes() {
  const location = useLocation();
  const inPublicRoute = useMemo(
    () => !!Array.from(PUBLIC_ROUTES_PREFIXES.values()).find((prefix) => location.pathname.startsWith(prefix)),
    [location]
  );
  const inPrivateRoute = !inPublicRoute;
  const inStudioRoute = useMemo(() => location.pathname.startsWith('/studio'), [location]);

  return {
    inPublicRoute,
    inPrivateRoute,
    inStudioRoute,
  };
}
