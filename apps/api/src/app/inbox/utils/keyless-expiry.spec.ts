import { expect } from 'chai';

import { KEYLESS_ENVIRONMENT_PREFIX } from './keyless.constants';
import { isKeylessEnvironmentExpired } from './keyless-expiry';

describe('isKeylessEnvironmentExpired', () => {
  it('returns true for missing identifiers', () => {
    expect(isKeylessEnvironmentExpired(undefined)).to.be.true;
    expect(isKeylessEnvironmentExpired('')).to.be.true;
  });

  it('returns false for a freshly minted keyless identifier', () => {
    const timestampHex = Buffer.alloc(4);
    timestampHex.writeUInt32BE(Math.floor(Date.now() / 1000), 0);
    const identifier = `${KEYLESS_ENVIRONMENT_PREFIX}${timestampHex.toString('hex')}_abcd`;

    expect(isKeylessEnvironmentExpired(identifier)).to.be.false;
  });
});
