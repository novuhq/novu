import { expect } from 'chai';

import { McpOAuthDiscoveryError } from '../../oauth/mcp-oauth-discovery.service';
import { McpNovuAppCredentialsService } from './get-mcp-novu-app-credentials.service';

describe('McpNovuAppCredentialsService', () => {
  let usecase: McpNovuAppCredentialsService;
  let previousClientId: string | undefined;
  let previousClientSecret: string | undefined;

  beforeEach(() => {
    previousClientId = process.env.NOVU_GITHUB_MCP_APP_CLIENT_ID;
    previousClientSecret = process.env.NOVU_GITHUB_MCP_APP_CLIENT_SECRET;
    usecase = new McpNovuAppCredentialsService();
  });

  afterEach(() => {
    if (previousClientId === undefined) {
      delete process.env.NOVU_GITHUB_MCP_APP_CLIENT_ID;
    } else {
      process.env.NOVU_GITHUB_MCP_APP_CLIENT_ID = previousClientId;
    }
    if (previousClientSecret === undefined) {
      delete process.env.NOVU_GITHUB_MCP_APP_CLIENT_SECRET;
    } else {
      process.env.NOVU_GITHUB_MCP_APP_CLIENT_SECRET = previousClientSecret;
    }
  });

  it('returns env-loaded credentials for a configured mcpId', () => {
    process.env.NOVU_GITHUB_MCP_APP_CLIENT_ID = 'Iv23livefakeclientid';
    process.env.NOVU_GITHUB_MCP_APP_CLIENT_SECRET = 'ghs_fakeclientsecret';

    const creds = usecase.execute('github');

    expect(creds).to.deep.equal({
      clientId: 'Iv23livefakeclientid',
      clientSecret: 'ghs_fakeclientsecret',
    });
  });

  it('throws mcp_novu_app_credentials_missing for an unknown mcpId', () => {
    process.env.NOVU_GITHUB_MCP_APP_CLIENT_ID = 'x';
    process.env.NOVU_GITHUB_MCP_APP_CLIENT_SECRET = 'y';

    try {
      usecase.execute('this-mcp-has-no-mapping');
      expect.fail('expected throw');
    } catch (err) {
      expect(err).to.be.instanceOf(McpOAuthDiscoveryError);
      expect((err as McpOAuthDiscoveryError).code).to.equal('mcp_novu_app_credentials_missing');
    }
  });

  it('throws when both env vars are unset', () => {
    delete process.env.NOVU_GITHUB_MCP_APP_CLIENT_ID;
    delete process.env.NOVU_GITHUB_MCP_APP_CLIENT_SECRET;

    try {
      usecase.execute('github');
      expect.fail('expected throw');
    } catch (err) {
      expect(err).to.be.instanceOf(McpOAuthDiscoveryError);
      expect((err as McpOAuthDiscoveryError).code).to.equal('mcp_novu_app_credentials_missing');
      // Surface BOTH missing env var names so a self-hoster sees the full
      // checklist in one error message rather than chasing them one by one.
      expect((err as McpOAuthDiscoveryError).message).to.contain('NOVU_GITHUB_MCP_APP_CLIENT_ID');
      expect((err as McpOAuthDiscoveryError).message).to.contain('NOVU_GITHUB_MCP_APP_CLIENT_SECRET');
    }
  });

  it('throws when only the client_id is set (partial config)', () => {
    process.env.NOVU_GITHUB_MCP_APP_CLIENT_ID = 'set';
    delete process.env.NOVU_GITHUB_MCP_APP_CLIENT_SECRET;

    try {
      usecase.execute('github');
      expect.fail('expected throw');
    } catch (err) {
      expect(err).to.be.instanceOf(McpOAuthDiscoveryError);
      expect((err as McpOAuthDiscoveryError).code).to.equal('mcp_novu_app_credentials_missing');
      expect((err as McpOAuthDiscoveryError).message).to.contain('NOVU_GITHUB_MCP_APP_CLIENT_SECRET');
      expect((err as McpOAuthDiscoveryError).message).not.to.contain('NOVU_GITHUB_MCP_APP_CLIENT_ID,');
    }
  });

  it('throws when only the client_secret is set (partial config)', () => {
    delete process.env.NOVU_GITHUB_MCP_APP_CLIENT_ID;
    process.env.NOVU_GITHUB_MCP_APP_CLIENT_SECRET = 'set';

    try {
      usecase.execute('github');
      expect.fail('expected throw');
    } catch (err) {
      expect(err).to.be.instanceOf(McpOAuthDiscoveryError);
      expect((err as McpOAuthDiscoveryError).code).to.equal('mcp_novu_app_credentials_missing');
      expect((err as McpOAuthDiscoveryError).message).to.contain('NOVU_GITHUB_MCP_APP_CLIENT_ID');
    }
  });

  it('treats whitespace-only env vars as missing and trims surrounding whitespace from real values', () => {
    process.env.NOVU_GITHUB_MCP_APP_CLIENT_ID = '   ';
    process.env.NOVU_GITHUB_MCP_APP_CLIENT_SECRET = '\t\n';

    try {
      usecase.execute('github');
      expect.fail('expected throw');
    } catch (err) {
      expect(err).to.be.instanceOf(McpOAuthDiscoveryError);
      expect((err as McpOAuthDiscoveryError).code).to.equal('mcp_novu_app_credentials_missing');
      expect((err as McpOAuthDiscoveryError).message).to.contain('NOVU_GITHUB_MCP_APP_CLIENT_ID');
      expect((err as McpOAuthDiscoveryError).message).to.contain('NOVU_GITHUB_MCP_APP_CLIENT_SECRET');
    }

    // …and when the values are non-empty after trimming, return the
    // trimmed credentials so a trailing newline in `.env` doesn't poison
    // the token-exchange request body.
    process.env.NOVU_GITHUB_MCP_APP_CLIENT_ID = '  Iv23livefakeclientid  ';
    process.env.NOVU_GITHUB_MCP_APP_CLIENT_SECRET = 'ghs_fakeclientsecret\n';

    expect(usecase.execute('github')).to.deep.equal({
      clientId: 'Iv23livefakeclientid',
      clientSecret: 'ghs_fakeclientsecret',
    });
  });

  it('does not leak the resolved client_secret in the thrown message', () => {
    process.env.NOVU_GITHUB_MCP_APP_CLIENT_ID = 'set';
    process.env.NOVU_GITHUB_MCP_APP_CLIENT_SECRET = 'super-secret-do-not-log';

    // Tripped error: unknown mcpId returns the generic missing-mapping error.
    // The thrown message MUST NOT contain the resolved client secret value
    // — only env-var NAMES are safe to surface.
    try {
      usecase.execute('this-mcp-has-no-mapping');
      expect.fail('expected throw');
    } catch (err) {
      expect((err as Error).message).not.to.contain('super-secret-do-not-log');
    }
  });
});
