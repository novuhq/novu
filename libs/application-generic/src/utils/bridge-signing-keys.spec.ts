import {
  bridgeSigningScope,
  clearAcceptedSigningKeys,
  isBridgeSignatureMismatch,
  nextSigningKeyOrder,
  orderSigningKeys,
  rememberAcceptedSigningKey,
} from './bridge-signing-keys';

describe('bridge signing keys', () => {
  const scope = bridgeSigningScope('env_1', 'https://bridge.example.com/api/novu');

  beforeEach(() => {
    clearAcceptedSigningKeys();
  });

  it('keeps the stored order when nothing is remembered', () => {
    expect(orderSigningKeys(scope, ['original', 'rotated'])).toEqual(['original', 'rotated']);
  });

  it('puts the remembered key first', () => {
    rememberAcceptedSigningKey(scope, 'rotated');

    expect(orderSigningKeys(scope, ['original', 'rotated'])).toEqual(['rotated', 'original']);
  });

  it('ignores a remembered key that is no longer active', () => {
    rememberAcceptedSigningKey(scope, 'deleted');

    expect(orderSigningKeys(scope, ['original', 'rotated'])).toEqual(['original', 'rotated']);
  });

  it('keeps the memory separate per bridge', () => {
    rememberAcceptedSigningKey(scope, 'rotated');

    const otherBridge = bridgeSigningScope('env_1', 'https://agent.example.com/api/novu');

    expect(orderSigningKeys(otherBridge, ['original', 'rotated'])).toEqual(['original', 'rotated']);
  });

  it('does not reorder a single key', () => {
    rememberAcceptedSigningKey(scope, 'other');

    expect(orderSigningKeys(scope, ['only'])).toEqual(['only']);
  });

  it('moves the first key to the end for the next attempt', () => {
    expect(nextSigningKeyOrder(['a', 'b'])).toEqual(['b', 'a']);
    expect(nextSigningKeyOrder(['a', 'b', 'c'])).toEqual(['b', 'c', 'a']);
    expect(nextSigningKeyOrder(['a'])).toEqual(['a']);
  });

  it('recognises only a 401 SignatureMismatchError', () => {
    expect(isBridgeSignatureMismatch(401, { code: 'SignatureMismatchError' })).toBe(true);
    expect(isBridgeSignatureMismatch(401, { code: 'SignatureExpiredError' })).toBe(false);
    expect(isBridgeSignatureMismatch(401, undefined)).toBe(false);
    expect(isBridgeSignatureMismatch(401, 'SignatureMismatchError')).toBe(false);
    expect(isBridgeSignatureMismatch(400, { code: 'SignatureMismatchError' })).toBe(false);
  });
});
