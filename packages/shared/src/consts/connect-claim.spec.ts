import { describe, expect, it } from 'vitest';

import {
  CONNECT_CLAIM_TOKEN_LEGACY_PATTERN,
  CONNECT_CLAIM_TOKEN_PATTERN,
  isConnectClaimTokenFormat,
} from './connect-claim';

describe('connect-claim token format', () => {
  it('accepts new alphanumeric-only tokens', () => {
    const token = '0123456789ABCDEFGHIJKLMNOPQRSTUV';

    expect(CONNECT_CLAIM_TOKEN_PATTERN.test(token)).toBe(true);
    expect(isConnectClaimTokenFormat(token)).toBe(true);
  });

  it('accepts legacy base64url tokens during rollout', () => {
    const token = '0123456789ABCDEFGHIJKLMNOPQRSTU_';

    expect(CONNECT_CLAIM_TOKEN_PATTERN.test(token)).toBe(false);
    expect(CONNECT_CLAIM_TOKEN_LEGACY_PATTERN.test(token)).toBe(true);
    expect(isConnectClaimTokenFormat(token)).toBe(true);
  });

  it('rejects invalid lengths and characters', () => {
    expect(isConnectClaimTokenFormat('too-short')).toBe(false);
    expect(isConnectClaimTokenFormat('a'.repeat(32) + '!')).toBe(false);
  });
});
