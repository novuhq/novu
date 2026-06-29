import { ONBOARDING_SESSION_ID_PARAM } from '@/utils/onboarding-session-id';
import { readClerkRedirectUrlParam } from '@/utils/product-auth-urls';
import { ROUTES } from '@/utils/routes';

const STORAGE_KEY = 'pendingCliAuth';

const DEVICE_CODE_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

export type PendingCliAuth = {
  deviceCode: string;
  name: string | null;
  onboardingSessionId?: string | null;
};

function isValidDeviceCode(deviceCode: string | null | undefined): deviceCode is string {
  if (!deviceCode) {
    return false;
  }

  return DEVICE_CODE_PATTERN.test(deviceCode);
}

export function isCliAuthPath(pathname: string): boolean {
  return pathname === ROUTES.CLI_AUTH;
}

export function isCliAuthReturnUrl(url: string): boolean {
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://local');

    return isCliAuthPath(parsed.pathname);
  } catch {
    return false;
  }
}

export function parseCliAuthFromUrl(url: string): PendingCliAuth | null {
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://local');

    if (!isCliAuthPath(parsed.pathname)) {
      return null;
    }

    const deviceCode = parsed.searchParams.get('device_code');

    if (!isValidDeviceCode(deviceCode)) {
      return null;
    }

    const onboardingSessionId = parsed.searchParams.get(ONBOARDING_SESSION_ID_PARAM)?.trim();

    return {
      deviceCode,
      name: parsed.searchParams.get('name'),
      onboardingSessionId: onboardingSessionId || null,
    };
  } catch {
    return null;
  }
}

export function storePendingCliAuthFromPath(pathname: string, search = ''): boolean {
  if (!isCliAuthPath(pathname)) {
    return false;
  }

  const parsed = parseCliAuthFromUrl(`${pathname}${search}`);

  if (!parsed) {
    return false;
  }

  storePendingCliAuth(parsed);

  return true;
}

export function storePendingCliAuth(pending: PendingCliAuth | string, name?: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  const resolved: PendingCliAuth =
    typeof pending === 'string'
      ? {
          deviceCode: pending,
          name: name ?? null,
        }
      : pending;

  if (!isValidDeviceCode(resolved.deviceCode)) {
    return;
  }

  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(resolved));
}

export function readPendingCliAuth(): PendingCliAuth | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<PendingCliAuth>;

    if (!isValidDeviceCode(parsed.deviceCode)) {
      return null;
    }

    return {
      deviceCode: parsed.deviceCode,
      name: typeof parsed.name === 'string' ? parsed.name : null,
      onboardingSessionId: typeof parsed.onboardingSessionId === 'string' ? parsed.onboardingSessionId : null,
    };
  } catch {
    return null;
  }
}

export function clearPendingCliAuth(): void {
  if (typeof window === 'undefined') {
    return;
  }

  sessionStorage.removeItem(STORAGE_KEY);
}

export function buildCliAuthUrl(pending: PendingCliAuth): string {
  const params = new URLSearchParams();
  params.set('device_code', pending.deviceCode);

  if (pending.name) {
    params.set('name', pending.name);
  }

  if (pending.onboardingSessionId) {
    params.set(ONBOARDING_SESSION_ID_PARAM, pending.onboardingSessionId);
  }

  return `${ROUTES.CLI_AUTH}?${params.toString()}`;
}

export function resolvePendingCliAuthReturnUrl(): string | null {
  const pending = readPendingCliAuth();

  if (!pending) {
    return null;
  }

  return buildCliAuthUrl(pending);
}

export function parseCliAuthReturnFromSearchParams(searchParams?: URLSearchParams): PendingCliAuth | null {
  const redirectUrl = readClerkRedirectUrlParam(searchParams);

  if (!redirectUrl || !isCliAuthReturnUrl(redirectUrl)) {
    return null;
  }

  return parseCliAuthFromUrl(redirectUrl);
}

export function buildCliAuthReturnUrlFromSearchParams(searchParams?: URLSearchParams): string | null {
  const pending = parseCliAuthReturnFromSearchParams(searchParams);

  if (!pending) {
    return null;
  }

  return buildCliAuthUrl(pending);
}

export function readCliAuthReturnUrl(searchParams?: URLSearchParams): string | null {
  const pending = parseCliAuthReturnFromSearchParams(searchParams);

  if (!pending) {
    return null;
  }

  storePendingCliAuth(pending);

  return buildCliAuthUrl(pending);
}

export function appendRedirectUrlParam(url: string, redirectUrl: string): string {
  const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://local');
  parsed.searchParams.set('redirect_url', redirectUrl);

  return parsed.toString();
}

export function hasPendingCliAuth(): boolean {
  return readPendingCliAuth() !== null;
}
