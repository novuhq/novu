import { expect } from 'chai';
import sinon from 'sinon';

import {
  buildMcpConnectRedirectUrl,
  MCP_CONNECT_REDIRECT_PATH,
  MCP_CONNECT_REDIRECT_TTL_SECONDS,
  McpConnectRedirectService,
} from './mcp-connect-redirect.service';

describe('McpConnectRedirectService', () => {
  const originalApiRootUrl = process.env.API_ROOT_URL;

  afterEach(() => {
    if (originalApiRootUrl === undefined) {
      delete process.env.API_ROOT_URL;
    } else {
      process.env.API_ROOT_URL = originalApiRootUrl;
    }
  });

  function makeService() {
    const cacheStore = new Map<string, string>();
    const cacheService = {
      cacheEnabled: () => true,
      set: sinon.stub().callsFake(async (key: string, value: string, options?: { ttl?: number }) => {
        cacheStore.set(key, value);

        expect(options?.ttl).to.equal(MCP_CONNECT_REDIRECT_TTL_SECONDS);

        return 'OK';
      }),
      get: sinon.stub().callsFake(async (key: string) => cacheStore.get(key) ?? null),
    };
    const logger = {
      setContext: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub(),
      info: sinon.stub(),
    };

    const service = new McpConnectRedirectService(cacheService as any, logger as any);

    return { service, cacheService, cacheStore };
  }

  it('issues a short redirect URL and stores the authorize URL in Redis', async () => {
    process.env.API_ROOT_URL = 'https://api.example.com';
    const { service, cacheStore } = makeService();
    const authorizeUrl = 'https://app.attio.com/oidc/authorize?client_id=abc&state=very-long';

    const redirectUrl = await service.issue(authorizeUrl);

    expect(redirectUrl).to.match(
      new RegExp(`^https://api\\.example\\.com${MCP_CONNECT_REDIRECT_PATH.replace(/\//g, '\\/')}/[A-Za-z0-9_-]+$`)
    );

    const token = redirectUrl.split('/').pop()!;
    expect(cacheStore.get(`mcp-connect-redirect:${token}`)).to.equal(authorizeUrl);
  });

  it('resolves a stored token to the authorize URL', async () => {
    process.env.API_ROOT_URL = 'https://api.example.com';
    const { service } = makeService();
    const authorizeUrl = 'https://provider.example/oauth/authorize?state=xyz';

    const redirectUrl = await service.issue(authorizeUrl);
    const token = redirectUrl.split('/').pop()!;
    const resolved = await service.resolve(token);

    expect(resolved).to.equal(authorizeUrl);
  });

  it('returns null for unknown tokens', async () => {
    const { service } = makeService();

    const resolved = await service.resolve('missing-token');

    expect(resolved).to.equal(null);
  });

  it('falls back to the full authorize URL when cache write fails', async () => {
    const cacheService = {
      cacheEnabled: () => true,
      set: sinon.stub().rejects(new Error('redis unavailable')),
      get: sinon.stub(),
    };
    const logger = {
      setContext: sinon.stub(),
      warn: sinon.stub(),
    };
    const service = new McpConnectRedirectService(cacheService as any, logger as any);
    const authorizeUrl = 'https://provider.example/oauth/authorize?state=xyz';

    const redirectUrl = await service.issue(authorizeUrl);

    expect(redirectUrl).to.equal(authorizeUrl);
    expect(logger.warn.calledOnce).to.equal(true);
  });

  it('falls back to the full authorize URL when cache is disabled', async () => {
    const cacheService = {
      cacheEnabled: () => false,
      set: sinon.stub(),
      get: sinon.stub(),
    };
    const logger = {
      setContext: sinon.stub(),
      warn: sinon.stub(),
    };
    const service = new McpConnectRedirectService(cacheService as any, logger as any);
    const authorizeUrl = 'https://provider.example/oauth/authorize?state=xyz';

    const redirectUrl = await service.issue(authorizeUrl);

    expect(redirectUrl).to.equal(authorizeUrl);
    expect(cacheService.set.called).to.equal(false);
  });

  it('buildMcpConnectRedirectUrl encodes the token in the public path', () => {
    process.env.API_ROOT_URL = 'https://api.example.com/';

    expect(buildMcpConnectRedirectUrl('abc123')).to.equal(`https://api.example.com${MCP_CONNECT_REDIRECT_PATH}/abc123`);
  });
});
