import { isAbsoluteUrl } from './apps';
import type { ProductType } from './product-type-pending';
import { buildRoute, ROUTES } from './routes';

// Query-param signal stamped on the onboarding -> product-home navigation. A query param is used
// (instead of router state) because the onboarding -> dashboard hop can be a full document load, and
// router state does not survive that. The destination reads it once and strips it, so it behaves as
// a one-shot "where you came from" marker; a later refresh has no param and doesn't re-trigger
// onboarding.
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

// `product_type=agents` skips the usecase picker and lands directly on the agents setup page. The
// EU/feature-flag gating on the agents setup page still redirects to the inbox path when needed.
export function getPostOrgCreateRoute(productType?: ProductType | null): string {
  if (productType === 'agents') {
    return ROUTES.AGENTS_SETUP;
  }

  return ROUTES.USECASE_SELECT;
}

export function getPostOnboardingRoute(environmentSlug: string): string {
  return buildRoute(ROUTES.AGENTS, { environmentSlug });
}
