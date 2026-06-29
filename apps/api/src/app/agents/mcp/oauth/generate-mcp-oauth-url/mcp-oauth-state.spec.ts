import { expect } from 'chai';
import { MCP_OAUTH_CALLBACK_PATH } from './mcp-oauth.constants';
import { buildMcpOAuthRedirectUri } from './mcp-oauth-state';

describe('buildMcpOAuthRedirectUri', () => {
  const originalApiRootUrl = process.env.API_ROOT_URL;
  const originalAgentApiHostname = process.env.AGENT_API_HOSTNAME;

  afterEach(() => {
    process.env.API_ROOT_URL = originalApiRootUrl;
    process.env.AGENT_API_HOSTNAME = originalAgentApiHostname;
  });

  it('appends the OAuth callback path to the agent API root URL', () => {
    process.env.API_ROOT_URL = 'https://api.example.com';

    expect(buildMcpOAuthRedirectUri()).to.equal(`https://api.example.com${MCP_OAUTH_CALLBACK_PATH}`);
  });
});
