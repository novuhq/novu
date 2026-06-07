/** Matches `randomBytes(24).toString('base64url')` — 32 URL-safe characters. */
export const CONNECT_CLAIM_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;
