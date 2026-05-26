import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { IS_HOSTNAME_SPLIT_ENABLED, IS_NOVU_CONNECT, NOVU_CONNECT_HOSTNAME } from '@/config';
import { useEnvironment } from '@/context/environment/hooks';
import { LEGACY_CONNECT_PATH_REGEX } from '@/utils/apps';
import { buildRoute, ROUTES } from '@/utils/routes';

type HostnameGuardProps = {
  children: ReactNode;
};

// Connect host: collapses non-Connect `/env/:slug/*` paths to Connect home.
// Platform host: cross-origin redirects stale `/env/:slug/connect/*` bookmarks to the satellite.
export function HostnameGuard({ children }: HostnameGuardProps) {
  const location = useLocation();
  const { currentEnvironment } = useEnvironment();

  const isConnectPath = LEGACY_CONNECT_PATH_REGEX.test(location.pathname);
  const isEnvScopedPath = location.pathname.startsWith('/env/');

  const shouldRedirectCrossOrigin = IS_HOSTNAME_SPLIT_ENABLED && !IS_NOVU_CONNECT && isConnectPath;

  useEffect(() => {
    if (!shouldRedirectCrossOrigin || typeof window === 'undefined') {
      return;
    }

    const url = `${window.location.protocol}//${NOVU_CONNECT_HOSTNAME}${location.pathname}${location.search}${location.hash}`;

    // Plain cross-origin replace — Clerk's satellite SDK runs its handshake on the destination page.
    window.location.replace(url);
  }, [shouldRedirectCrossOrigin, location.pathname, location.search, location.hash]);

  if (!IS_HOSTNAME_SPLIT_ENABLED) {
    return <>{children}</>;
  }

  if (shouldRedirectCrossOrigin) {
    return null;
  }

  if (IS_NOVU_CONNECT && isEnvScopedPath && !isConnectPath) {
    if (currentEnvironment?.slug) {
      return <Navigate to={buildRoute(ROUTES.CONNECT_HOME, { environmentSlug: currentEnvironment.slug })} replace />;
    }

    return <Navigate to={ROUTES.ROOT} replace />;
  }

  return <>{children}</>;
}
