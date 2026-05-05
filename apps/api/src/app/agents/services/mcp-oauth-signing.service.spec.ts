import { BadRequestException } from '@nestjs/common';
import { expect } from 'chai';
import { McpOauthSigningService, type OauthConnectPayload } from './mcp-oauth-signing.service';

describe('McpOauthSigningService', () => {
  const originalSecret = process.env.NOVU_SECRET_KEY;

  before(() => {
    process.env.NOVU_SECRET_KEY = 'test-secret';
  });

  after(() => {
    if (originalSecret === undefined) {
      delete process.env.NOVU_SECRET_KEY;
    } else {
      process.env.NOVU_SECRET_KEY = originalSecret;
    }
  });

  function basePayload(overrides: Partial<OauthConnectPayload> = {}): OauthConnectPayload {
    return {
      organizationId: 'org-id',
      environmentId: 'env-id',
      subscriberId: 'sub-id',
      agentId: 'agent-internal-id',
      agentIdentifier: 'agent-slug',
      conversationId: 'conv-id',
      mcpServerName: 'github',
      issuedAt: Date.now(),
      nonce: 'nonce',
      ...overrides,
    };
  }

  it('signs and verifies payloads round-trip', () => {
    const service = new McpOauthSigningService();
    const payload = basePayload();
    const token = service.signPayload(payload);

    const verified = service.verifyPayload(token);
    expect(verified.subscriberId).to.equal(payload.subscriberId);
    expect(verified.mcpServerName).to.equal(payload.mcpServerName);
  });

  it('rejects a tampered payload', () => {
    const service = new McpOauthSigningService();
    const token = service.signPayload(basePayload());
    const [version, encoded, signature] = token.split('.');
    const tampered = `${version}.${encoded.slice(0, -1)}A.${signature}`;

    expect(() => service.verifyPayload(tampered)).to.throw(BadRequestException);
  });

  it('rejects an expired token', () => {
    const service = new McpOauthSigningService();
    const token = service.signPayload(basePayload({ issuedAt: Date.now() - 60 * 60 * 1000 }));

    expect(() => service.verifyPayload(token, { ttlMs: 5 * 60 * 1000 })).to.throw(BadRequestException);
  });

  it('rejects a token with wrong format', () => {
    const service = new McpOauthSigningService();
    expect(() => service.verifyPayload('not.a.valid.token')).to.throw(BadRequestException);
    expect(() => service.verifyPayload('v0.encoded.sig')).to.throw(BadRequestException);
  });
});
