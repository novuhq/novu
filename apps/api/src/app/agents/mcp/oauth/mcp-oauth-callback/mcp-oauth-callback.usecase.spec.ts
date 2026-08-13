import type { McpConnectionEntity, McpConnectionOAuthClient } from '@novu/dal';
import { expect } from 'chai';
import sinon from 'sinon';

import { AgentPlatformEnum } from '../../../shared/enums/agent-platform.enum';
import type { McpOAuthState } from '../generate-mcp-oauth-url/mcp-oauth-state';
import {
  buildTokenExchangeAuth,
  McpOAuthCallback,
  mapUpstreamCallbackErrorCode,
  parseUpstreamErrorToken,
} from './mcp-oauth-callback.usecase';

function makeOAuthClient(overrides: Partial<McpConnectionOAuthClient> = {}): McpConnectionOAuthClient {
  return {
    clientId: 'client-id',
    clientSecret: 's3cret',
    issuer: 'https://auth.example.com',
    authorizationEndpoint: 'https://auth.example.com/authorize',
    tokenEndpoint: 'https://auth.example.com/token',
    registeredAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function decodeBasic(headerValue: string): { user: string; pass: string } {
  const [, b64] = headerValue.split(' ');
  const decoded = Buffer.from(b64, 'base64').toString('utf8');
  const idx = decoded.indexOf(':');

  return { user: decodeURIComponent(decoded.slice(0, idx)), pass: decodeURIComponent(decoded.slice(idx + 1)) };
}

describe('McpOAuthCallback error mapping helpers', () => {
  describe('parseUpstreamErrorToken', () => {
    it('returns undefined for blank or missing input', () => {
      expect(parseUpstreamErrorToken(undefined)).to.equal(undefined);
      expect(parseUpstreamErrorToken('')).to.equal(undefined);
      expect(parseUpstreamErrorToken('   ')).to.equal(undefined);
    });

    it('extracts the bare error token', () => {
      expect(parseUpstreamErrorToken('access_denied')).to.equal('access_denied');
    });

    it('extracts the head when the controller has glued in an error_description', () => {
      // Mirrors `${error}${errorDescription ? ` - ${errorDescription}` : ''}` from the controller.
      expect(parseUpstreamErrorToken('access_denied - The user cancelled the consent')).to.equal('access_denied');
    });

    it('trims surrounding whitespace before splitting', () => {
      expect(parseUpstreamErrorToken('   access_denied   ')).to.equal('access_denied');
    });
  });

  describe('mapUpstreamCallbackErrorCode', () => {
    it('maps access_denied to mcp_user_denied', () => {
      expect(mapUpstreamCallbackErrorCode('access_denied')).to.equal('mcp_user_denied');
    });

    it('falls back to oauth_callback_error for any unrecognised token', () => {
      expect(mapUpstreamCallbackErrorCode('server_error')).to.equal('oauth_callback_error');
      expect(mapUpstreamCallbackErrorCode('temporarily_unavailable')).to.equal('oauth_callback_error');
      expect(mapUpstreamCallbackErrorCode(undefined)).to.equal('oauth_callback_error');
    });
  });
});

describe('buildTokenExchangeAuth', () => {
  it('puts client credentials in the Authorization: Basic header for client_secret_basic', () => {
    const params = new URLSearchParams({ grant_type: 'authorization_code' });
    const headers = buildTokenExchangeAuth({
      authMethod: 'client_secret_basic',
      oauthClient: makeOAuthClient(),
      params,
    });

    expect(headers.Authorization).to.match(/^Basic /);
    const { user, pass } = decodeBasic(headers.Authorization);
    expect(user).to.equal('client-id');
    expect(pass).to.equal('s3cret');
    expect(params.get('client_id')).to.equal(null);
    expect(params.get('client_secret')).to.equal(null);
  });

  it('url-encodes credentials BEFORE base64-encoding so secrets with `:` `+` and spaces round-trip', () => {
    // RFC 6749 §2.3.1 — credentials containing reserved characters (notably
    // `:` which would otherwise alias the field separator inside the Basic
    // payload) must be form-urlencoded before base64. A naive
    // `${id}:${secret}` would corrupt the decoded form.
    const params = new URLSearchParams();
    const headers = buildTokenExchangeAuth({
      authMethod: 'client_secret_basic',
      oauthClient: makeOAuthClient({ clientId: 'cli ent:1', clientSecret: 'p@ss:w+rd with space' }),
      params,
    });

    const { user, pass } = decodeBasic(headers.Authorization);
    expect(user).to.equal('cli ent:1');
    expect(pass).to.equal('p@ss:w+rd with space');
  });

  it('throws when client_secret_basic is selected but no clientSecret is available (invariant violation)', () => {
    expect(() =>
      buildTokenExchangeAuth({
        authMethod: 'client_secret_basic',
        oauthClient: makeOAuthClient({ clientSecret: undefined }),
        params: new URLSearchParams(),
      })
    ).to.throw(/refusing to downgrade/i);
  });

  it('puts client_id and client_secret in the body and omits Authorization for client_secret_post', () => {
    const params = new URLSearchParams({ grant_type: 'authorization_code' });
    const headers = buildTokenExchangeAuth({
      authMethod: 'client_secret_post',
      oauthClient: makeOAuthClient(),
      params,
    });

    expect(headers.Authorization).to.equal(undefined);
    expect(params.get('client_id')).to.equal('client-id');
    expect(params.get('client_secret')).to.equal('s3cret');
  });

  it('throws when client_secret_post is selected but no clientSecret is available (invariant violation)', () => {
    expect(() =>
      buildTokenExchangeAuth({
        authMethod: 'client_secret_post',
        oauthClient: makeOAuthClient({ clientSecret: undefined }),
        params: new URLSearchParams(),
      })
    ).to.throw(/refusing to downgrade/i);
  });

  it('puts only client_id in the body for the `none` (public-client) method', () => {
    const params = new URLSearchParams({ grant_type: 'authorization_code' });
    const headers = buildTokenExchangeAuth({
      authMethod: 'none',
      oauthClient: makeOAuthClient({ clientSecret: undefined }),
      params,
    });

    expect(headers.Authorization).to.equal(undefined);
    expect(params.get('client_id')).to.equal('client-id');
    expect(params.get('client_secret')).to.equal(null);
  });
});

describe('McpOAuthCallback managed chat resume', () => {
  it('resumes the parked agent-chat tool call when publishing the connected result fails', async () => {
    const channel = {
      platform: AgentPlatformEnum.AGENT_CHAT,
      _integrationId: 'integration-id',
      platformThreadId: 'agent_chat:conversation-id',
    };
    const subscriberRepository = {
      findOne: sinon.stub().resolves({ subscriberId: 'subscriber-external-id' }),
    };
    const managedAgentService = {
      sendToolResult: sinon.stub().resolves(undefined),
    };
    const agentConversationService = {
      getConversation: sinon.stub().resolves({ _id: 'conversation-id' }),
      getPrimaryChannel: sinon.stub().returns(channel),
      persistMcpConnectionResult: sinon.stub().rejects(new Error('publisher unavailable')),
    };
    const outboundGateway = {
      startTypingInConversation: sinon.stub().resolves(undefined),
    };
    const logger = {
      setContext: sinon.stub(),
      warn: sinon.stub(),
    };
    const callback = new McpOAuthCallback(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      subscriberRepository as never,
      {} as never,
      {} as never,
      managedAgentService as never,
      agentConversationService as never,
      outboundGateway as never,
      {} as never,
      {} as never,
      logger as never
    );
    const resumeSessionAfterConnect = (
      callback as unknown as {
        resumeSessionAfterConnect(stateData: McpOAuthState, connection: McpConnectionEntity): Promise<void>;
      }
    ).resumeSessionAfterConnect.bind(callback);
    const stateData = {
      environmentId: 'environment-id',
      organizationId: 'organization-id',
      agentId: 'agent-id',
      agentMcpServerId: 'agent-mcp-server-id',
      subscriberId: 'subscriber-mongo-id',
      mcpId: 'example-mcp',
      scope: 'subscriber',
      timestamp: Date.now(),
      conversationId: 'conversation-id',
      agentIdentifier: 'agent-identifier',
      integrationIdentifier: 'integration-identifier',
      toolUseId: 'tool-use-id',
      platform: AgentPlatformEnum.AGENT_CHAT,
      platformThreadId: 'agent_chat:conversation-id',
    } as McpOAuthState;

    await resumeSessionAfterConnect(stateData, {} as McpConnectionEntity);

    expect(
      agentConversationService.persistMcpConnectionResult.calledOnceWithExactly({
        conversationId: 'conversation-id',
        environmentId: 'environment-id',
        organizationId: 'organization-id',
        agentIdentifier: 'agent-identifier',
        channel,
        actionId: 'tool-use-id',
        mcpId: 'example-mcp',
        status: 'connected',
      })
    ).to.equal(true);
    expect(
      managedAgentService.sendToolResult.calledOnceWithExactly({
        conversationId: 'conversation-id',
        environmentId: 'environment-id',
        organizationId: 'organization-id',
        agentIdentifier: 'agent-identifier',
        integrationIdentifier: 'integration-identifier',
        subscriberId: 'subscriber-external-id',
        toolUseId: 'tool-use-id',
        content: 'OK',
        followUpMessage:
          "example-mcp is now connected and ready. Resume the user's original request. Use the available tools directly. Do not output any preamble or mention the connection — go straight to action.",
        platform: AgentPlatformEnum.AGENT_CHAT,
        platformThreadId: 'agent_chat:conversation-id',
        suppressReply: true,
      })
    ).to.equal(true);
    expect(
      agentConversationService.persistMcpConnectionResult.calledBefore(managedAgentService.sendToolResult)
    ).to.equal(true);
    expect(
      logger.warn.calledOnceWithExactly(
        sinon.match.instanceOf(Error),
        'Failed to record MCP connection result; continuing session resume'
      )
    ).to.equal(true);
  });
});
