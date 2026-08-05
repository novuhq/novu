import { encodeOAuthState } from '@novu/application-generic';
import { expect } from 'chai';

import { MCP_OAUTH_CALLBACK_PATH } from './mcp-oauth.constants';
import { buildMcpOAuthRedirectUri, isMcpOAuthStateRef, type McpOAuthStateRef } from './mcp-oauth-state';

/** Campfire (and similar AS) reject authorize requests when `state` exceeds this. */
const CAMPFIRE_STATE_MAX_LEN = 512;

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

describe('isMcpOAuthStateRef', () => {
  it('accepts a compact v1 state ref', () => {
    const ref: McpOAuthStateRef = {
      v: 1,
      environmentId: 'env',
      organizationId: 'org',
      connectionId: 'conn',
      nonce: 'nonce',
      timestamp: Date.now(),
    };

    expect(isMcpOAuthStateRef(ref)).to.equal(true);
  });

  it('rejects a legacy fully-inline McpOAuthState payload', () => {
    expect(
      isMcpOAuthStateRef({
        agentId: 'agent',
        agentMcpServerId: 'enablement',
        subscriberId: 'sub',
        environmentId: 'env',
        organizationId: 'org',
        mcpId: 'campfire',
        scope: 'subscriber',
        timestamp: Date.now(),
      })
    ).to.equal(false);
  });
});

describe('compact OAuth state length budget', () => {
  it("stays under Campfire's 512-char state cap including chat session fields offloaded to the row", () => {
    const ref: McpOAuthStateRef = {
      v: 1,
      environmentId: '6a71c90b7575be3f63781b60',
      organizationId: '6a71c90a6ec7b246ab325402',
      connectionId: '6a72fb6e0ce8c4ecc82015ba',
      nonce: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      timestamp: 1785920818457,
      trustToolsOnConnect: true,
    };
    const payload = JSON.stringify(ref);
    // 64-char hex HMAC, same shape as createHash output.
    const encoded = encodeOAuthState(payload, 'a'.repeat(64));

    expect(encoded.length).to.be.lessThan(CAMPFIRE_STATE_MAX_LEN);
  });
});
