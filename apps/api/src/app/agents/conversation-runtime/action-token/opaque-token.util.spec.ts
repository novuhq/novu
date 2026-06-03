import { expect } from 'chai';
import {
  buildOpaqueStorageKey,
  isMintedOpaqueActionId,
  mintRandomToken,
  parseTtlFromEnv,
} from './opaque-token.util';

describe('opaque-token.util', () => {
  it('parseTtlFromEnv falls back to default for invalid values', () => {
    expect(parseTtlFromEnv(undefined, 100)).to.equal(100);
    expect(parseTtlFromEnv('nope', 100)).to.equal(100);
    expect(parseTtlFromEnv('120', 100)).to.equal(120);
  });

  it('mintRandomToken returns url-safe strings', () => {
    const token = mintRandomToken(16);

    expect(token.length).to.be.greaterThan(10);
    expect(token).to.match(/^[A-Za-z0-9_-]+$/);
  });

  it('buildOpaqueStorageKey prefixes the token', () => {
    expect(buildOpaqueStorageKey('agent:action:', 'abc')).to.equal('agent:action:abc');
  });

  it('isMintedOpaqueActionId matches only full minted token shape', () => {
    const prefix = 'at:';
    const minted = `${prefix}${mintRandomToken(16)}`;

    expect(isMintedOpaqueActionId(minted, prefix, 16)).to.equal(true);
    expect(isMintedOpaqueActionId('at:approve', prefix, 16)).to.equal(false);
    expect(isMintedOpaqueActionId('at:', prefix, 16)).to.equal(false);
  });
});
