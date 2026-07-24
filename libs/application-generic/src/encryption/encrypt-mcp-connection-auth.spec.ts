import {
  decryptMcpConnectionAuth,
  decryptMcpConnectionOAuthClient,
  encryptMcpConnectionAuth,
  encryptMcpConnectionOAuthClient,
} from './encrypt-mcp-connection-auth';

describe('encryptMcpConnectionAuth / decryptMcpConnectionAuth', () => {
  const novuSubMask = 'nvsk.';

  it('encrypts accessToken with the Novu encryption prefix', () => {
    const encrypted = encryptMcpConnectionAuth({ accessToken: 'mcp-test-token' });

    expect(encrypted).toBeDefined();
    expect(typeof encrypted!.accessToken).toBe('string');
    expect((encrypted!.accessToken as string).startsWith(novuSubMask)).toBe(true);
    expect(encrypted!.accessToken).not.toEqual('mcp-test-token');
  });

  it('round-trips through encrypt + decrypt', () => {
    const original = { accessToken: 'mcp-test-token' };
    const encrypted = encryptMcpConnectionAuth(original);
    const decrypted = decryptMcpConnectionAuth(encrypted);

    expect(decrypted!.accessToken).toEqual(original.accessToken);
  });

  it('encryption is idempotent for already-encrypted accessToken values', () => {
    const onePass = encryptMcpConnectionAuth({ accessToken: 'mcp-test-token' });
    const twoPass = encryptMcpConnectionAuth(onePass);

    expect(twoPass!.accessToken).toEqual(onePass!.accessToken);
  });

  it('decryption is idempotent for legacy unprefixed values', () => {
    const legacy = { accessToken: 'mcp-legacy-token' };
    const decrypted = decryptMcpConnectionAuth(legacy);

    expect(decrypted!.accessToken).toEqual(legacy.accessToken);
  });

  it('handles missing/undefined auth gracefully', () => {
    expect(encryptMcpConnectionAuth(undefined)).toBeUndefined();
    expect(decryptMcpConnectionAuth(undefined)).toBeUndefined();
  });

  it('encrypts both accessToken and refreshToken when both are present', () => {
    const encrypted = encryptMcpConnectionAuth({
      accessToken: 'a',
      refreshToken: 'r',
    });

    expect((encrypted!.accessToken as string).startsWith(novuSubMask)).toBe(true);
    expect((encrypted!.refreshToken as string).startsWith(novuSubMask)).toBe(true);

    const decrypted = decryptMcpConnectionAuth(encrypted);
    expect(decrypted!.accessToken).toEqual('a');
    expect(decrypted!.refreshToken).toEqual('r');
  });

  it('preserves non-secret fields (expiresAt, tokenType, scopes) untouched', () => {
    const expiresAt = new Date('2026-12-01T00:00:00Z');
    const encrypted = encryptMcpConnectionAuth({
      accessToken: 'a',
      expiresAt,
      tokenType: 'Bearer',
      scopes: ['read', 'write'],
    } as Record<string, unknown>);

    expect(encrypted!.expiresAt).toBe(expiresAt);
    expect(encrypted!.tokenType).toEqual('Bearer');
    expect(encrypted!.scopes).toEqual(['read', 'write']);
    expect((encrypted!.accessToken as string).startsWith(novuSubMask)).toBe(true);
  });

  it('skips empty-string secret values', () => {
    const encrypted = encryptMcpConnectionAuth({ accessToken: '', refreshToken: '' });
    expect(encrypted!.accessToken).toEqual('');
    expect(encrypted!.refreshToken).toEqual('');
  });

  it('does NOT encrypt fields outside the SECURE_AUTH_FIELDS allowlist', () => {
    // Forward-compat hardening: any new secret field must be added to
    // SECURE_AUTH_FIELDS explicitly. Unknown keys must remain plaintext so
    // the failure mode is "visibly unencrypted" rather than "silently
    // double-encrypted-on-read".
    const encrypted = encryptMcpConnectionAuth({
      accessToken: 'a',
      idToken: 'should-not-be-encrypted-yet',
    } as Record<string, unknown>);

    expect((encrypted!.accessToken as string).startsWith(novuSubMask)).toBe(true);
    expect(encrypted!.idToken).toEqual('should-not-be-encrypted-yet');
  });
});

