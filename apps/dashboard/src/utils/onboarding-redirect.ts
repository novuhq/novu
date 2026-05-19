import { APP_IDS, type AppId } from './apps';
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

export function withAppId(path: string, appId: AppId | undefined): string {
  if (!appId) {
    return path;
  }

  const separator = path.includes('?') ? '&' : '?';

  return `${path}${separator}${APP_ID_PARAM}=${appId}`;
}

export function getPostOnboardingRoute(appId: AppId | undefined, environmentSlug: string): string {
  if (appId === APP_IDS.CONNECT) {
    return buildRoute(ROUTES.CONNECT_HOME, { environmentSlug });
  }

  return buildRoute(ROUTES.WORKFLOWS, { environmentSlug });
}
