import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { IS_HOSTNAME_SPLIT_ENABLED, IS_NOVU_CONNECT, NOVU_CONNECT_HOSTNAME } from '@/config';
import { useEnvironment } from '@/context/environment/hooks';
import { CONNECT_PATH_REGEX } from '@/utils/apps';
import { buildRoute, ROUTES } from '@/utils/routes';

type HostnameGuardProps = {
  children: ReactNode;
};

/**
 * When the hostname split is configured, enforces that each origin only renders the routes for
 * its own product:
 *
 *  - On the Connect hostname, any path under `/env/:slug/*` that is NOT `/env/:slug/connect/*`
 *    redirects to the Connect home for the current env. Connect-only origins should never show
 *    Platform pages (workflows, layouts, etc).
 *  - On the Platform hostname, any `/env/:slug/connect/*` path hard-navigates (full URL replace)
 *    to the same path on the Connect hostname so bookmarks and existing in-app links keep
 *    working seamlessly across origins.
 *
 * When the split is not configured (legacy single-origin / self-hosted), this guard is a no-op.
 */
export function HostnameGuard({ children }: HostnameGuardProps) {
  const location = useLocation();
  const { currentEnvironment } = useEnvironment();

  const isConnectPath = CONNECT_PATH_REGEX.test(location.pathname);
  const isEnvScopedPath = location.pathname.startsWith('/env/');

  const shouldRedirectCrossOrigin = !IS_NOVU_CONNECT && isConnectPath && IS_HOSTNAME_SPLIT_ENABLED;

  // Same-origin location.replace cannot be done inside render — keep it in an effect so React
  // commits the (empty) UI first. Returning `null` prevents the underlying route from rendering
  // briefly before the redirect kicks in.
  useEffect(() => {
    if (shouldRedirectCrossOrigin && typeof window !== 'undefined') {
      const url = `${window.location.protocol}//${NOVU_CONNECT_HOSTNAME}${location.pathname}${location.search}${location.hash}`;
      window.location.replace(url);
    }
  }, [shouldRedirectCrossOrigin, location.pathname, location.search, location.hash]);

  if (!IS_HOSTNAME_SPLIT_ENABLED) {
    return <>{children}</>;
  }

  if (shouldRedirectCrossOrigin) {
    return null;
  }

  // On the Connect host, anything other than a Connect route under /env/:slug/ collapses back
  // to the Connect home. We don't redirect non-env paths (auth, onboarding, settings) because
  // those are intentionally shared between hosts.
  if (IS_NOVU_CONNECT && isEnvScopedPath && !isConnectPath) {
    if (currentEnvironment?.slug) {
      return (
        <Navigate to={buildRoute(ROUTES.CONNECT_HOME, { environmentSlug: currentEnvironment.slug })} replace />
      );
    }

    return <Navigate to={ROUTES.ROOT} replace />;
  }

  return <>{children}</>;
}
