import * as AgentRuntimeFactoryModule from '@novu/application-generic/build/main/agent-runtimes/agent-runtime.factory';
import * as SsrfModule from '@novu/application-generic/build/main/utils/ssrf-url-validation';
import {
  AgentMcpServerRepository,
  AgentRepository,
  IntegrationRepository,
  McpConnectionRepository,
  SubscriberRepository,
} from '@novu/dal';
import {
  AgentRuntimeProviderIdEnum,
  IntegrationKindEnum,
  McpConnectionAuthModeEnum,
  McpConnectionScopeEnum,
  McpConnectionStatusEnum,
} from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';

const FAKE_API_KEY = 'sk-fake-anthropic-key-for-e2e';
const FAKE_EXTERNAL_AGENT_ID = 'ext-agent-mcp-e2e-123';
const FAKE_EXTERNAL_ENV_ID = 'env_01XJ5McpFakeEnvE2E';

const agentRepository = new AgentRepository();
const integrationRepository = new IntegrationRepository();
const agentMcpServerRepository = new AgentMcpServerRepository();
const mcpConnectionRepository = new McpConnectionRepository();
const subscriberRepository = new SubscriberRepository();

function buildMockProvider(overrides: Partial<Record<string, sinon.SinonStub>> = {}) {
  return {
    providerId: AgentRuntimeProviderIdEnum.Anthropic,
    capabilities: { mcpServers: true, tools: true, model: true, systemPrompt: true, skills: true, tokenVault: true },
    validateCredentials: sinon.stub().resolves(),
    createAgent: sinon.stub().resolves({ externalAgentId: FAKE_EXTERNAL_AGENT_ID }),
    deleteAgent: sinon.stub().resolves(),
    getAgent: sinon.stub().resolves({ externalAgentId: FAKE_EXTERNAL_AGENT_ID, name: 'mock' }),
    getEnvironment: sinon.stub().resolves({ id: FAKE_EXTERNAL_ENV_ID, name: 'Default Env' }),
    getConfig: sinon.stub().resolves({
      model: 'claude-3-5-sonnet-20241022',
      systemPrompt: '',
      mcpServers: [],
      tools: [],
    }),
    updateConfig: sinon.stub().resolves({
      model: 'claude-3-5-sonnet-20241022',
      systemPrompt: '',
      mcpServers: [],
      tools: [],
    }),
    provisionIntegration: sinon
      .stub()
      .resolves({ credentialsUpdate: { externalEnvironmentId: FAKE_EXTERNAL_ENV_ID }, metadata: {} }),
    deprovisionIntegration: sinon.stub().resolves(),
    ...overrides,
  };
}

