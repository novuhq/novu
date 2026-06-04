import { ROUTES } from '@/utils/routes';

const STORAGE_KEY = 'pendingConnectClaim';

// Connect claim tokens are `randomBytes(24).toString('base64url')` → 32 url-safe chars.
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

function isValidToken(token: string | null | undefined): token is string {
  return Boolean(token) && TOKEN_PATTERN.test(token as string);
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

/**
 * Captures the claim token while still on `/connect/claim`, before the auth flow
 * redirects through the org picker (which would otherwise drop the token and the
 * user would land in regular onboarding). Mirrors `storePendingCliAuthFromPath`.
 */
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
