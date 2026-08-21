import {
  AGENTS_STEP_COUNT,
  ONBOARDING_STEP_DELAY_MS,
  type OnboardingLoaderVariant,
  PLATFORM_STEP_COUNT,
} from '@/components/onboarding/onboarding-loader';

const ONBOARDING_PROVISIONING_KEY = 'novu.onboarding.provisioning';
/** Legacy Connect-only flag — still read for in-flight sessions. */
const CONNECT_PROVISIONING_KEY = 'novu.connect.provisioning';

const PROVISIONING_CHANGE_EVENT = 'novu.onboarding.provisioning-change';

type ProvisioningPayload = {
  variant: OnboardingLoaderVariant;
  startedAt: number;
};

function notifyOnboardingProvisioningChange(): void {
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

// `connect` is the legacy name for the agents-flavored loader; map it forward to `agents`.
function normalizeVariant(variant: string | undefined): OnboardingLoaderVariant | null {
  if (variant === 'platform') {
    return 'platform';
  }

  if (variant === 'agents' || variant === 'connect') {
    return 'agents';
  }

  return null;
}

function readProvisioningPayload(): ProvisioningPayload | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = sessionStorage.getItem(ONBOARDING_PROVISIONING_KEY);

    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ProvisioningPayload> & { variant?: string };
      const variant = normalizeVariant(parsed.variant);

      if (variant) {
        return {
          variant,
          startedAt: typeof parsed.startedAt === 'number' ? parsed.startedAt : Date.now(),
        };
      }
    }

    if (sessionStorage.getItem(CONNECT_PROVISIONING_KEY) === '1') {
      return { variant: 'agents', startedAt: Date.now() };
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

export function getOnboardingProvisioningVariant(): OnboardingLoaderVariant | null {
  return readProvisioningPayload()?.variant ?? null;
}

export function getOnboardingProvisioningStartedAt(): number | null {
  return readProvisioningPayload()?.startedAt ?? null;
}

export function isOnboardingProvisioningActive(): boolean {
  return getOnboardingProvisioningVariant() !== null;
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
  const stepCount = variant === 'agents' ? AGENTS_STEP_COUNT : PLATFORM_STEP_COUNT;

  return stepCount * ONBOARDING_STEP_DELAY_MS;
}
