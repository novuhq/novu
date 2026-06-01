import { IS_HOSTNAME_SPLIT_ENABLED } from '@/config';
import { APP_IDS, type AppId, buildOtherAppExternalUrl, getCurrentAppId, isAbsoluteUrl } from './apps';
import { buildRoute, ROUTES } from './routes';

const APP_ID_PARAM = 'appId';

const APP_ID_VALUES = new Set<string>([APP_IDS.NOVU, APP_IDS.CONNECT]);

// Query-param signal stamped on the onboarding -> product-home navigation. A query param is used
// (instead of router state) because the Connect onboarding -> dashboard hop is a full document load
// — it has to be, so Clerk re-boots and resyncs the freshly created org — and router state does not
// survive that. The destination reads it once and strips it, so it behaves as a one-shot "where you
// came from" marker without persistent storage or metadata; a later refresh has no param and so
// doesn't re-trigger onboarding.
const ONBOARDING_SOURCE_PARAM = 'fromOnboarding';
const ONBOARDING_SOURCE_VALUE = '1';

// Appends the onboarding-source marker to a relative path or absolute URL, preserving its form and
// any existing query/hash so callers can hand the result straight to `navigate` or `assign`.
export function withOnboardingSource(target: string): string {
  try {
    const url = new URL(target, window.location.origin);
    url.searchParams.set(ONBOARDING_SOURCE_PARAM, ONBOARDING_SOURCE_VALUE);

    return isAbsoluteUrl(target) ? url.toString() : `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return target;
  }
}

export function isOnboardingSource(search: URLSearchParams): boolean {
  return search.get(ONBOARDING_SOURCE_PARAM) === ONBOARDING_SOURCE_VALUE;
}

// Strips the marker from a copy of the current params so the destination can replace it out of the
// URL after reading — keeping the param a one-shot signal.
export function stripOnboardingSource(search: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(search);
  next.delete(ONBOARDING_SOURCE_PARAM);

  return next;
}

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
