import {
  getHostnameWithoutPort,
  IS_HOSTNAME_SPLIT_ENABLED,
  normalizeAppHost,
  NOVU_CONNECT_HOSTNAME,
  NOVU_PLATFORM_HOSTNAME,
} from '@/config';
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

function buildAppOrigin(hostname: string): string {
  if (!hostname || typeof window === 'undefined') {
    return '';
  }

  return `${window.location.protocol}//${normalizeAppHost(hostname)}`;
}

/** Primary ClerkProvider allowlist — satellite origins must be listed for redirectWithAuth. */
export function buildClerkAllowedRedirectOrigins(): Array<string | RegExp> {
  const origins: Array<string | RegExp> = ['http://localhost:*'];

  if (typeof window === 'undefined') {
    return origins;
  }

  origins.push(window.location.origin);

  if (!IS_HOSTNAME_SPLIT_ENABLED) {
    return origins;
  }

  if (NOVU_CONNECT_HOSTNAME) {
    origins.push(buildAppOrigin(NOVU_CONNECT_HOSTNAME));
    origins.push(`https://${getHostnameWithoutPort(NOVU_CONNECT_HOSTNAME)}`);
  }

  if (NOVU_PLATFORM_HOSTNAME) {
    origins.push(buildAppOrigin(NOVU_PLATFORM_HOSTNAME));
    origins.push(`https://${getHostnameWithoutPort(NOVU_PLATFORM_HOSTNAME)}`);
  }

  return [...new Set(origins)];
}

export function isConnectHostnameUrl(url: string): boolean {
  if (!IS_HOSTNAME_SPLIT_ENABLED || !NOVU_CONNECT_HOSTNAME || typeof window === 'undefined') {
    return false;
  }

  try {
    return normalizeAppHost(new URL(url, window.location.origin).host) === normalizeAppHost(NOVU_CONNECT_HOSTNAME);
  } catch {
    return false;
  }
}

/** Clerk may put auth params in the query string or inside hash routing (#/?param=). */
export function readClerkAuthParamFromLocation(param: string, searchParams?: URLSearchParams): string | null {
  const fromPassedSearch = searchParams?.get(param);

  if (fromPassedSearch) {
    return fromPassedSearch;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  const fromWindowSearch = new URLSearchParams(window.location.search).get(param);

  if (fromWindowSearch) {
    return fromWindowSearch;
  }

  const hash = window.location.hash;

  if (!hash || hash.length <= 1) {
    return null;
  }

  const hashBody = hash.startsWith('#') ? hash.slice(1) : hash;
  const queryIndex = hashBody.indexOf('?');

  if (queryIndex === -1) {
    return null;
  }

  return new URLSearchParams(hashBody.slice(queryIndex + 1)).get(param);
}

/** Clerk may put redirect_url in the query string or inside hash routing (#/?redirect_url=). */
export function readClerkRedirectUrlParam(searchParams?: URLSearchParams): string | null {
  return readClerkAuthParamFromLocation('redirect_url', searchParams);
}

/** Strip handshake params that can accumulate across redirect loops. */
function sanitizeConnectSatelliteReturnUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete('__clerk_netlify_cache_bust');
    parsed.searchParams.delete('__clerk_synced');
    parsed.searchParams.delete('__clerk_sync');
    parsed.searchParams.delete('__clerk_handshake');

    return parsed.toString();
  } catch {
    return url;
  }
}

/** Clerk's satellite handshake return URL — must be honored so Connect receives the synced session. */
export function readConnectSatelliteReturnUrl(searchParams?: URLSearchParams): string | null {
  const redirectUrl = readClerkRedirectUrlParam(searchParams);

  if (!redirectUrl || !isConnectHostnameUrl(redirectUrl)) {
    return null;
  }

  return sanitizeConnectSatelliteReturnUrl(redirectUrl);
}

function isConnectPrimaryAuthPath(url: string): boolean {
  try {
    const pathname = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://local').pathname;

    return pathname === ROUTES.SIGN_IN || pathname === ROUTES.SIGN_UP;
  } catch {
    return false;
  }
}

/** Return URL to send back to Connect after primary auth — skip sign-in/sign-up pages that re-bounce. */
export function resolveConnectSatelliteReturnUrl(searchParams: URLSearchParams): string | null {
  const fromQuery = readConnectSatelliteReturnUrl(searchParams);

  if (fromQuery && !isConnectPrimaryAuthPath(fromQuery)) {
    return fromQuery;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  const currentLocation = window.location.href;

  if (isConnectHostnameUrl(currentLocation) && !isConnectPrimaryAuthPath(currentLocation)) {
    return sanitizeConnectSatelliteReturnUrl(currentLocation);
  }

  return null;
}