describe('encryptMcpConnectionOAuthClient / decryptMcpConnectionOAuthClient', () => {
  const novuSubMask = 'nvsk.';

  it('encrypts both clientSecret and registrationAccessToken', () => {
    const encrypted = encryptMcpConnectionOAuthClient({
      clientId: 'public-id',
      clientSecret: 's3cret',
      registrationAccessToken: 'rat',
    });

    expect(encrypted!.clientId).toEqual('public-id');
    expect((encrypted!.clientSecret as string).startsWith(novuSubMask)).toBe(true);
    expect((encrypted!.registrationAccessToken as string).startsWith(novuSubMask)).toBe(true);
  });

  it('round-trips through encrypt + decrypt', () => {
    const original = {
      clientId: 'public-id',
      clientSecret: 's3cret',
      registrationAccessToken: 'rat',
    };
    const encrypted = encryptMcpConnectionOAuthClient(original);
    const decrypted = decryptMcpConnectionOAuthClient(encrypted);

    expect(decrypted!.clientSecret).toEqual(original.clientSecret);
    expect(decrypted!.registrationAccessToken).toEqual(original.registrationAccessToken);
    expect(decrypted!.clientId).toEqual(original.clientId);
  });

  it('encryption is idempotent for already-encrypted oauth client fields', () => {
    const onePass = encryptMcpConnectionOAuthClient({ clientId: 'x', clientSecret: 's3cret' });
    const twoPass = encryptMcpConnectionOAuthClient(onePass);

    expect(twoPass!.clientSecret).toEqual(onePass!.clientSecret);
  });

  it('handles missing/undefined oauth client gracefully', () => {
    expect(encryptMcpConnectionOAuthClient(undefined)).toBeUndefined();
    expect(decryptMcpConnectionOAuthClient(undefined)).toBeUndefined();
  });

  it('preserves non-secret fields untouched', () => {
    const registeredAt = new Date('2026-12-01T00:00:00Z');
    const encrypted = encryptMcpConnectionOAuthClient({
      clientId: 'public-id',
      clientSecret: 's3cret',
      issuer: 'https://auth.example.com',
      authorizationEndpoint: 'https://auth.example.com/authorize',
      tokenEndpoint: 'https://auth.example.com/token',
      registeredAt,
    } as Record<string, unknown>);

    expect(encrypted!.issuer).toEqual('https://auth.example.com');
    expect(encrypted!.authorizationEndpoint).toEqual('https://auth.example.com/authorize');
    expect(encrypted!.tokenEndpoint).toEqual('https://auth.example.com/token');
    expect(encrypted!.registeredAt).toBe(registeredAt);
    expect((encrypted!.clientSecret as string).startsWith(novuSubMask)).toBe(true);
  });

  it('does NOT encrypt fields outside the SECURE_OAUTH_CLIENT_FIELDS allowlist', () => {
    // Forward-compat hardening: the issuer / endpoints are non-secret and
    // must not be wrapped. clientId is also non-secret (it appears in
    // authorize URLs).
    const encrypted = encryptMcpConnectionOAuthClient({
      clientId: 'public-id',
      clientSecret: 's3cret',
      issuer: 'https://auth.example.com',
    });

    expect(encrypted!.clientId).toEqual('public-id');
    expect(encrypted!.issuer).toEqual('https://auth.example.com');
    expect((encrypted!.clientSecret as string).startsWith(novuSubMask)).toBe(true);
  });

  it('does not cross-contaminate with auth helper', () => {
    // encryptMcpConnectionOAuthClient must NOT encrypt accessToken/refreshToken
    // (those are the auth helper's responsibility). Otherwise running both
    // helpers on the same object would double-encrypt fields.
    const encrypted = encryptMcpConnectionOAuthClient({
      clientId: 'public-id',
      accessToken: 'should-not-touch',
      refreshToken: 'should-not-touch-either',
    } as Record<string, unknown>);

    expect(encrypted!.accessToken).toEqual('should-not-touch');
    expect(encrypted!.refreshToken).toEqual('should-not-touch-either');
  });
});
