import { IS_HOSTNAME_SPLIT_ENABLED, NOVU_CONNECT_HOSTNAME, NOVU_PLATFORM_HOSTNAME } from '@/config';
import { ROUTES } from '@/utils/routes';

// Set when a Connect visitor is sent to Platform sign-in so the primary renders Connect branding.
export const PRODUCT_QUERY_PARAM = 'product';
export const CONNECT_PRODUCT_VALUE = 'connect';

function buildAbsoluteUrl(host: string, path: string): string {
  if (typeof window === 'undefined' || !host) {
    return path;
  }

  return `${window.location.protocol}//${host}${path}`;
}

export function buildAbsoluteConnectUrl(path: string): string {
  if (!IS_HOSTNAME_SPLIT_ENABLED || !NOVU_CONNECT_HOSTNAME) {
    if (typeof window === 'undefined') {
      return path;
    }

    return new URL(path, window.location.origin).href;
  }

  return buildAbsoluteUrl(NOVU_CONNECT_HOSTNAME, path);
}

export function buildAbsolutePlatformUrl(path: string): string {
  if (!IS_HOSTNAME_SPLIT_ENABLED || !NOVU_PLATFORM_HOSTNAME) {
    if (typeof window === 'undefined') {
      return path;
    }

    return new URL(path, window.location.origin).href;
  }

  return buildAbsoluteUrl(NOVU_PLATFORM_HOSTNAME, path);
}

function appendProductParam(path: string, product?: typeof CONNECT_PRODUCT_VALUE): string {
  if (!product) {
    return path;
  }

  const separator = path.includes('?') ? '&' : '?';

  return `${path}${separator}${PRODUCT_QUERY_PARAM}=${product}`;
}

type PrimaryAuthUrlOptions = {
  product?: typeof CONNECT_PRODUCT_VALUE;
};

export function buildPrimarySignInUrl(options?: PrimaryAuthUrlOptions): string {
  return buildAbsolutePlatformUrl(appendProductParam(ROUTES.SIGN_IN, options?.product));
}

export function buildPrimarySignUpUrl(options?: PrimaryAuthUrlOptions): string {
  return buildAbsolutePlatformUrl(appendProductParam(ROUTES.SIGN_UP, options?.product));
}

export function isConnectHostnameUrl(url: string): boolean {
  if (!IS_HOSTNAME_SPLIT_ENABLED || !NOVU_CONNECT_HOSTNAME || typeof window === 'undefined') {
    return false;
  }

  try {
    return new URL(url, window.location.origin).host === NOVU_CONNECT_HOSTNAME;
  } catch {
    return false;
  }
}

/** Clerk's satellite handshake return URL — must be honored so Connect receives the synced session. */
export function readConnectSatelliteReturnUrl(searchParams: URLSearchParams): string | null {
  const redirectUrl = searchParams.get('redirect_url');

  if (!redirectUrl || !isConnectHostnameUrl(redirectUrl)) {
    return null;
  }

  return redirectUrl;
}

export function appendRedirectUrl(primaryAuthUrl: string, returnUrl: string): string {
  if (typeof window === 'undefined') {
    return primaryAuthUrl;
  }

  try {
    const url = new URL(primaryAuthUrl, window.location.origin);
    url.searchParams.set('redirect_url', returnUrl);

    return url.toString();
  } catch {
    return primaryAuthUrl;
  }
}

function isConnectAuthPath(url: string): boolean {
  try {
    const pathname = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://local').pathname;

    return pathname.startsWith('/auth/');
  } catch {
    return false;
  }
}

/** Return URL to send back to Connect after primary auth — skips auth pages that would re-bounce. */
export function resolveConnectSatelliteReturnUrl(searchParams: URLSearchParams): string | null {
  const fromQuery = readConnectSatelliteReturnUrl(searchParams);

  if (fromQuery && !isConnectAuthPath(fromQuery)) {
    return fromQuery;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  const currentLocation = window.location.href;

  if (isConnectHostnameUrl(currentLocation) && !isConnectAuthPath(currentLocation)) {
    return currentLocation;
  }

  return null;
}
