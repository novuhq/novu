import { IS_HOSTNAME_SPLIT_ENABLED } from '@/config';
import { APP_IDS, type AppId, buildOtherAppExternalUrl, getCurrentAppId } from './apps';
import { buildRoute, ROUTES } from './routes';

const APP_ID_PARAM = 'appId';

const APP_ID_VALUES = new Set<string>([APP_IDS.NOVU, APP_IDS.CONNECT]);

export function getOnboardingAppId(search: URLSearchParams): AppId | undefined {
  const raw = search.get(APP_ID_PARAM);

  if (raw && APP_ID_VALUES.has(raw)) {
    return raw as AppId;
  }

  return undefined;
}

// Prefers explicit `?appId=` (cross-host handoff) and falls back to the current hostname.
export function resolveOnboardingAppId(search: URLSearchParams): AppId {
  return getOnboardingAppId(search) ?? getCurrentAppId();
}

export function withAppId(path: string, appId: AppId | undefined): string {
  if (!appId) {
    return path;
  }

  const separator = path.includes('?') ? '&' : '?';

  return `${path}${separator}${APP_ID_PARAM}=${appId}`;
}

export function getPostOrgCreateRoute(appId: AppId, _isAgentsEnabled: boolean): string {
  if (appId === APP_IDS.CONNECT) {
    return ROUTES.AGENTS_SETUP;
  }

  // Platform skips the usecase picker and starts directly with notifications/inbox.
  return ROUTES.INBOX_USECASE;
}

// May return an absolute URL when crossing to the other product host — callers must check
// `apps.isAbsoluteUrl` and use `window.location.assign` so the cross-origin navigation happens.
export function getPostOnboardingRoute(appId: AppId | undefined, environmentSlug: string): string {
  if (appId === APP_IDS.CONNECT) {
    if (IS_HOSTNAME_SPLIT_ENABLED) {
      const external = buildOtherAppExternalUrl(APP_IDS.CONNECT, environmentSlug);

      if (external) {
        return external;
      }
    }

    return buildRoute(ROUTES.CONNECT_HOME, { environmentSlug });
  }

  return buildRoute(ROUTES.WORKFLOWS, { environmentSlug });
}
