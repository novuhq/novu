import { describe, expect, it } from 'vitest';

import { decryptChannelConnectionAuth, encryptChannelConnectionAuth } from './encrypt-channel-connection-auth';

describe('encryptChannelConnectionAuth / decryptChannelConnectionAuth', () => {
  const novuSubMask = 'nvsk.';

  it('encrypts accessToken with the Novu encryption prefix', () => {
    const encrypted = encryptChannelConnectionAuth({ accessToken: 'xoxb-test-token' });

    expect(encrypted).toBeDefined();
    expect(typeof encrypted!.accessToken).toBe('string');
    expect((encrypted!.accessToken as string).startsWith(novuSubMask)).toBe(true);
    expect(encrypted!.accessToken).not.toEqual('xoxb-test-token');
  });

  it('round-trips through encrypt + decrypt', () => {
    const original = { accessToken: 'xoxb-test-token' };
    const encrypted = encryptChannelConnectionAuth(original);
    const decrypted = decryptChannelConnectionAuth(encrypted);

    expect(decrypted!.accessToken).toEqual(original.accessToken);
  });

  it('encryption is idempotent — already-encrypted values pass through unchanged', () => {
    const onePass = encryptChannelConnectionAuth({ accessToken: 'xoxb-test-token' });
    const twoPass = encryptChannelConnectionAuth(onePass);

    expect(twoPass!.accessToken).toEqual(onePass!.accessToken);
  });

  it('decryption is idempotent — legacy unprefixed values pass through unchanged', () => {
    const legacy = { accessToken: 'xoxb-legacy-token' };
    const decrypted = decryptChannelConnectionAuth(legacy);

    expect(decrypted!.accessToken).toEqual(legacy.accessToken);
  });

  it('handles missing/undefined auth gracefully', () => {
    expect(encryptChannelConnectionAuth(undefined)).toBeUndefined();
    expect(decryptChannelConnectionAuth(undefined)).toBeUndefined();
  });

  it('preserves unknown (non-secret) fields verbatim', () => {
    const encrypted = encryptChannelConnectionAuth({
      accessToken: 'xoxb-secret',
      workspaceName: 'Acme',
    } as Record<string, unknown>);

    expect(encrypted!.workspaceName).toEqual('Acme');
    expect((encrypted!.accessToken as string).startsWith(novuSubMask)).toBe(true);
  });

  it('encrypts additional secret fields when present (refreshToken, signingSecret, clientSecret)', () => {
    const encrypted = encryptChannelConnectionAuth({
      accessToken: 'a',
      refreshToken: 'r',
      signingSecret: 's',
      clientSecret: 'c',
    } as Record<string, unknown>);

    for (const key of ['accessToken', 'refreshToken', 'signingSecret', 'clientSecret']) {
      expect((encrypted![key] as string).startsWith(novuSubMask)).toBe(true);
    }

    const decrypted = decryptChannelConnectionAuth(encrypted);
    expect(decrypted!.accessToken).toEqual('a');
    expect(decrypted!.refreshToken).toEqual('r');
    expect(decrypted!.signingSecret).toEqual('s');
    expect(decrypted!.clientSecret).toEqual('c');
  });

  it('skips empty-string values', () => {
    const encrypted = encryptChannelConnectionAuth({ accessToken: '' });
    expect(encrypted!.accessToken).toEqual('');
  });

  it('does not encrypt tool-channel fields that belong on the endpoint document', () => {
    const auth = {
      accessToken: 'xoxb-secret',
      routingKey: 'R0UTINGK3YEXAMPLE000000000000000',
      apiKey: 'eb243592-faa2-4ba2-a551-1afdf565c889',
      url: 'https://hooks.example.com/inbound',
      headers: { Authorization: 'Bearer secret' },
      method: 'POST',
      region: 'eu',
    };
    const encrypted = encryptChannelConnectionAuth(auth);

    expect((encrypted!.accessToken as string).startsWith(novuSubMask)).toBe(true);
    expect(encrypted!.routingKey).toEqual(auth.routingKey);
    expect(encrypted!.apiKey).toEqual(auth.apiKey);
    expect(encrypted!.url).toEqual(auth.url);
    expect(encrypted!.headers).toEqual(auth.headers);
    expect(encrypted!.method).toEqual(auth.method);
    expect(encrypted!.region).toEqual(auth.region);
  });
});
