import * as SsrfModule from '@novu/application-generic/build/main/utils/ssrf-url-validation';
import {
  AgentMcpServerRepository,
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

import { stubResolveAgentRuntime } from './helpers/stub-resolve-agent-runtime';

const FAKE_API_KEY = 'sk-fake-anthropic-key-for-e2e';
const FAKE_EXTERNAL_AGENT_ID = 'ext-agent-mcp-e2e-123';
const FAKE_EXTERNAL_ENV_ID = 'env_01XJ5McpFakeEnvE2E';

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
    refreshPlatformDefinition: sinon.stub().resolves(undefined),
    updateConfig: sinon.stub().resolves({
      model: 'claude-3-5-sonnet-20241022',
      systemPrompt: '',
      mcpServers: [],
      tools: [],
    }),
    provisionIntegration: sinon.stub().resolves({
      credentialsUpdate: { externalEnvironmentId: FAKE_EXTERNAL_ENV_ID },
      metadata: {},
    }),
    deprovisionIntegration: sinon.stub().resolves(),
    createVault: sinon.stub().resolves({ externalVaultId: 'vlt_subscriber_e2e' }),
    upsertVaultCredential: sinon.stub().resolves({ vaultCredentialId: 'vault-cred-id-mock' }),
    deleteVaultCredential: sinon.stub().resolves(),
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
    stubResolveAgentRuntime(mockProvider);
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
    const integrationId: string | undefined = res.body._id ?? res.body.data?._id ?? res.body.data?.id;
    if (typeof integrationId !== 'string' || !integrationId) {
      throw new Error(`createAgentRuntimeIntegration response missing _id: ${JSON.stringify(res.body)}`);
    }
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
    it('writes an enablement row and reconciles the shared agent without subscriber OAuth MCPs', async () => {
      const { identifier, agentId } = await createManagedAgent();

      const res = await session.testAgent
        .post(`/v1/agents/${encodeURIComponent(identifier)}/mcp-servers`)
        .send({ mcpId: 'linear' });

      expect(res.status).to.equal(201);
      expect(res.body.data.mcpId).to.equal('linear');
      expect(res.body.data.enabled).to.equal(true);
      expect(res.body.data.defaultScope).to.equal(McpConnectionScopeEnum.Subscriber);

      const row = await agentMcpServerRepository.findByAgentAndMcpId({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        agentId,
        mcpId: 'linear',
      });
      expect(row, 'agent_mcp_server row should be created').to.exist;
      expect(row!.status).to.equal('active');
      expect(row!.externalProjection, 'subscriber OAuth rows are session-only').to.equal(undefined);

      const updateConfigCall = mockProvider.updateConfig.firstCall;
      expect(mockProvider.updateConfig.calledOnce, 'updateConfig should be called once').to.be.true;
      expect(updateConfigCall.args[1].mcpServers).to.deep.equal([]);
    });

    it('returns 409 when the same MCP is already enabled and healthy', async () => {
      const { identifier } = await createManagedAgent();

      const first = await session.testAgent
        .post(`/v1/agents/${encodeURIComponent(identifier)}/mcp-servers`)
        .send({ mcpId: 'linear' });
      expect(first.status).to.equal(201);

      const second = await session.testAgent
        .post(`/v1/agents/${encodeURIComponent(identifier)}/mcp-servers`)
        .send({ mcpId: 'linear' });
      expect(second.status).to.equal(409);
    });

    it('returns 400 for an unknown catalog mcpId', async () => {
      const { identifier } = await createManagedAgent();

      const res = await session.testAgent
        .post(`/v1/agents/${encodeURIComponent(identifier)}/mcp-servers`)
        .send({ mcpId: 'this-mcp-does-not-exist' });

      expect(res.status).to.equal(400);
    });

    it('leaves the row syncing when provider reconcile fails for a session-only MCP, and allows retry', async () => {
      const { identifier, agentId } = await createManagedAgent();
      mockProvider.updateConfig.rejects(new Error('Provider is unavailable'));

      const failed = await session.testAgent
        .post(`/v1/agents/${encodeURIComponent(identifier)}/mcp-servers`)
        .send({ mcpId: 'linear' });
      expect(failed.status).to.be.oneOf([400, 422, 500, 503]);

      const stuck = await agentMcpServerRepository.findByAgentAndMcpId({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        agentId,
        mcpId: 'linear',
      });
      expect(stuck, 'enablement row should still exist after failed reconcile').to.exist;
      expect(stuck!.status).to.equal('syncing');
      expect(stuck!.lastError, 'session-only rows are not marked error on reconcile failure').to.equal(undefined);

      mockProvider.updateConfig.resetBehavior();
      mockProvider.updateConfig.resolves({
        model: 'claude-3-5-sonnet-20241022',
        systemPrompt: '',
        mcpServers: [],
        tools: [],
      });

      const retry = await session.testAgent
        .post(`/v1/agents/${encodeURIComponent(identifier)}/mcp-servers`)
        .send({ mcpId: 'linear' });
      expect(retry.status, 'retry on syncing row should succeed').to.equal(201);

      const recovered = await agentMcpServerRepository.findByAgentAndMcpId({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        agentId,
        mcpId: 'linear',
      });
      expect(recovered!.status).to.equal('active');
      expect(recovered!.lastError).to.equal(undefined);
    });
  });

  describe('GET /v1/agents/:identifier/mcp-servers', () => {
    it('returns the per-agent enablement rows', async () => {
      const { identifier } = await createManagedAgent();
      await session.testAgent
        .post(`/v1/agents/${encodeURIComponent(identifier)}/mcp-servers`)
        .send({ mcpId: 'linear' });
      await session.testAgent
        .post(`/v1/agents/${encodeURIComponent(identifier)}/mcp-servers`)
        .send({ mcpId: 'sentry' });

      const res = await session.testAgent.get(`/v1/agents/${encodeURIComponent(identifier)}/mcp-servers`);
      expect(res.status).to.equal(200);
      // ResponseInterceptor flattens `{ data: [...] }` (no `_id`/`id`) by
      // spreading the result, so the final body is `{ data: [...] }` — not
      // the double-wrapped `{ data: { data: [...] } }` that paginated DTOs
      // produce. Same shape as every other test in this file.
      const rows = res.body.data;
      expect(rows.map((r: { mcpId: string }) => r.mcpId)).to.have.members(['linear', 'sentry']);
    });
  });

  describe('PUT /v1/agents/:identifier/mcp-servers (bulk set)', () => {
    type EnablementResponse = { mcpId: string; enabled: boolean; status: string };
    type SetMcpsResponseBody = {
      data: EnablementResponse[];
      failed: Array<{ mcpId: string; operation: 'enable' | 'disable'; code: string; message: string }>;
    };

    async function putDesired(identifier: string, mcpIds: string[]) {
      return session.testAgent.put(`/v1/agents/${encodeURIComponent(identifier)}/mcp-servers`).send({ mcpIds });
    }

    async function findEnabledIds(agentId: string): Promise<string[]> {
      const rows = await agentMcpServerRepository.findByAgent({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        agentId,
        enabledOnly: true,
      });

      return rows.map((r) => r.mcpId).sort();
    }

    it('enables every id in the desired set on a fresh agent', async () => {
      const { identifier, agentId } = await createManagedAgent();

      const res = await putDesired(identifier, ['linear', 'sentry']);

      expect(res.status, `bulk PUT failed: ${JSON.stringify(res.body)}`).to.equal(200);
      const body = res.body as SetMcpsResponseBody;
      expect(body.failed).to.deep.equal([]);
      expect(body.data.map((r) => r.mcpId).sort()).to.deep.equal(['linear', 'sentry']);
      expect(body.data.every((r) => r.enabled)).to.equal(true);

      expect(await findEnabledIds(agentId)).to.deep.equal(['linear', 'sentry']);
      // Sync ran per enable (sequential orchestration today); the post-batch
      // assertion that matters is that the upstream saw the final set at
      // least once.
      expect(mockProvider.updateConfig.callCount, 'updateConfig should run for each enable').to.be.greaterThan(0);
      const lastCallProjection = mockProvider.updateConfig.lastCall.args[1].mcpServers as Array<{ externalId: string }>;
      expect(lastCallProjection).to.deep.equal([]);
    });

    it('disables every currently-enabled id when the desired set is empty', async () => {
      const { identifier, agentId } = await createManagedAgent();
      await putDesired(identifier, ['linear', 'sentry']);

      const res = await putDesired(identifier, []);

      expect(res.status, `bulk PUT failed: ${JSON.stringify(res.body)}`).to.equal(200);
      const body = res.body as SetMcpsResponseBody;
      expect(body.failed).to.deep.equal([]);
      expect(body.data).to.deep.equal([]);
      expect(await findEnabledIds(agentId)).to.deep.equal([]);
    });

    it('is a no-op when the desired set already matches the current set', async () => {
      const { identifier, agentId } = await createManagedAgent();
      await putDesired(identifier, ['linear']);
      const callsBeforeNoop = mockProvider.updateConfig.callCount;

      const res = await putDesired(identifier, ['linear']);

      expect(res.status).to.equal(200);
      const body = res.body as SetMcpsResponseBody;
      expect(body.failed).to.deep.equal([]);
      expect(body.data.map((r) => r.mcpId)).to.deep.equal(['linear']);
      expect(await findEnabledIds(agentId)).to.deep.equal(['linear']);
      // Nothing in the diff → no further enable/disable usecase calls → no
      // extra sync round-trip.
      expect(mockProvider.updateConfig.callCount, 'no-op PUT should not trigger another sync').to.equal(
        callsBeforeNoop
      );
    });

    it('applies enables and disables together when the desired set differs from current', async () => {
      const { identifier, agentId } = await createManagedAgent();
      await putDesired(identifier, ['linear', 'sentry']);

      // Swap: drop linear, keep sentry (no-op for sentry), add notion.
      const res = await putDesired(identifier, ['sentry', 'notion']);

      expect(res.status).to.equal(200);
      const body = res.body as SetMcpsResponseBody;
      expect(body.failed).to.deep.equal([]);
      expect(body.data.map((r) => r.mcpId).sort()).to.deep.equal(['notion', 'sentry']);
      expect(await findEnabledIds(agentId)).to.deep.equal(['notion', 'sentry']);
    });

    it('rejects the whole request with 400 when any id is not in the catalog (no partial writes)', async () => {
      const { identifier, agentId } = await createManagedAgent();
      await putDesired(identifier, ['linear']);

      const res = await putDesired(identifier, ['linear', 'this-mcp-does-not-exist', 'sentry']);

      expect(res.status).to.equal(400);
      // Pre-existing enablement must be untouched and the never-seen ids
      // must not have been partially written.
      expect(await findEnabledIds(agentId)).to.deep.equal(['linear']);
    });

    it('rejects the request with 422 when the same id is listed twice (ArrayUnique DTO validation)', async () => {
      // DTO-level class-validator failures route through Nest's
      // ValidationPipe which the API configures with
      // `errorHttpStatusCode: 422`. That's why this is 422 while the
      // usecase-thrown "unknown catalog id" case above is 400 — different
      // gates, different mappings.
      const { identifier } = await createManagedAgent();

      const res = await putDesired(identifier, ['linear', 'linear']);

      expect(res.status).to.equal(422);
    });

    it('returns 404 when the agent does not exist', async () => {
      const res = await session.testAgent
        .put(`/v1/agents/agent-does-not-exist/mcp-servers`)
        .send({ mcpIds: ['linear'] });

      expect(res.status).to.equal(404);
    });

    it('collects per-row failures into `failed[]` while still surfacing the persisted converged state', async () => {
      const { identifier, agentId } = await createManagedAgent();

      // Force the *second* upstream projection to fail: first call (the
      // initial linear enable as part of this PUT) succeeds, the second
      // call (sentry enable) trips an upstream error. The bulk usecase
      // must catch it and record the failure without aborting the rest
      // of the batch.
      mockProvider.updateConfig.onCall(1).rejects(new Error('Provider is unavailable'));

      const res = await putDesired(identifier, ['linear', 'sentry']);

      expect(res.status).to.equal(200);
      const body = res.body as SetMcpsResponseBody;

      expect(body.failed).to.have.length(1);
      expect(body.failed[0].mcpId).to.equal('sentry');
      expect(body.failed[0].operation).to.equal('enable');
      expect(body.failed[0].code).to.be.a('string').that.is.not.empty;
      expect(body.failed[0].message).to.be.a('string').that.is.not.empty;

      // `data` mirrors the persisted state. Linear was enabled before sentry's
      // reconcile failed; session-only rows are not marked error when the
      // shared-agent projection call fails.
      expect(body.data.map((r) => r.mcpId).sort()).to.deep.equal(['linear', 'sentry']);
      const linearRow = body.data.find((r) => r.mcpId === 'linear');
      const sentryRow = body.data.find((r) => r.mcpId === 'sentry');
      expect(linearRow?.status).to.equal('active');
      expect(sentryRow?.status).to.equal('syncing');

      expect(await findEnabledIds(agentId)).to.deep.equal(['linear', 'sentry']);

      const erroredSentry = await agentMcpServerRepository.findByAgentAndMcpId({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        agentId,
        mcpId: 'sentry',
      });
      expect(erroredSentry, 'sentry row should still exist after failed enable').to.exist;
      expect(erroredSentry!.status).to.equal('syncing');
      expect(erroredSentry!.lastError, 'session-only rows are not marked error on reconcile failure').to.equal(
        undefined
      );
    });
  });

  describe('DELETE /v1/agents/:identifier/mcp-servers/:mcpId', () => {
    it('cascade-deletes mcp_connection rows and removes the enablement', async () => {
      const { identifier, agentId } = await createManagedAgent();
      await session.testAgent
        .post(`/v1/agents/${encodeURIComponent(identifier)}/mcp-servers`)
        .send({ mcpId: 'linear' });

      const enablement = await agentMcpServerRepository.findByAgentAndMcpId({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        agentId,
        mcpId: 'linear',
      });

      // Seed a fake subscriber connection so we can assert the cascade.
      await mcpConnectionRepository.create({
        _organizationId: session.organization._id,
        _environmentId: session.environment._id,
        scope: McpConnectionScopeEnum.Subscriber,
        mcpId: 'linear',
        _agentMcpServerId: enablement!._id,
        _subscriberId: '507f1f77bcf86cd799439011',
        authMode: McpConnectionAuthModeEnum.Dcr,
        status: McpConnectionStatusEnum.Connected,
      });

      const before = await mcpConnectionRepository.findByAgentMcpServer({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        agentMcpServerId: enablement!._id,
      });
      expect(before.length, 'connection should exist before disable').to.equal(1);

      const res = await session.testAgent.delete(`/v1/agents/${encodeURIComponent(identifier)}/mcp-servers/linear`);
      expect(res.status).to.equal(204);

      const removed = await agentMcpServerRepository.findByAgentAndMcpId({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        agentId,
        mcpId: 'linear',
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

      const res = await session.testAgent.delete(`/v1/agents/${encodeURIComponent(identifier)}/mcp-servers/linear`);
      expect(res.status).to.equal(204);
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
      //
      // URL-routed instead of call-index based because `McpOAuthDiscoveryService`
      // holds singleton PRM + AS-metadata LRU caches that survive across tests
      // (we can't reach into the running process to evict). A prior test that
      // warmed the cache for the same `sentry` MCP would skip the PRM / AS-metadata
      // requests entirely, shifting `onCall(0)` from the PRM endpoint onto the
      // DCR endpoint and serving a PRM-shaped body where a DCR body is expected.
      // Routing by `args.url` substring keeps each call deterministic regardless
      // of cache state, while still letting individual tests stub specific
      // responses via `safeJsonStub.onCall(N)` overrides.
      safeRawStub.resolves(build401WithChallenge());
      safeJsonStub.callsFake((args: { url: string }) => {
        if (args.url.includes('/.well-known/oauth-protected-resource')) {
          return Promise.resolve(buildPrmResponse());
        }
        if (args.url.includes('/.well-known/oauth-authorization-server')) {
          return Promise.resolve(buildAsMetadataResponse());
        }
        if (args.url.endsWith('/register')) {
          return Promise.resolve(buildDcrResponse('dcr-client-1'));
        }

        return Promise.resolve({
          statusCode: 500,
          statusMessage: 'unhandled stub url',
          headers: {},
          body: { error: 'unhandled_stub_url', url: args.url },
        });
      });
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

      expect(res.status, `oauth/url failed: ${JSON.stringify(res.body)}`).to.equal(200);
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
      expect(connection!.authMode).to.equal(McpConnectionAuthModeEnum.Dcr);
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
      expect(first.status).to.equal(200);
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
      expect(second.status, `second oauth/url failed: ${JSON.stringify(second.body)}`).to.equal(200);
      const secondClientId = new URL(second.body.data.authorizeUrl).searchParams.get('client_id');
      expect(secondClientId).to.equal('dcr-client-1');
      // No extra HTTP discovery or registration calls on the reuse path.
      expect(safeJsonStub.callCount, 'no new HTTP calls expected on reuse').to.equal(0);
      // Sanity: the first call performed outbound discovery/registration work.
      // Allowing >0 (rather than == 3) keeps the test cache-safe: this suite
      // shares the singleton in-memory PRM/AS-metadata LRU, so a sibling
      // describe can prime the cache and cut the cold-start roundtrips.
      expect(callCountAfterFirst).to.be.greaterThan(0);
    });

    // NOTE: issuer-rotation (re-registration on rotated issuer) AND the
    // "AS advertises no registration_endpoint → mcp_no_dcr_support" path are
    // exercised in the unit tests for the discovery service. They aren't
    // replicated here at the e2e layer because the in-memory PRM/AS-metadata
    // LRU is held by the singleton service instance and can't be evicted
    // from outside the process: an earlier test in this describe block warms
    // both caches with the standard WITH-registration AS metadata, and any
    // sibling test that tries to stub a different AS metadata shape for the
    // same MCP simply hits the warm cache instead. Doing it reliably would
    // require either an explicit dev-mode cache-clear endpoint
    // (test-scoped) or DI gymnastics that are out of scope here.
    it.skip('refuses to proceed when the AS does not advertise registration_endpoint (mcp_no_dcr_support)', () => {
      // Intentionally skipped; covered by unit tests for `McpOAuthDiscoveryService`.
    });
  });

  /**
   * novu-app branch (GitHub) — Novu's pre-registered OAuth app.
   *
   * Differs from the DCR branch in three important places:
   *   1. AS metadata discovery is SKIPPED entirely; endpoints come from the
   *      catalog. The PRM probe still runs but failure is non-fatal.
   *   2. No `oauthClient` row is persisted; the AS endpoints land on
   *      `oauthState` instead, and the credentials come from env vars
   *      resolved per request.
   *   3. The callback maps a small set of upstream errors onto specific
   *      `lastError.code` values (`mcp_user_denied`, `mcp_github_org_block`,
   *      `mcp_app_not_installed`).
   */
  describe('GitHub novu-app branch', () => {
    const previousFlag = process.env.IS_MCP_NOVU_APP_ENABLED;
    const previousClientId = process.env.NOVU_GITHUB_MCP_APP_CLIENT_ID;
    const previousClientSecret = process.env.NOVU_GITHUB_MCP_APP_CLIENT_SECRET;
    const previousApiRootUrl = process.env.API_ROOT_URL;

    let safeJsonStub: sinon.SinonStub;

    function build401Probe() {
      return {
        statusCode: 401,
        statusMessage: 'Unauthorized',
        headers: {
          'www-authenticate': 'Bearer realm="github"',
        },
        body: Buffer.alloc(0),
      };
    }

    async function enableGithub(identifier: string) {
      const res = await session.testAgent
        .post(`/v1/agents/${encodeURIComponent(identifier)}/mcp-servers`)
        .send({ mcpId: 'github' });
      expect(res.status, `enable github failed: ${JSON.stringify(res.body)}`).to.equal(201);
    }

    beforeEach(() => {
      process.env.IS_MCP_NOVU_APP_ENABLED = 'true';
      process.env.NOVU_GITHUB_MCP_APP_CLIENT_ID = 'Iv23livefakeclientid';
      process.env.NOVU_GITHUB_MCP_APP_CLIENT_SECRET = 'ghs_fakeclientsecret';
      process.env.API_ROOT_URL = 'https://api.example.test';

      // PRM probe attempt is non-fatal; default to a 401 with no usable
      // resource_metadata so the use case falls back to the catalog. PRM
      // well-known URL fetches return 404 → null PRM → catalog fallback.
      // For the github MCP URL the discovery service's internal LRU might
      // already be primed by a sibling test; either way the use case
      // synthesises PRM from the catalog when no PRM is available.
      sinon.stub(SsrfModule, 'safeOutboundRequest').resolves(build401Probe());
      safeJsonStub = sinon.stub(SsrfModule, 'safeOutboundJsonRequest').resolves({
        statusCode: 404,
        statusMessage: 'Not Found',
        headers: {},
        body: { error: 'not_found' },
      });
    });

    afterEach(() => {
      if (previousFlag === undefined) {
        delete process.env.IS_MCP_NOVU_APP_ENABLED;
      } else {
        process.env.IS_MCP_NOVU_APP_ENABLED = previousFlag;
      }
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
      if (previousApiRootUrl === undefined) {
        delete process.env.API_ROOT_URL;
      } else {
        process.env.API_ROOT_URL = previousApiRootUrl;
      }
    });

    it('returns 403 with mcp_novu_app_disabled when the feature flag is off (enable)', async () => {
      delete process.env.IS_MCP_NOVU_APP_ENABLED;
      const { identifier } = await createManagedAgent();

      const res = await session.testAgent
        .post(`/v1/agents/${encodeURIComponent(identifier)}/mcp-servers`)
        .send({ mcpId: 'github' });

      expect(res.status).to.equal(403);
      // The signed response body matches the structured Nest exception body
      // we throw in `enable-agent-mcp-server.usecase.ts`.
      expect(res.body.error ?? res.body.data?.error).to.equal('mcp_novu_app_disabled');
    });

    it('returns 403 with mcp_novu_app_disabled at authorize-URL gen if the flag flips off after enable', async () => {
      // Enable first (flag ON), then flip the flag, then try to authorize.
      // Mirrors the operational scenario where an org gets ramped on, then
      // off mid-rollout. The gate must fire BOTH places, not just enable.
      const { identifier } = await createManagedAgent();
      await enableGithub(identifier);
      delete process.env.IS_MCP_NOVU_APP_ENABLED;

      const res = await session.testAgent
        .post(`/v1/agents/${encodeURIComponent(identifier)}/mcp-servers/github/oauth/url`)
        .send({ subscriberId: session.subscriberId });

      expect(res.status).to.equal(403);
      expect(res.body.error ?? res.body.data?.error).to.equal('mcp_novu_app_disabled');
    });

    it('authorize URL gen does NOT probe LD or env when the agent does not exist (info-disclosure regression guard)', async () => {
      // M1 fix: the flag/credentials check moved to AFTER agent + enablement
      // validation, so probing nonexistent agents must surface 404 instead
      // of leaking 403/422 from the catalog-mode check. Without the fix this
      // returned 422 mcp_novu_app_credentials_missing when env was unset.
      delete process.env.NOVU_GITHUB_MCP_APP_CLIENT_ID;
      delete process.env.NOVU_GITHUB_MCP_APP_CLIENT_SECRET;

      const res = await session.testAgent
        .post(`/v1/agents/agent-does-not-exist/mcp-servers/github/oauth/url`)
        .send({ subscriberId: session.subscriberId });

      expect(res.status).to.equal(404);
    });

    it('generates an authorize URL with pinned catalog scopes, resource, PKCE, and persists novu-app state', async () => {
      const { identifier } = await createManagedAgent();
      await enableGithub(identifier);

      const res = await session.testAgent
        .post(`/v1/agents/${encodeURIComponent(identifier)}/mcp-servers/github/oauth/url`)
        .send({ subscriberId: session.subscriberId });

      expect(res.status, `oauth/url failed: ${JSON.stringify(res.body)}`).to.equal(200);
      const url = new URL(res.body.data.authorizeUrl);
      expect(`${url.origin}${url.pathname}`).to.equal('https://github.com/login/oauth/authorize');
      expect(url.searchParams.get('client_id')).to.equal('Iv23livefakeclientid');
      expect(url.searchParams.get('response_type')).to.equal('code');
      expect(url.searchParams.get('code_challenge_method')).to.equal('S256');
      expect(url.searchParams.get('code_challenge')).to.match(/^[A-Za-z0-9_-]{43}$/);
      expect(url.searchParams.get('redirect_uri')).to.equal('https://api.example.test/v1/agents/mcp/oauth/callback');
      // PRM probe failed; falls back to catalog. `resource` defaults to the
      // catalog URL when PRM produced no `resource` value.
      expect(url.searchParams.get('resource')).to.equal('https://api.githubcopilot.com/mcp/');
      // Scopes mirror the catalog (no PRM challenge_scopes here).
      expect(url.searchParams.get('scope')).to.equal(
        'repo read:org read:user user:email read:packages write:packages read:project project gist notifications workflow codespace'
      );

      const enablement = await agentMcpServerRepository.findOne(
        {
          _environmentId: session.environment._id,
          _organizationId: session.organization._id,
          mcpId: 'github',
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
      expect(connection!.authMode).to.equal(McpConnectionAuthModeEnum.NovuApp);
      // novu-app rows MUST NOT persist a long-lived oauthClient — the
      // credentials come from env vars at callback time instead.
      expect(connection!.oauthClient, 'oauthClient must NOT be persisted for novu-app').to.equal(undefined);
      expect(connection!.oauthState!.expectedIssuer).to.equal('https://github.com');
      expect(connection!.oauthState!.tokenEndpoint).to.equal('https://github.com/login/oauth/access_token');
      expect(connection!.oauthState!.authorizationEndpoint).to.equal('https://github.com/login/oauth/authorize');
      expect(connection!.oauthState!.pkceVerifier).to.have.length.greaterThan(0);
    });

    it('returns 422 with mcp_novu_app_credentials_missing when env vars are unset', async () => {
      delete process.env.NOVU_GITHUB_MCP_APP_CLIENT_ID;
      delete process.env.NOVU_GITHUB_MCP_APP_CLIENT_SECRET;
      const { identifier } = await createManagedAgent();
      await enableGithub(identifier);

      const res = await session.testAgent
        .post(`/v1/agents/${encodeURIComponent(identifier)}/mcp-servers/github/oauth/url`)
        .send({ subscriberId: session.subscriberId });

      expect(res.status).to.equal(422);
      expect(res.body.error ?? res.body.data?.error).to.equal('mcp_novu_app_credentials_missing');
    });

    /**
     * Callback-side tests. Workflow:
     *  1. enable + authorize (gives us a signed `state`).
     *  2. Re-program `safeJsonStub` URL-routed so the token-endpoint POST
     *     returns the per-test response shape; PRM well-known fetches
     *     continue to 404 (catalog fallback).
     *  3. Issue `GET /v1/agents/mcp/oauth/callback?state=…&code=…[&error=…]`
     *     and inspect the persisted row.
     *
     * The token endpoint POST goes through the same `safeOutboundJsonRequest`
     * stub as PRM, so we route by URL substring.
     */
    async function authorizeAndCaptureState(): Promise<{ identifier: string; agentId: string; state: string }> {
      const { identifier, agentId } = await createManagedAgent();
      await enableGithub(identifier);
      const res = await session.testAgent
        .post(`/v1/agents/${encodeURIComponent(identifier)}/mcp-servers/github/oauth/url`)
        .send({ subscriberId: session.subscriberId });
      expect(res.status, `authorize URL failed: ${JSON.stringify(res.body)}`).to.equal(200);
      const url = new URL(res.body.data.authorizeUrl);
      const state = url.searchParams.get('state');
      expect(state, 'state must be on the authorize URL').to.be.a('string').that.is.not.empty;

      return { identifier, agentId, state: state as string };
    }

    function routeJsonStub(perEndpoint: { tokenEndpoint?: unknown }) {
      safeJsonStub.callsFake((args: { url: string }) => {
        if (args.url.includes('/login/oauth/access_token') && perEndpoint.tokenEndpoint) {
          return Promise.resolve(perEndpoint.tokenEndpoint);
        }
        if (args.url.includes('/.well-known/oauth-protected-resource')) {
          return Promise.resolve({
            statusCode: 404,
            statusMessage: 'Not Found',
            headers: {},
            body: { error: 'not_found' },
          });
        }

        return Promise.resolve({
          statusCode: 500,
          statusMessage: 'unhandled stub url',
          headers: {},
          body: { error: 'unhandled_stub_url', url: args.url },
        });
      });
    }

    async function findGithubConnection(agentId: string) {
      const enablement = await agentMcpServerRepository.findByAgentAndMcpId({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        agentId,
        mcpId: 'github',
      });
      const subscriber = await subscriberRepository.findBySubscriberId(session.environment._id, session.subscriberId);

      return mcpConnectionRepository.findSubscriberConnection({
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        agentMcpServerId: enablement!._id,
        subscriberId: subscriber!._id,
      });
    }

    it('callback happy path → status=connected, authMode=novu-app, vault upsert called, no oauthClient on row', async () => {
      const { agentId, state } = await authorizeAndCaptureState();
      const updateConfigCallsBeforeCallback = mockProvider.updateConfig.callCount;

      routeJsonStub({
        tokenEndpoint: {
          statusCode: 200,
          statusMessage: 'OK',
          headers: { 'content-type': 'application/json' },
          body: {
            access_token: 'gho_fake-access',
            refresh_token: 'ghr_fake-refresh',
            expires_in: 28_800,
            token_type: 'bearer',
            scope: 'repo read:org',
          },
        },
      });

      const cb = await session.testAgent.get(
        `/v1/agents/mcp/oauth/callback?state=${encodeURIComponent(state)}&code=fake-auth-code`
      );
      // The callback always renders a self-contained "flow complete" HTML page
      // (no dashboard redirect); the assertion that matters is the row state.
      expect(cb.status, `unexpected callback status (body=${JSON.stringify(cb.body)})`).to.equal(200);
      expect(cb.text, 'callback should render the success page').to.include('Connection complete');

      const conn = await findGithubConnection(agentId);
      expect(conn, 'mcp_connection row should exist').to.exist;
      expect(conn!.status).to.equal(McpConnectionStatusEnum.Connected);
      expect(conn!.authMode).to.equal(McpConnectionAuthModeEnum.NovuApp);
      expect(conn!.oauthClient, 'novu-app rows must NEVER persist an oauthClient').to.equal(undefined);
      expect(conn!.oauthState, 'oauthState should be cleared on connected transition').to.equal(undefined);
      expect(conn!.auth, 'encrypted auth blob should be persisted').to.exist;
      expect(conn!.auth!.vaultCredentialId).to.equal('vault-cred-id-mock');

      // Vault push must have been invoked with the ephemeral oauthClient
      // (client_id from env, tokenEndpoint from oauthState) and the resource
      // mirrored from the catalog URL.
      expect(mockProvider.upsertVaultCredential.calledOnce, 'upsertVaultCredential should be called once').to.be.true;
      expect(
        mockProvider.updateConfig.callCount,
        'OAuth callback must not reconcile the shared agent definition'
      ).to.equal(updateConfigCallsBeforeCallback);
      const vaultCall = mockProvider.upsertVaultCredential.firstCall.args[0];
      expect(vaultCall.mcpServerUrl).to.equal('https://api.githubcopilot.com/mcp/');
      expect(vaultCall.displayName).to.equal('GitHub');
      expect(vaultCall.auth.accessToken).to.equal('gho_fake-access');
      expect(vaultCall.auth.refreshToken).to.equal('ghr_fake-refresh');
      expect(vaultCall.auth.oauthClient.clientId).to.equal('Iv23livefakeclientid');
      expect(vaultCall.auth.oauthClient.clientSecret).to.equal('ghs_fakeclientsecret');
      expect(vaultCall.auth.oauthClient.tokenEndpoint).to.equal('https://github.com/login/oauth/access_token');
      expect(vaultCall.auth.oauthClient.resource).to.equal('https://api.githubcopilot.com/mcp/');
    });

    it('callback maps GitHub application_suspended → mcp_github_org_block on lastError', async () => {
      const { agentId, state } = await authorizeAndCaptureState();

      routeJsonStub({
        tokenEndpoint: {
          statusCode: 403,
          statusMessage: 'Forbidden',
          headers: { 'content-type': 'application/json' },
          body: { error: 'application_suspended' },
        },
      });

      const cb = await session.testAgent.get(
        `/v1/agents/mcp/oauth/callback?state=${encodeURIComponent(state)}&code=fake-auth-code`
      );
      expect(cb.status).to.equal(400);

      const conn = await findGithubConnection(agentId);
      expect(conn!.status).to.equal(McpConnectionStatusEnum.Error);
      expect(conn!.lastError?.code).to.equal('mcp_github_org_block');
    });

    it('callback maps GitHub 200-with-inline-error → matching code (bad_verification_code → mcp_token_exchange_failed)', async () => {
      const { agentId, state } = await authorizeAndCaptureState();

      // GitHub's /login/oauth/access_token returns 200 with `{ error: ... }`
      // on token-side failures. Our `inlineProviderError` re-mapping must
      // catch this and route through `markConnectionError`, NOT silently
      // persist a broken connection.
      routeJsonStub({
        tokenEndpoint: {
          statusCode: 200,
          statusMessage: 'OK',
          headers: { 'content-type': 'application/json' },
          body: { error: 'bad_verification_code' },
        },
      });

      const cb = await session.testAgent.get(
        `/v1/agents/mcp/oauth/callback?state=${encodeURIComponent(state)}&code=fake-auth-code`
      );
      expect(cb.status).to.equal(400);

      const conn = await findGithubConnection(agentId);
      expect(conn!.status).to.equal(McpConnectionStatusEnum.Error);
      expect(conn!.lastError?.code).to.equal('mcp_token_exchange_failed');
      expect(conn!.auth, 'no auth blob should be persisted on inline-error response').to.equal(undefined);
    });

    it('callback with ?error=access_denied → mcp_user_denied on lastError (covers the description-suffix concat case)', async () => {
      const { agentId, state } = await authorizeAndCaptureState();

      const cb = await session.testAgent.get(
        `/v1/agents/mcp/oauth/callback?state=${encodeURIComponent(state)}&error=access_denied&error_description=${encodeURIComponent('The user cancelled the consent')}`
      );
      expect(cb.status).to.equal(200);
      expect(cb.text, 'callback should render the error page').to.include('Connection failed');

      const conn = await findGithubConnection(agentId);
      expect(conn!.status).to.equal(McpConnectionStatusEnum.Error);
      // The controller glues `error` and `error_description` together with
      // " - ", and the use case parses the OAuth error token off the head.
      // This test guards against a regression where the description suffix
      // would push the equality check off `'access_denied'`.
      expect(conn!.lastError?.code).to.equal('mcp_user_denied');
    });

    it('callback with creds unset between authorize and callback → 400 with mcp_novu_app_credentials_missing on lastError', async () => {
      const { agentId, state } = await authorizeAndCaptureState();

      delete process.env.NOVU_GITHUB_MCP_APP_CLIENT_ID;
      delete process.env.NOVU_GITHUB_MCP_APP_CLIENT_SECRET;

      const cb = await session.testAgent.get(
        `/v1/agents/mcp/oauth/callback?state=${encodeURIComponent(state)}&code=fake-auth-code`
      );
      // The use case wraps the discovery error as BadRequestException so
      // the controller renders the error fallback page rather than bubbling
      // a 500. The exact status here is 400 (Nest's mapping for
      // BadRequestException). Without the H4 fix this was a 500.
      expect(cb.status).to.equal(400);

      const conn = await findGithubConnection(agentId);
      expect(conn!.status).to.equal(McpConnectionStatusEnum.Error);
      expect(conn!.lastError?.code).to.equal('mcp_novu_app_credentials_missing');
    });

    it('token-exchange uses HTTP Basic for client_secret_basic and carries RFC 8707 resource + PKCE verifier in the body', async () => {
      const { state } = await authorizeAndCaptureState();

      // Capture the POST body so we can assert form-encoded params without
      // mocking a real HTTP server. The route helper returns success.
      routeJsonStub({
        tokenEndpoint: {
          statusCode: 200,
          statusMessage: 'OK',
          headers: { 'content-type': 'application/json' },
          body: {
            access_token: 'gho_fake',
            refresh_token: 'ghr_fake',
            expires_in: 3600,
            token_type: 'bearer',
            scope: 'repo',
          },
        },
      });

      const cb = await session.testAgent.get(
        `/v1/agents/mcp/oauth/callback?state=${encodeURIComponent(state)}&code=fake-auth-code`
      );
      expect(cb.status).to.equal(200);

      const tokenCall = safeJsonStub
        .getCalls()
        .find((c) => (c.args[0] as { url: string }).url.includes('/login/oauth/access_token'));
      expect(tokenCall, 'token endpoint should have been called').to.exist;
      const tokenArgs = tokenCall!.args[0] as { method: string; body: string; headers: Record<string, string> };
      expect(tokenArgs.method).to.equal('POST');
      // novu-app mode reconstructs an ephemeral oauthClient with no
      // `tokenEndpointAuthMethod` persisted, so the callback resolves to
      // the RFC 8414 §2 default of `client_secret_basic` — credentials go
      // into an HTTP Basic header instead of the form body. RFC 6749 §2.3.1
      // also requires URL-encoding the id:secret BEFORE base64; neither of
      // these fake fixture values contains a reserved character, so the
      // expected value is a straight base64 of `id:secret`.
      const expectedBasic = Buffer.from(
        `${encodeURIComponent('Iv23livefakeclientid')}:${encodeURIComponent('ghs_fakeclientsecret')}`,
        'utf8'
      ).toString('base64');
      expect(tokenArgs.headers.Authorization).to.equal(`Basic ${expectedBasic}`);
      const bodyParams = new URLSearchParams(tokenArgs.body);
      expect(bodyParams.get('grant_type')).to.equal('authorization_code');
      // `client_secret_basic` must NOT replay credentials in the form body
      // (RFC 6749 §2.3.1) — that would defeat the whole point of the
      // negotiated header method.
      expect(bodyParams.get('client_id'), 'client_id must not be carried in body for client_secret_basic').to.be.null;
      expect(bodyParams.get('client_secret'), 'client_secret must not be carried in body for client_secret_basic').to.be
        .null;
      expect(bodyParams.get('code')).to.equal('fake-auth-code');
      expect(bodyParams.get('code_verifier')).to.match(/^[A-Za-z0-9_-]{43}$/);
      expect(bodyParams.get('resource')).to.equal('https://api.githubcopilot.com/mcp/');
    });
  });
});
