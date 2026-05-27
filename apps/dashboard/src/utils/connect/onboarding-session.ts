import {
  CONNECT_STEP_COUNT,
  ONBOARDING_STEP_DELAY_MS,
  PLATFORM_STEP_COUNT,
  type OnboardingLoaderVariant,
} from '@/components/onboarding/onboarding-loader';
import { IS_HOSTNAME_SPLIT_ENABLED, IS_NOVU_CONNECT } from '@/config';

export const ONBOARDING_PROVISIONING_KEY = 'novu.onboarding.provisioning';
/** Legacy Connect-only flag — still read for in-flight sessions. */
export const CONNECT_PROVISIONING_KEY = 'novu.connect.provisioning';
export const CONNECT_PROVISION_QUERY = 'provision';

const PROVISIONING_CHANGE_EVENT = 'novu.onboarding.provisioning-change';

type ProvisioningPayload = {
  variant: OnboardingLoaderVariant;
  startedAt: number;
};

export function notifyOnboardingProvisioningChange(): void {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new Event(PROVISIONING_CHANGE_EVENT));
}

export function subscribeOnboardingProvisioningChange(listener: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  window.addEventListener(PROVISIONING_CHANGE_EVENT, listener);

  return () => window.removeEventListener(PROVISIONING_CHANGE_EVENT, listener);
}

/** @deprecated Use `subscribeOnboardingProvisioningChange`. */
export const subscribeConnectProvisioningChange = subscribeOnboardingProvisioningChange;

/** @deprecated Use `notifyOnboardingProvisioningChange`. */
export const notifyConnectProvisioningChange = notifyOnboardingProvisioningChange;

function readProvisioningPayload(): ProvisioningPayload | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = sessionStorage.getItem(ONBOARDING_PROVISIONING_KEY);

    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ProvisioningPayload>;

      if (parsed.variant === 'platform' || parsed.variant === 'connect') {
        return {
          variant: parsed.variant,
          startedAt: typeof parsed.startedAt === 'number' ? parsed.startedAt : Date.now(),
        };
      }
    }

    if (sessionStorage.getItem(CONNECT_PROVISIONING_KEY) === '1') {
      return { variant: 'connect', startedAt: Date.now() };
    }
  } catch {
    // sessionStorage unavailable or malformed payload
  }

  return null;
}

export function beginOnboardingProvisioning(variant: OnboardingLoaderVariant): void {
  if (typeof window === 'undefined') return;

  try {
    const payload: ProvisioningPayload = { variant, startedAt: Date.now() };
    sessionStorage.setItem(ONBOARDING_PROVISIONING_KEY, JSON.stringify(payload));
    sessionStorage.removeItem(CONNECT_PROVISIONING_KEY);
    notifyOnboardingProvisioningChange();
  } catch {
    // sessionStorage unavailable
  }
}

export function beginConnectProvisioning(): void {
  beginOnboardingProvisioning('connect');
}

export function beginPlatformProvisioning(): void {
  beginOnboardingProvisioning('platform');
}

function getExpectedVariantForCurrentHost(): OnboardingLoaderVariant {
  return IS_NOVU_CONNECT ? 'connect' : 'platform';
}

// sessionStorage survives a cross-product handoff (e.g. Platform → Connect via the app rail
// writes `variant: 'connect'` to Platform's sessionStorage right before `window.location.assign`)
// but the destination origin can't see — let alone clear — the source's storage. When the user
// later comes back to the source origin the flag is still there and replays the loader on top
// of the wrong app. Ignore a stored variant that doesn't match this host so it can't leak across
// origins. Single-host deploys accept either variant on the same origin.
function isStoredVariantValidForCurrentHost(variant: OnboardingLoaderVariant): boolean {
  if (!IS_HOSTNAME_SPLIT_ENABLED) return true;

  return variant === getExpectedVariantForCurrentHost();
}

export function getOnboardingProvisioningVariant(): OnboardingLoaderVariant | null {
  const variant = readProvisioningPayload()?.variant ?? null;

  if (!variant) return null;

  if (!isStoredVariantValidForCurrentHost(variant)) return null;

  return variant;
}

export function getOnboardingProvisioningStartedAt(): number | null {
  const payload = readProvisioningPayload();

  if (!payload) return null;
  if (!isStoredVariantValidForCurrentHost(payload.variant)) return null;

  return payload.startedAt;
}

export function isOnboardingProvisioningActive(): boolean {
  return getOnboardingProvisioningVariant() !== null;
}

export function isConnectProvisioningActive(): boolean {
  return getOnboardingProvisioningVariant() === 'connect';
}

/**
 * Lazily reap a `variant` written by a cross-product handoff the user came back from
 * (e.g. Platform → Connect via the app rail, then back to Platform). Without this the
 * flag would survive in source-origin sessionStorage for the tab lifetime and trip
 * `isOnboardingProvisioningActive` consumers elsewhere.
 */
export function purgeStaleOnboardingProvisioning(): void {
  if (!IS_HOSTNAME_SPLIT_ENABLED) return;

  const variant = readProvisioningPayload()?.variant;

  if (!variant) return;
  if (isStoredVariantValidForCurrentHost(variant)) return;

  clearOnboardingProvisioning();
}

export function clearOnboardingProvisioning(): void {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.removeItem(ONBOARDING_PROVISIONING_KEY);
    sessionStorage.removeItem(CONNECT_PROVISIONING_KEY);
    notifyOnboardingProvisioningChange();
  } catch {
    // sessionStorage unavailable
  }
}

export function clearConnectProvisioning(): void {
  clearOnboardingProvisioning();
}

export function getMinLoaderDurationMs(variant: OnboardingLoaderVariant): number {
  const stepCount = variant === 'connect' ? CONNECT_STEP_COUNT : PLATFORM_STEP_COUNT;

  return stepCount * ONBOARDING_STEP_DELAY_MS;
}

export function buildConnectProvisionOrgListPath(orgListPath: string): string {
  const url = new URL(orgListPath, 'http://local');
  url.searchParams.set(CONNECT_PROVISION_QUERY, '1');

  return `${url.pathname}${url.search}`;
}

export function withConnectProvisioningIntent(href: string): string {
  if (!href) return href;

  try {
    const isAbsolute = /^https?:\/\//i.test(href);
    const fallbackBase = typeof window !== 'undefined' ? window.location.origin : 'http://local';
    const url = new URL(href, fallbackBase);
    url.searchParams.set(CONNECT_PROVISION_QUERY, '1');

    if (isAbsolute) {
      return url.toString();
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return href;
  }
}

export function consumeConnectProvisionIntentFromLocation(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const params = new URLSearchParams(window.location.search);

  if (params.get(CONNECT_PROVISION_QUERY) !== '1') {
    return false;
  }

  beginConnectProvisioning();
  params.delete(CONNECT_PROVISION_QUERY);
  const nextSearch = params.toString();
  const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
  window.history.replaceState(window.history.state, '', nextUrl);

  return true;
}

export function hasConnectProvisionIntent(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  if (isConnectProvisioningActive()) {
    return true;
  }

  try {
    const params = new URLSearchParams(window.location.search);

    return params.get(CONNECT_PROVISION_QUERY) === '1';
  } catch {
    return false;
  }
}
