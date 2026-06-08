import { CONNECT_CLAIM_TOKEN_PATTERN } from '@novu/shared';
import { ROUTES } from '@/utils/routes';

const STORAGE_KEY = 'pendingConnectClaim';

function isValidToken(token: string | null | undefined): token is string {
  return typeof token === 'string' && CONNECT_CLAIM_TOKEN_PATTERN.test(token);
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
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://local');

    return isConnectClaimPath(parsed.pathname);
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

// Reads the token from the current URL and persists it. Safe to call at module load on every
// document load — only writes when the param is present.
export function captureConnectClaimTokenFromUrl(): void {
  try {
    storePendingConnectClaimFromPath(window.location.pathname, window.location.search);
  } catch {
    // ignore — no window available
  }
}

export function buildConnectClaimReturnUrlFromSearchParams(searchParams?: URLSearchParams): string | null {
  const redirectUrl = searchParams?.get('redirect_url');

  if (!redirectUrl || !isConnectClaimReturnUrl(redirectUrl)) {
    return null;
  }

  try {
    const parsed = new URL(redirectUrl, typeof window !== 'undefined' ? window.location.origin : 'http://local');
    const token = parseConnectClaimToken(parsed.search);

    if (!token) {
      return null;
    }

    return `${ROUTES.CONNECT_CLAIM}?token=${encodeURIComponent(token)}`;
  } catch {
    return null;
  }
}
