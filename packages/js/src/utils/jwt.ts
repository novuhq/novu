/**
 * Refresh a little before the real expiry, so a token that is about to expire is not sent
 * and small clock differences between the browser and the server do not matter.
 */
export const EXPIRY_SKEW_MS = 60_000;

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

  const binary = atob(padded);

  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

export function decodeJwtPayload(token: string | undefined): Record<string, unknown> | undefined {
  const payload = token?.split('.')[1];
  if (!payload) {
    return undefined;
  }

  try {
    return JSON.parse(decodeBase64Url(payload));
  } catch {
    return undefined;
  }
}

/**
 * Returns the `exp` claim of a JWT in milliseconds, or `undefined` when the token has none or cannot be read.
 * The signature is not checked: the value only decides when to ask the server for a new token.
 */
export function getJwtExpiresAt(token: string | undefined): number | undefined {
  const exp = decodeJwtPayload(token)?.exp;

  return typeof exp === 'number' ? exp * 1000 : undefined;
}

/**
 * True when the token has expired or expires within the skew window.
 * A token without a readable `exp` is treated as not expired, so it never triggers a refresh on its own.
 */
export function isJwtExpired(token: string | undefined, now = Date.now()): boolean {
  const expiresAt = getJwtExpiresAt(token);

  return expiresAt !== undefined && now >= expiresAt - EXPIRY_SKEW_MS;
}
