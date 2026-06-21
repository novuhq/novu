import { describe, expect, it } from 'vitest';

import { mintAutolinkSafeOpaqueToken } from './mint-autolink-safe-opaque-token';

const ALPHANUMERIC_PATTERN = /^[A-Za-z0-9]{32}$/;
const GFM_TRAILING_PUNCTUATION = '. , : ; ! ? \' " ) ] } _ ~ *';

describe('mintAutolinkSafeOpaqueToken', () => {
  it('returns exactly 32 alphanumeric characters', () => {
    const token = mintAutolinkSafeOpaqueToken();

    expect(token).toHaveLength(32);
    expect(token).toMatch(ALPHANUMERIC_PATTERN);
  });

  it('never contains base64url characters', () => {
    for (let index = 0; index < 1000; index += 1) {
      const token = mintAutolinkSafeOpaqueToken();

      expect(token).not.toMatch(/[-_]/);
    }
  });

  it('never ends with GFM trailing-punctuation characters', () => {
    for (let index = 0; index < 10_000; index += 1) {
      const token = mintAutolinkSafeOpaqueToken();
      const lastChar = token.at(-1);

      expect(lastChar).toBeDefined();
      expect(GFM_TRAILING_PUNCTUATION.includes(lastChar as string)).toBe(false);
    }
  });

  it('produces distinct tokens at high volume', () => {
    const tokens = new Set<string>();

    for (let index = 0; index < 10_000; index += 1) {
      tokens.add(mintAutolinkSafeOpaqueToken());
    }

    expect(tokens.size).toBe(10_000);
  });
});
