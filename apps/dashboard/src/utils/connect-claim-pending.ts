import { CONNECT_CLAIM_TOKEN_PATTERN } from '@novu/shared';
import { IS_HOSTNAME_SPLIT_ENABLED, NOVU_CONNECT_HOSTNAME, NOVU_PLATFORM_HOSTNAME, normalizeAppHost } from '@/config';
import { ROUTES } from '@/utils/routes';

const STORAGE_KEY = 'pendingConnectClaim';

function isValidToken(token: string | null | undefined): token is string {
  return typeof token === 'string' && CONNECT_CLAIM_TOKEN_PATTERN.test(token);
}

function isAbsoluteUrl(url: string): boolean {
  return /^(https?:)?\/\//i.test(url);
}

function getTrustedRedirectOrigins(): Set<string> {
  const origins = new Set<string>();

  if (typeof window === 'undefined') {
    return origins;
  }

  origins.add(window.location.origin);

  if (IS_HOSTNAME_SPLIT_ENABLED) {
    for (const hostname of [NOVU_CONNECT_HOSTNAME, NOVU_PLATFORM_HOSTNAME]) {
      if (hostname) {
        origins.add(`${window.location.protocol}//${normalizeAppHost(hostname)}`);
      }
    }
  }

  return origins;
}

export function isConnectClaimPath(pathname: string): boolean {
  return pathname === ROUTES.CONNECT_CLAIM;
}

export function parseConnectClaimToken(search: string): string | null {
  const token = new URLSearchParams(search).get('token');

  return isValidToken(token) ? token : null;
}

export function storePendingConnectClaim(token: string): void {
  if (typeof window === 'undefined' || !isValidToken(token)) {
    return;
  }

  sessionStorage.setItem(STORAGE_KEY, token);
}

export function isConnectClaimReturnUrl(url: string): boolean {
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://local';
    const parsed = new URL(url, base);

    if (!isConnectClaimPath(parsed.pathname)) {
      return false;
    }

    if (isAbsoluteUrl(url) && typeof window !== 'undefined') {
      const trustedOrigins = getTrustedRedirectOrigins();

      if (!trustedOrigins.has(parsed.origin)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

export function storePendingConnectClaimFromPath(pathname: string, search = ''): boolean {
  if (!isConnectClaimPath(pathname)) {
    return false;
  }

  const token = parseConnectClaimToken(search);
  if (!token) {
    return false;
  }

  storePendingConnectClaim(token);

  return true;
}

export function storePendingConnectClaimFromRedirectUrl(redirectUrl: string | null | undefined): boolean {
  if (!redirectUrl || !isConnectClaimReturnUrl(redirectUrl)) {
    return false;
  }

  try {
    const parsed = new URL(redirectUrl, typeof window !== 'undefined' ? window.location.origin : 'http://local');
    const token = parseConnectClaimToken(parsed.search);

    if (!token) {
      return false;
    }

    storePendingConnectClaim(token);

    return true;
  } catch {
    return false;
  }
}

export function readPendingConnectClaim(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const token = sessionStorage.getItem(STORAGE_KEY);

  return isValidToken(token) ? token : null;
}

export function clearPendingConnectClaim(): void {
  if (typeof window === 'undefined') {
    return;
  }

  sessionStorage.removeItem(STORAGE_KEY);
}

export function resolvePendingConnectClaimReturnUrl(): string | null {
  const token = readPendingConnectClaim();
  if (!token) {
    return null;
  }

  return `${ROUTES.CONNECT_CLAIM}?token=${encodeURIComponent(token)}`;
}
