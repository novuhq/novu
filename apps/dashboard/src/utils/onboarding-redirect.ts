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

/**
 * Canonical product resolver for onboarding flows. Prefers an explicit `?appId=` query param
 * (used for the Platform → Connect cross-origin handoff) and falls back to hostname detection.
 *
 * On the Connect hostname this returns `connect` without needing the param, so Connect-internal
 * onboarding URLs stay clean (e.g. `/onboarding/agents/setup` instead of
 * `/onboarding/agents/setup?appId=connect`).
 */
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

/**
 * Where to send the user after they create or select an organization. Connect-product users
 * skip the usecase picker and go straight into agent setup; Platform users keep the existing
 * usecase / inbox onboarding entry points (gated by the agents feature flag).
 */
export function getPostOrgCreateRoute(appId: AppId, isAgentsEnabled: boolean): string {
  if (appId === APP_IDS.CONNECT) {
    return ROUTES.AGENTS_SETUP;
  }

  return isAgentsEnabled ? ROUTES.USECASE_SELECT : ROUTES.INBOX_USECASE;
}

/**
 * Returns the post-onboarding destination. May be an absolute URL when the hostname split is
 * configured and the user is being sent to the *other* product (typical case: signed up on
 * the Platform host but chose the Agents onboarding path → land on the Connect host).
 *
 * Callers must detect absolute URLs (e.g. `apps.isAbsoluteUrl`) and use `window.location.assign`
 * instead of react-router's `navigate` so the cross-origin navigation actually happens.
 */
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
