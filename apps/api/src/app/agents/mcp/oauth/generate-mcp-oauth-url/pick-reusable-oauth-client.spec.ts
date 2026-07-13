import type { McpConnectionOAuthClient } from '@novu/dal';
import { expect } from 'chai';
import { pickReusableOAuthClient } from './pick-reusable-oauth-client';

const ISSUER = 'https://auth.example.com';
const REDIRECT_URI = 'https://api.example.com/v1/agents/mcp/oauth/callback';

function makeClient(overrides: Partial<McpConnectionOAuthClient> = {}): McpConnectionOAuthClient {
  return {
    clientId: 'client-id',
    clientSecret: 'unencrypted-shape-is-fine-for-shape-checks',
    issuer: ISSUER,
    authorizationEndpoint: `${ISSUER}/authorize`,
    tokenEndpoint: `${ISSUER}/token`,
    redirectUri: REDIRECT_URI,
    registeredAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('pickReusableOAuthClient', () => {
  it('returns the decrypted client on the happy path', () => {
    const result = pickReusableOAuthClient(makeClient(), ISSUER, REDIRECT_URI);

    expect(result).to.not.equal(undefined);
    expect(result?.clientId).to.equal('client-id');
    expect(result?.issuer).to.equal(ISSUER);
  });

  it('returns undefined when no client is recorded', () => {
    expect(pickReusableOAuthClient(undefined, ISSUER, REDIRECT_URI)).to.equal(undefined);
  });

  it('returns undefined when the issuer has rotated', () => {
    expect(pickReusableOAuthClient(makeClient({ issuer: 'https://other.example.com' }), ISSUER, REDIRECT_URI)).to.equal(
      undefined
    );
  });

  it('returns undefined when the recorded redirectUri does not match', () => {
    expect(
      pickReusableOAuthClient(
        makeClient({ redirectUri: 'https://old-tunnel.example.com/callback' }),
        ISSUER,
        REDIRECT_URI
      )
    ).to.equal(undefined);
  });

  it('treats a legacy row without redirectUri as non-reusable', () => {
    expect(pickReusableOAuthClient(makeClient({ redirectUri: undefined }), ISSUER, REDIRECT_URI)).to.equal(undefined);
  });

  it('returns undefined when the client secret has expired (Date instance)', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    expect(pickReusableOAuthClient(makeClient({ clientSecretExpiresAt: yesterday }), ISSUER, REDIRECT_URI)).to.equal(
      undefined
    );
  });

  it('returns undefined when the client secret has expired (ISO string shape from Mongo read)', () => {
    // BaseRepositoryV2 returns Date as ISO string at read-time; the helper
    // must still treat the row as expired.
    const yesterdayIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    expect(
      pickReusableOAuthClient(
        makeClient({ clientSecretExpiresAt: yesterdayIso as unknown as Date }),
        ISSUER,
        REDIRECT_URI
      )
    ).to.equal(undefined);
  });

  it('returns undefined when clientSecretExpiresAt is unparseable (corrupted timestamp)', () => {
    expect(
      pickReusableOAuthClient(
        makeClient({ clientSecretExpiresAt: 'not-a-date' as unknown as Date }),
        ISSUER,
        REDIRECT_URI
      )
    ).to.equal(undefined);
  });

  it('reuses a client whose secret expires in the future', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const result = pickReusableOAuthClient(makeClient({ clientSecretExpiresAt: tomorrow }), ISSUER, REDIRECT_URI);

    expect(result).to.not.equal(undefined);
  });

  it('reuses a client whose secret never expires (no field set)', () => {
    const result = pickReusableOAuthClient(makeClient({ clientSecretExpiresAt: undefined }), ISSUER, REDIRECT_URI);

    expect(result).to.not.equal(undefined);
  });
});
