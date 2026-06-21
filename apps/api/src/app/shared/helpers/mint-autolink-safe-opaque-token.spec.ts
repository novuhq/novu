import { expect } from 'chai';

import { mintAutolinkSafeOpaqueToken } from './mint-autolink-safe-opaque-token';

const ALPHANUMERIC_PATTERN = /^[A-Za-z0-9]{32}$/;
const GFM_TRAILING_PUNCTUATION = '. , : ; ! ? \' " ) ] } _ ~ *';

describe('mintAutolinkSafeOpaqueToken', () => {
  it('returns exactly 32 alphanumeric characters', () => {
    const token = mintAutolinkSafeOpaqueToken();

    expect(token).to.have.length(32);
    expect(token).to.match(ALPHANUMERIC_PATTERN);
  });

  it('never contains base64url-only characters', () => {
    for (let index = 0; index < 1000; index += 1) {
      expect(mintAutolinkSafeOpaqueToken()).to.not.match(/[-_]/);
    }
  });

  it('never ends with a GFM trailing-punctuation character', () => {
    for (let index = 0; index < 10_000; index += 1) {
      const lastChar = mintAutolinkSafeOpaqueToken().slice(-1);

      expect(GFM_TRAILING_PUNCTUATION.includes(lastChar)).to.equal(false);
    }
  });

  it('produces distinct tokens at high volume', () => {
    const tokens = new Set<string>();

    for (let index = 0; index < 10_000; index += 1) {
      tokens.add(mintAutolinkSafeOpaqueToken());
    }

    expect(tokens.size).to.equal(10_000);
  });
});
