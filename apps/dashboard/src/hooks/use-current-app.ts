import { useLocation } from 'react-router-dom';
import { type AppId, getCurrentAppId } from '@/utils/apps';

/**
 * Returns the current product (Platform or Connect). Hostname-driven when
 * `VITE_NOVU_CONNECT_HOSTNAME` is configured; otherwise falls back to the legacy pathname
 * check so self-hosted deployments without a hostname split keep working.
 */
export function useCurrentApp(): AppId {
  const location = useLocation();

  return getCurrentAppId(location.pathname);
}
