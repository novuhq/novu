import { CONNECT_CLAIM_TOKEN_PATTERN } from '@novu/shared';
import { ROUTES } from '@/utils/routes';

const STORAGE_KEY = 'pendingConnectClaim';

function isValidToken(token: string | null | undefined): token is string {
  return Boolean(token) && CONNECT_CLAIM_TOKEN_PATTERN.test(token as string);
}

export function isConnectClaimPath(pathname: string): boolean {
  return pathname === ROUTES.CONNECT_CLAIM;
}

export function parseConnectClaimToken(search: string): string | null {
  try {
    const token = new URLSearchParams(search).get('token');

    return isValidToken(token) ? token : null;
  } catch {
    return null;
  }
}

export function storePendingConnectClaim(token: string): void {
  if (typeof window === 'undefined' || !isValidToken(token)) {
    return;
  }

  sessionStorage.setItem(STORAGE_KEY, token);
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
