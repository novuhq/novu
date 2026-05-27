import { IS_NOVU_CONNECT } from '@/config';
import { APP_IDS, getCurrentAppId } from '../apps';

/** Connect auto-provisions workspaces; manual org creation is Platform-only. */
export function isManualOrgCreationAllowed(pathname?: string): boolean {
  if (IS_NOVU_CONNECT) {
    return false;
  }

  if (pathname && getCurrentAppId(pathname) === APP_IDS.CONNECT) {
    return false;
  }

  return true;
}
