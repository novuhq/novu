/** New mint format — alphanumeric only, safe for GFM bare-URL autolinking. */
export const CONNECT_CLAIM_TOKEN_PATTERN = /^[A-Za-z0-9]{32}$/;

/** Legacy base64url tokens issued before the autolink-safe alphabet rollout. */
export const CONNECT_CLAIM_TOKEN_LEGACY_PATTERN = /^[A-Za-z0-9_-]{32}$/;

export function isConnectClaimTokenFormat(token: string): boolean {
  return CONNECT_CLAIM_TOKEN_PATTERN.test(token) || CONNECT_CLAIM_TOKEN_LEGACY_PATTERN.test(token);
}