describe('Agent MCP Server endpoints #novu-v2', () => {
  let session: UserSession;
  let mockProvider: ReturnType<typeof buildMockProvider>;
  const createdAgentIdentifiers: string[] = [];
  const createdIntegrationIds: string[] = [];

  const previousConversationalAgentsFlag = process.env.IS_CONVERSATIONAL_AGENTS_ENABLED;
  const previousManagedRuntimeFlag = process.env.IS_MANAGED_AGENT_RUNTIME_ENABLED;

  before(() => {
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
    process.env.IS_MANAGED_AGENT_RUNTIME_ENABLED = 'true';
  });

  after(() => {
    if (previousConversationalAgentsFlag === undefined) {
      delete process.env.IS_CONVERSATIONAL_AGENTS_ENABLED;
    } else {
      process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = previousConversationalAgentsFlag;
    }
    if (previousManagedRuntimeFlag === undefined) {
      delete process.env.IS_MANAGED_AGENT_RUNTIME_ENABLED;
    } else {
      process.env.IS_MANAGED_AGENT_RUNTIME_ENABLED = previousManagedRuntimeFlag;
    }
  });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    mockProvider = buildMockProvider();
    sinon.stub(AgentRuntimeFactoryModule, 'getAgentRuntimeProvider').returns(mockProvider as never);
  });

  afterEach(async () => {
    sinon.restore();

    for (const identifier of createdAgentIdentifiers) {
      await session.testAgent.delete(`/v1/agents/${encodeURIComponent(identifier)}`).catch(() => {});
    }
    createdAgentIdentifiers.length = 0;

    for (const id of createdIntegrationIds) {
      await integrationRepository.delete({ _id: id, _organizationId: session.organization._id }).catch(() => {});
    }
    createdIntegrationIds.length = 0;
  });

  async function createAgentRuntimeIntegration(): Promise<string> {
    const res = await session.testAgent.post('/v1/integrations').send({
      providerId: AgentRuntimeProviderIdEnum.Anthropic,
      kind: IntegrationKindEnum.AGENT,
      credentials: { apiKey: FAKE_API_KEY },
      active: true,
      name: `anthropic-mcp-e2e-${Date.now()}`,
    });

    expect(res.status, `createAgentRuntimeIntegration failed: ${JSON.stringify(res.body)}`).to.equal(201);
    const integrationId: string = res.body._id ?? res.body.data?._id ?? res.body.data?.id;
    createdIntegrationIds.push(integrationId);

    return integrationId;
  }

  async function createManagedAgent(): Promise<{ identifier: string; agentId: string }> {
    const integrationId = await createAgentRuntimeIntegration();
    const identifier = `e2e-mcp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    createdAgentIdentifiers.push(identifier);

    const res = await session.testAgent.post('/v1/agents').send({
      name: 'MCP E2E Agent',
      identifier,
      runtime: 'managed',
      managedRuntime: { providerId: AgentRuntimeProviderIdEnum.Anthropic, integrationId },
    });

    expect(res.status).to.equal(201);
    const agentId: string = res.body.data._id;

    return { identifier, agentId };
  }

  describe('POST /v1/agents/:identifier/mcp-servers', () => {
    it('writes an enablement row and projects the new set onto the provider', async () => {
      const { identifier, agentId } = await createManagedAgent();

      const res = await session.testAgent
        .post(`/v1/agents/${encodeURIComponent(identifier)}/mcp-servers`)
        .send({ mcpId: 'slack' });

      expect(res.status).to.equal(201);
      expect(res.body.data.mcpId).to.equal('slack');
      expect(res.body.data.enabled).to.equal(true);
      expect(res.body.data.defaultScope).to.equal(McpConnectionScopeEnum.AgentMcpSubscriber);

      const row = await agentMcpServerRepository.findByAgentAndMcpId({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        agentId,
        mcpId: 'slack',
      });
      expect(row, 'agent_mcp_server row should be created').to.exist;
      expect(row!.status).to.equal('active');

      // Provider sync called with the resolved catalog projection.
      const updateConfigCall = mockProvider.updateConfig.firstCall;
      expect(mockProvider.updateConfig.calledOnce, 'updateConfig should be called once').to.be.true;
      expect(updateConfigCall.args[1].mcpServers).to.deep.include({
        externalId: 'Slack',
        name: 'Slack',
        url: 'https://mcp.slack.com/mcp',
      });
    });

    it('returns 409 when the same MCP is already enabled and healthy', async () => {
      const { identifier } = await createManagedAgent();

      const first = await session.testAgent
        .post(`/v1/agents/${encodeURIComponent(identifier)}/mcp-servers`)
        .send({ mcpId: 'slack' });
      expect(first.status).to.equal(201);

      const second = await session.testAgent
        .post(`/v1/agents/${encodeURIComponent(identifier)}/mcp-servers`)
        .send({ mcpId: 'slack' });
      expect(second.status).to.equal(409);
    });

    it('returns 400 for an unknown catalog mcpId', async () => {
      const { identifier } = await createManagedAgent();

      const res = await session.testAgent
        .post(`/v1/agents/${encodeURIComponent(identifier)}/mcp-servers`)
        .send({ mcpId: 'this-mcp-does-not-exist' });

      expect(res.status).to.equal(400);
    });

    it('marks the row as error when provider sync fails, and allows retry', async () => {
      const { identifier, agentId } = await createManagedAgent();
      mockProvider.updateConfig.rejects(new Error('Provider is unavailable'));

      const failed = await session.testAgent
        .post(`/v1/agents/${encodeURIComponent(identifier)}/mcp-servers`)
        .send({ mcpId: 'slack' });
      expect(failed.status).to.be.oneOf([400, 422, 500, 503]);

      const errored = await agentMcpServerRepository.findByAgentAndMcpId({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        agentId,
        mcpId: 'slack',
      });
      expect(errored, 'enablement row should still exist after failed sync').to.exist;
      expect(errored!.status).to.equal('error');
      expect(errored!.lastError, 'lastError should be populated on sync failure').to.exist;

      // Retry — provider works this time. Should reuse the existing row.
      mockProvider.updateConfig.resetBehavior();
      mockProvider.updateConfig.resolves({
        model: 'claude-3-5-sonnet-20241022',
        systemPrompt: '',
        mcpServers: [],
        tools: [],
      });

      const retry = await session.testAgent
        .post(`/v1/agents/${encodeURIComponent(identifier)}/mcp-servers`)
        .send({ mcpId: 'slack' });
      expect(retry.status, 'retry on errored row should succeed').to.equal(201);

      const recovered = await agentMcpServerRepository.findByAgentAndMcpId({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        agentId,
        mcpId: 'slack',
      });
      expect(recovered!.status).to.equal('active');
      expect(recovered!.lastError).to.equal(undefined);
    });
  });

  describe('GET /v1/agents/:identifier/mcp-servers', () => {
    it('returns the per-agent enablement rows', async () => {
      const { identifier } = await createManagedAgent();
      await session.testAgent.post(`/v1/agents/${encodeURIComponent(identifier)}/mcp-servers`).send({ mcpId: 'slack' });
      await session.testAgent
        .post(`/v1/agents/${encodeURIComponent(identifier)}/mcp-servers`)
        .send({ mcpId: 'linear' });

      const res = await session.testAgent.get(`/v1/agents/${encodeURIComponent(identifier)}/mcp-servers`);
      expect(res.status).to.equal(200);
      const rows = res.body.data.data;
      expect(rows.map((r: { mcpId: string }) => r.mcpId)).to.have.members(['slack', 'linear']);
    });
  });

  describe('DELETE /v1/agents/:identifier/mcp-servers/:mcpId', () => {
    it('cascade-deletes mcp_connection rows and removes the enablement', async () => {
      const { identifier, agentId } = await createManagedAgent();
      await session.testAgent.post(`/v1/agents/${encodeURIComponent(identifier)}/mcp-servers`).send({ mcpId: 'slack' });

      const enablement = await agentMcpServerRepository.findByAgentAndMcpId({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        agentId,
        mcpId: 'slack',
      });

      // Seed a fake subscriber connection so we can assert the cascade.
      await mcpConnectionRepository.create({
        _organizationId: session.organization._id,
        _environmentId: session.environment._id,
        scope: McpConnectionScopeEnum.AgentMcpSubscriber,
        mcpId: 'slack',
        _agentMcpServerId: enablement!._id,
        _subscriberId: '507f1f77bcf86cd799439011',
        authMode: McpConnectionAuthModeEnum.Novu,
        status: McpConnectionStatusEnum.Connected,
      });

      const before = await mcpConnectionRepository.findByAgentMcpServer({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        agentMcpServerId: enablement!._id,
      });
      expect(before.length, 'connection should exist before disable').to.equal(1);

      const res = await session.testAgent.delete(`/v1/agents/${encodeURIComponent(identifier)}/mcp-servers/slack`);
      expect(res.status).to.equal(204);

      const removed = await agentMcpServerRepository.findByAgentAndMcpId({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        agentId,
        mcpId: 'slack',
      });
      expect(removed, 'enablement row should be deleted').to.equal(null);

      const after = await mcpConnectionRepository.findByAgentMcpServer({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        agentMcpServerId: enablement!._id,
      });
      expect(after.length, 'subscriber connections should cascade-delete').to.equal(0);
    });

    it('is a no-op when the MCP is not enabled (idempotent disable)', async () => {
      const { identifier } = await createManagedAgent();

      const res = await session.testAgent.delete(`/v1/agents/${encodeURIComponent(identifier)}/mcp-servers/slack`);
      expect(res.status).to.equal(204);
    });
  });

  describe('PATCH /v1/agents/:identifier/runtime/config', () => {
    it('rejects mcpServers in the body to enforce the dedicated endpoint flow', async () => {
      const { identifier } = await createManagedAgent();

      const res = await session.testAgent
        .patch(`/v1/agents/${encodeURIComponent(identifier)}/runtime/config`)
        .send({ mcpServers: [{ externalId: 'Slack', name: 'Slack', url: 'https://mcp.slack.com/mcp' }] });

      expect(res.status).to.equal(400);
      expect(res.body.message ?? res.body.error).to.match(/mcp-servers/i);
    });
  });

  /**
   * MCP-spec OAuth flow tests.
   *
   * The discovery + DCR HTTP calls are stubbed on the shared SSRF outbound
   * helpers (`safeOutboundRequest` / `safeOutboundJsonRequest`), so the
   * authorize-URL endpoint exercises the real `GenerateMcpOAuthUrl` use case
   * including DAL writes and signed-state encoding.
   */
  describe('POST /v1/agents/:identifier/mcp-servers/:mcpId/oauth/url (Sentry, MCP-spec discovery + DCR)', () => {
    const SENTRY_AS_ISSUER = 'https://auth.sentry.dev';
    const SENTRY_AUTHORIZE_URL = 'https://auth.sentry.dev/authorize';
    const SENTRY_TOKEN_URL = 'https://auth.sentry.dev/token';
    const SENTRY_REGISTRATION_URL = 'https://auth.sentry.dev/register';

    let safeRawStub: sinon.SinonStub;
    let safeJsonStub: sinon.SinonStub;
    const previousApiRootUrl = process.env.API_ROOT_URL;

    function buildPrmResponse() {
      return {
        statusCode: 200,
        statusMessage: 'OK',
        headers: { 'content-type': 'application/json' },
        body: {
          resource: 'https://mcp.sentry.dev/mcp',
          authorization_servers: [SENTRY_AS_ISSUER],
          scopes_supported: ['project:read', 'event:read'],
        },
      };
    }

    function buildAsMetadataResponse(issuer = SENTRY_AS_ISSUER, opts: { withRegistration?: boolean } = {}) {
      const withRegistration = opts.withRegistration ?? true;

      return {
        statusCode: 200,
        statusMessage: 'OK',
        headers: { 'content-type': 'application/json' },
        body: {
          issuer,
          authorization_endpoint: `${issuer}/authorize`,
          token_endpoint: `${issuer}/token`,
          ...(withRegistration ? { registration_endpoint: `${issuer}/register` } : {}),
          code_challenge_methods_supported: ['S256'],
          authorization_response_iss_parameter_supported: true,
          scopes_supported: ['project:read', 'event:read'],
        },
      };
    }

    function buildDcrResponse(clientId: string) {
      return {
        statusCode: 201,
        statusMessage: 'Created',
        headers: { 'content-type': 'application/json' },
        body: {
          client_id: clientId,
          client_secret: `secret-for-${clientId}`,
          client_secret_expires_at: 0,
        },
      };
    }

    function build401WithChallenge() {
      return {
        statusCode: 401,
        statusMessage: 'Unauthorized',
        headers: {
          'www-authenticate':
            'Bearer resource_metadata="https://mcp.sentry.dev/.well-known/oauth-protected-resource", scope="project:read"',
        },
        body: Buffer.alloc(0),
      };
    }

    async function enableSentry(identifier: string) {
      const res = await session.testAgent
        .post(`/v1/agents/${encodeURIComponent(identifier)}/mcp-servers`)
        .send({ mcpId: 'sentry' });
      expect(res.status, `enable sentry failed: ${JSON.stringify(res.body)}`).to.equal(201);
    }

    beforeEach(() => {
      process.env.API_ROOT_URL = 'https://api.example.test';

      safeRawStub = sinon.stub(SsrfModule, 'safeOutboundRequest');
      safeJsonStub = sinon.stub(SsrfModule, 'safeOutboundJsonRequest');

      // Default happy path: 401 probe → PRM → AS metadata → DCR registration.
      safeRawStub.resolves(build401WithChallenge());
      safeJsonStub.onCall(0).resolves(buildPrmResponse());
      safeJsonStub.onCall(1).resolves(buildAsMetadataResponse());
      safeJsonStub.onCall(2).resolves(buildDcrResponse('dcr-client-1'));
    });

    afterEach(() => {
      if (previousApiRootUrl === undefined) {
        delete process.env.API_ROOT_URL;
      } else {
        process.env.API_ROOT_URL = previousApiRootUrl;
      }
    });

    it('discovers, registers, and returns an authorize URL with PKCE + resource + state', async () => {
      const { identifier } = await createManagedAgent();
      await enableSentry(identifier);

      const res = await session.testAgent
        .post(`/v1/agents/${encodeURIComponent(identifier)}/mcp-servers/sentry/oauth/url`)
        .send({ subscriberId: session.subscriberId });

      expect(res.status, `oauth/url failed: ${JSON.stringify(res.body)}`).to.equal(201);
      const url = new URL(res.body.data.authorizeUrl);
      expect(`${url.origin}${url.pathname}`).to.equal(SENTRY_AUTHORIZE_URL);
      expect(url.searchParams.get('client_id')).to.equal('dcr-client-1');
      expect(url.searchParams.get('response_type')).to.equal('code');
      expect(url.searchParams.get('code_challenge_method')).to.equal('S256');
      expect(url.searchParams.get('code_challenge')).to.match(/^[A-Za-z0-9_-]{43}$/);
      expect(url.searchParams.get('resource')).to.equal('https://mcp.sentry.dev/mcp');
      expect(url.searchParams.get('redirect_uri')).to.equal('https://api.example.test/v1/agents/mcp/oauth/callback');
      expect(url.searchParams.get('state')).to.have.length.greaterThan(0);
      // Scope from PRM challenge takes priority over scopes_supported.
      expect(url.searchParams.get('scope')).to.equal('project:read');

      const enablement = await agentMcpServerRepository.findOne(
        {
          _environmentId: session.environment._id,
          _organizationId: session.organization._id,
          mcpId: 'sentry',
        },
        '*'
      );
      const subscriber = await subscriberRepository.findBySubscriberId(session.environment._id, session.subscriberId);
      const connection = await mcpConnectionRepository.findSubscriberConnection({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        agentMcpServerId: enablement!._id,
        subscriberId: subscriber!._id,
      });

      expect(connection, 'mcp_connection row should be persisted').to.exist;
      expect(connection!.status).to.equal(McpConnectionStatusEnum.PendingOAuth);
      expect(connection!.authMode).to.equal(McpConnectionAuthModeEnum.Novu);
      expect(connection!.oauthClient, 'oauthClient should be persisted').to.exist;
      expect(connection!.oauthClient!.clientId).to.equal('dcr-client-1');
      expect(connection!.oauthClient!.issuer).to.equal(SENTRY_AS_ISSUER);
      expect(connection!.oauthClient!.tokenEndpoint).to.equal(SENTRY_TOKEN_URL);
      expect(connection!.oauthClient!.authorizationEndpoint).to.equal(SENTRY_AUTHORIZE_URL);
      // The persisted client secret must be encrypted, not plaintext.
      expect(connection!.oauthClient!.clientSecret).to.match(/^nvsk\./);
      expect(connection!.oauthState!.expectedIssuer).to.equal(SENTRY_AS_ISSUER);
      expect(connection!.oauthState!.resource).to.equal('https://mcp.sentry.dev/mcp');
      expect(connection!.oauthState!.pkceVerifier).to.have.length.greaterThan(0);
    });

    it('reuses the persisted DCR client on a second authorize call (no extra /register HTTP call)', async () => {
      const { identifier } = await createManagedAgent();
      await enableSentry(identifier);

      const first = await session.testAgent
        .post(`/v1/agents/${encodeURIComponent(identifier)}/mcp-servers/sentry/oauth/url`)
        .send({ subscriberId: session.subscriberId });
      expect(first.status).to.equal(201);
      const firstClientId = new URL(first.body.data.authorizeUrl).searchParams.get('client_id');
      expect(firstClientId).to.equal('dcr-client-1');

      // Reset call history but keep the PRM + AS metadata responses available.
      // A second authorize call should HIT the cache for PRM + AS metadata
      // AND reuse the persisted oauthClient (no third DCR call).
      const callCountAfterFirst = safeJsonStub.callCount;
      safeJsonStub.resetHistory();
      safeJsonStub.resolves({
        statusCode: 500,
        statusMessage: 'unexpected',
        headers: {},
        body: { error: 'should-not-be-called' },
      });

      const second = await session.testAgent
        .post(`/v1/agents/${encodeURIComponent(identifier)}/mcp-servers/sentry/oauth/url`)
        .send({ subscriberId: session.subscriberId });
      expect(second.status, `second oauth/url failed: ${JSON.stringify(second.body)}`).to.equal(201);
      const secondClientId = new URL(second.body.data.authorizeUrl).searchParams.get('client_id');
      expect(secondClientId).to.equal('dcr-client-1');
      // No extra HTTP discovery or registration calls on the reuse path.
      expect(safeJsonStub.callCount, 'no new HTTP calls expected on reuse').to.equal(0);
      // Sanity: first call did all three discovery+register HTTP roundtrips.
      expect(callCountAfterFirst).to.equal(3);
    });

    // NOTE: issuer-rotation (re-registration on rotated issuer) is exercised
    // in the unit tests for the discovery service. We don't replicate it at
    // the e2e layer because the in-memory PRM/AS-metadata LRU is held by the
    // singleton service instance and can't be evicted from outside the
    // process; doing so reliably would require either an explicit
    // dev/test-only cache-clear endpoint or DI gymnastics that are out of
    // scope here.

    it('refuses to proceed when the AS does not advertise registration_endpoint (mcp_no_dcr_support)', async () => {
      const { identifier } = await createManagedAgent();
      await enableSentry(identifier);

      safeJsonStub.reset();
      safeRawStub.reset();
      safeRawStub.resolves(build401WithChallenge());
      safeJsonStub.onCall(0).resolves(buildPrmResponse());
      safeJsonStub.onCall(1).resolves(buildAsMetadataResponse(SENTRY_AS_ISSUER, { withRegistration: false }));

      const res = await session.testAgent
        .post(`/v1/agents/${encodeURIComponent(identifier)}/mcp-servers/sentry/oauth/url`)
        .send({ subscriberId: session.subscriberId });

      expect(res.status).to.equal(422);
      expect(res.body.error ?? res.body.message).to.match(/mcp_no_dcr_support/i);
    });
  });
});
