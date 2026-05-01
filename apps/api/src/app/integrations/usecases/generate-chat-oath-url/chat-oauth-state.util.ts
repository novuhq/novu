/**
 * OAuth state for chat integrations is encoded as base64url(`${json}.${signature}`),
 * where the JSON payload may itself contain dots (e.g. emails inside subscriberIds, or
 * versioned identifiers like `agent-quickstart.v2`). The signature is a hex HMAC, so it
 * never contains '.'. We must therefore always split on the LAST dot, never the first.
 */

export interface OAuthStateParts {
  payload: string;
  signature: string;
}

export function encodeOAuthState(jsonPayload: string, signature: string): string {
  return Buffer.from(`${jsonPayload}.${signature}`).toString('base64url');
}

export function decodeOAuthStateString(state: string): string {
  return Buffer.from(state, 'base64url').toString();
}

export function splitOAuthState(state: string): OAuthStateParts {
  const decoded = decodeOAuthStateString(state);
  const lastDotIndex = decoded.lastIndexOf('.');

  if (lastDotIndex === -1) {
    throw new Error('Invalid OAuth state: missing signature separator');
  }

  return {
    payload: decoded.slice(0, lastDotIndex),
    signature: decoded.slice(lastDotIndex + 1),
  };
}

/**
 * Parse only the JSON payload of an OAuth state without verifying the signature.
 * Use this when you need a hint from the payload (e.g. providerId, environmentId)
 * to look up the verification key. The caller MUST then verify the signature via
 * `GenerateSlackOauthUrl.validateAndDecodeState` / `GenerateMsTeamsOauthUrl.validateAndDecodeState`
 * before trusting any other field.
 */
export function peekOAuthStatePayload<T = unknown>(state: string): T {
  const decoded = decodeOAuthStateString(state);
  const lastDotIndex = decoded.lastIndexOf('.');
  const payload = lastDotIndex === -1 ? decoded : decoded.slice(0, lastDotIndex);

  return JSON.parse(payload) as T;
}
