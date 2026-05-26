import {
  CONNECT_STEP_COUNT,
  ONBOARDING_STEP_DELAY_MS,
  PLATFORM_STEP_COUNT,
  type OnboardingLoaderVariant,
} from '@/components/onboarding/onboarding-loader';

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

export function getOnboardingProvisioningVariant(): OnboardingLoaderVariant | null {
  return readProvisioningPayload()?.variant ?? null;
}

export function getOnboardingProvisioningStartedAt(): number | null {
  return readProvisioningPayload()?.startedAt ?? null;
}

export function isOnboardingProvisioningActive(): boolean {
  return getOnboardingProvisioningVariant() !== null;
}

export function isConnectProvisioningActive(): boolean {
  return getOnboardingProvisioningVariant() === 'connect';
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
