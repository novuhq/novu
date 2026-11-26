/**
 * Refresh a little before the real expiry, so a token that is about to expire is not sent
 * and small clock differences between the browser and the server do not matter.
 */
const EXPIRY_SKEW_MS = 60_000;

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

  return atob(padded);
}

/**
 * Returns the `exp` claim of a JWT in milliseconds, or `undefined` when the token has none or cannot be read.
 * The signature is not checked: the value only decides when to ask the server for a new token.
 */
export function getJwtExpiresAt(token: string | undefined): number | undefined {
  const payload = token?.split('.')[1];
  if (!payload) {
    return undefined;
  }

  try {
    const { exp } = JSON.parse(decodeBase64Url(payload));

    return typeof exp === 'number' ? exp * 1000 : undefined;
  } catch {
    return undefined;
  }
}

/**
 * True when the token has expired or expires within the skew window.
 * A token without a readable `exp` is treated as not expired, so it never triggers a refresh on its own.
 */
export function isJwtExpired(token: string | undefined, now = Date.now()): boolean {
  const expiresAt = getJwtExpiresAt(token);

  return expiresAt !== undefined && now >= expiresAt - EXPIRY_SKEW_MS;
}
