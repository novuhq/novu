import { buildRoute, ROUTES } from './routes';

export type AppId = 'novu' | 'dispatch';

export const APP_IDS = {
  NOVU: 'novu',
  DISPATCH: 'dispatch',
} as const satisfies Record<string, AppId>;

const DISPATCH_PATH_REGEX = /^\/env\/[^/]+\/dispatch(\/.*)?$/;

export function getAppIdFromPathname(pathname: string): AppId {
  if (DISPATCH_PATH_REGEX.test(pathname)) {
    return APP_IDS.DISPATCH;
  }

  return APP_IDS.NOVU;
}

export function buildAppHomeRoute(appId: AppId, environmentSlug: string | undefined): string | undefined {
  if (!environmentSlug) {
    return undefined;
  }

  if (appId === APP_IDS.DISPATCH) {
    return buildRoute(ROUTES.DISPATCH_HOME, { environmentSlug });
  }

  return buildRoute(ROUTES.WORKFLOWS, { environmentSlug });
}

export const APP_LABELS: Record<AppId, string> = {
  novu: 'Platform',
  dispatch: 'Dispatch',
};
