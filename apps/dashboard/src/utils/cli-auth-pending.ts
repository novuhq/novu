import { IS_NOVU_CONNECT } from '@/config';
import {
  buildAbsoluteConnectUrl,
  buildAbsolutePlatformUrl,
  isConnectHostnameUrl,
  readClerkRedirectUrlParam,
} from '@/utils/product-auth-urls';
import { ROUTES } from '@/utils/routes';

const STORAGE_KEY = 'pendingCliAuth';

const DEVICE_CODE_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

export type PendingCliAuth = {
  deviceCode: string;
  name: string | null;
  returnHost: 'connect' | 'platform';
};

function detectReturnHost(): PendingCliAuth['returnHost'] {
  return IS_NOVU_CONNECT ? 'connect' : 'platform';
}

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

export function parseCliAuthFromUrl(url: string): Pick<PendingCliAuth, 'deviceCode' | 'name'> | null {
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://local');

    if (!isCliAuthPath(parsed.pathname)) {
      return null;
    }

    const deviceCode = parsed.searchParams.get('device_code');

    if (!isValidDeviceCode(deviceCode)) {
      return null;
    }

    return {
      deviceCode,
      name: parsed.searchParams.get('name'),
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

  storePendingCliAuth(parsed.deviceCode, parsed.name);

  return true;
}

export function storePendingCliAuth(
  deviceCode: string,
  name: string | null,
  returnHost: PendingCliAuth['returnHost'] = detectReturnHost()
): void {
  if (typeof window === 'undefined' || !isValidDeviceCode(deviceCode)) {
    return;
  }

  const pending: PendingCliAuth = {
    deviceCode,
    name,
    returnHost,
  };

  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
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
      returnHost: parsed.returnHost === 'connect' ? 'connect' : 'platform',
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

  const path = `${ROUTES.CLI_AUTH}?${params.toString()}`;

  if (pending.returnHost === 'connect') {
    return buildAbsoluteConnectUrl(path);
  }

  return buildAbsolutePlatformUrl(path);
}

export function resolvePendingCliAuthReturnUrl(): string | null {
  const pending = readPendingCliAuth();

  if (!pending) {
    return null;
  }

  return buildCliAuthUrl(pending);
}

type ReadCliAuthReturnUrlOptions = {
  preferConnectHost?: boolean;
};

export function parseCliAuthReturnFromSearchParams(
  searchParams?: URLSearchParams,
  options?: ReadCliAuthReturnUrlOptions
): PendingCliAuth | null {
  const redirectUrl = readClerkRedirectUrlParam(searchParams);

  if (!redirectUrl || !isCliAuthReturnUrl(redirectUrl)) {
    return null;
  }

  const parsed = parseCliAuthFromUrl(redirectUrl);

  if (!parsed) {
    return null;
  }

  const returnHost =
    options?.preferConnectHost || isConnectHostnameUrl(redirectUrl) ? 'connect' : detectReturnHost();

  return {
    deviceCode: parsed.deviceCode,
    name: parsed.name,
    returnHost,
  };
}

export function buildCliAuthReturnUrlFromSearchParams(
  searchParams?: URLSearchParams,
  options?: ReadCliAuthReturnUrlOptions
): string | null {
  const pending = parseCliAuthReturnFromSearchParams(searchParams, options);

  if (!pending) {
    return null;
  }

  return buildCliAuthUrl(pending);
}

export function readCliAuthReturnUrl(
  searchParams?: URLSearchParams,
  options?: ReadCliAuthReturnUrlOptions
): string | null {
  const pending = parseCliAuthReturnFromSearchParams(searchParams, options);

  if (!pending) {
    return null;
  }

  storePendingCliAuth(pending.deviceCode, pending.name, pending.returnHost);

  return buildCliAuthUrl(pending);
}

export function appendRedirectUrlParam(url: string, redirectUrl: string): string {
  const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://local');
  parsed.searchParams.set('redirect_url', redirectUrl);

  return parsed.toString();
}
