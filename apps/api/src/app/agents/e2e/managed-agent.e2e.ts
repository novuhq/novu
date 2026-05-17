import {
  AgentRuntimeBadRequestError,
  AgentRuntimeNotFoundError,
  AgentRuntimeRateLimitedError,
  AgentRuntimeUnauthorizedError,
  decryptCredentials,
} from '@novu/application-generic';
// Stub at the source factory module rather than the barrel: TypeScript's `__exportStar` helper
// installs a non-configurable getter on the package barrel, which `sinon.stub` cannot replace.
// The barrel getter reads the property from this source module on every access, so stubbing here
// transparently propagates to both `create-integration.usecase.ts` and `provision-managed-agent.usecase.ts`.
import * as AgentRuntimeFactoryModule from '@novu/application-generic/build/main/agent-runtimes/agent-runtime.factory';
import { AgentRepository, IntegrationRepository } from '@novu/dal';
import { AgentRuntimeProviderIdEnum, IntegrationKindEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';

const FAKE_API_KEY = 'sk-fake-anthropic-key-for-e2e';
const FAKE_EXTERNAL_AGENT_ID = 'ext-agent-e2e-123';
const FAKE_ADOPT_AGENT_ID = 'agent_01XJ5AdoptE2E';
const FAKE_ADOPT_AGENT_NAME = 'My Existing Claude Agent';
const FAKE_EXTERNAL_ENV_ID = 'env_01XJ5FakeEnvE2E';
const FAKE_NEW_EXTERNAL_ENV_ID = 'env_01XJ5NewEnvE2E';

const agentRepository = new AgentRepository();
const integrationRepository = new IntegrationRepository();

function buildMockProvider(overrides: Partial<Record<string, sinon.SinonStub>> = {}) {
  return {
    providerId: AgentRuntimeProviderIdEnum.Anthropic,
    capabilities: { mcpServers: true, tools: true, model: true, systemPrompt: true, skills: true },
    validateCredentials: sinon.stub().resolves(),
    createAgent: sinon.stub().resolves({ externalAgentId: FAKE_EXTERNAL_AGENT_ID }),
    deleteAgent: sinon.stub().resolves(),
    getAgent: sinon.stub().resolves({ externalAgentId: FAKE_ADOPT_AGENT_ID, name: FAKE_ADOPT_AGENT_NAME }),
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

describe('Managed Agents API #novu-v2', () => {
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

  // ─── Helper: create an agent-kind integration via POST /v1/integrations ───

  async function createAgentRuntimeIntegration(overrides: Record<string, unknown> = {}): Promise<string> {
    const res = await session.testAgent.post('/v1/integrations').send({
      providerId: AgentRuntimeProviderIdEnum.Anthropic,
      kind: IntegrationKindEnum.AGENT,
      credentials: { apiKey: FAKE_API_KEY },
      active: true,
      name: `anthropic-runtime-e2e-${Date.now()}`,
      ...overrides,
    });

    expect(res.status, `createAgentRuntimeIntegration failed: ${JSON.stringify(res.body)}`).to.equal(201);
    const integrationId: string = res.body._id ?? res.body.data?._id ?? res.body.data?.id;
    createdIntegrationIds.push(integrationId);

    return integrationId;
  }

  function managedBody(identifier: string, integrationId: string, overrides: Record<string, unknown> = {}) {
    return {
      name: 'Managed E2E Agent',
      identifier,
      runtime: 'managed',
      managedRuntime: {
        providerId: AgentRuntimeProviderIdEnum.Anthropic,
        integrationId,
      },
      ...overrides,
    };
  }

  // ─── POST /v1/integrations — agent-kind provisioning ─────────────────────────

  describe('POST /v1/integrations — agent kind provisioning', () => {
    it('should create an integration and call provisionIntegration on the provider', async () => {
      const res = await session.testAgent.post('/v1/integrations').send({
        providerId: AgentRuntimeProviderIdEnum.Anthropic,
        kind: IntegrationKindEnum.AGENT,
        credentials: { apiKey: FAKE_API_KEY },
        active: true,
        name: `anthropic-provision-test-${Date.now()}`,
      });

      expect(res.status).to.equal(201);
      expect(mockProvider.provisionIntegration.calledOnce, 'provisionIntegration should be called').to.be.true;

      const integrationId: string = res.body._id ?? res.body.data?._id ?? res.body.data?.id;
      createdIntegrationIds.push(integrationId);
    });

    it('should persist externalEnvironmentId in integration credentials after provisioning', async () => {
      const integrationId = await createAgentRuntimeIntegration();

      const integration = await integrationRepository.findOne(
        {
          _id: integrationId,
          _environmentId: session.environment._id,
          _organizationId: session.organization._id,
        },
        ['credentials']
      );

      expect(integration, 'integration should exist').to.exist;
      const decrypted = decryptCredentials(integration.credentials);

      expect(decrypted.externalEnvironmentId, 'externalEnvironmentId should be stored in credentials').to.equal(
        FAKE_EXTERNAL_ENV_ID
      );
    });

    it('should roll back (delete) the integration record when provisionIntegration fails', async () => {
      mockProvider.provisionIntegration.rejects(new Error('Provider is unavailable'));

      const res = await session.testAgent.post('/v1/integrations').send({
        providerId: AgentRuntimeProviderIdEnum.Anthropic,
        kind: IntegrationKindEnum.AGENT,
        credentials: { apiKey: FAKE_API_KEY },
        active: true,
        name: `anthropic-rollback-test-${Date.now()}`,
      });

      expect(res.status).to.be.oneOf([400, 422, 500, 503]);

      // No leftover agent-kind integration records for this environment
      const integrations = await integrationRepository.find({
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        kind: IntegrationKindEnum.AGENT,
      });

      expect(integrations.length, 'no agent-kind integrations should remain after rollback').to.equal(0);
    });

    it('should NOT call provisionIntegration for delivery-kind integrations', async () => {
      await session.testAgent.post('/v1/integrations').send({
        providerId: 'sendgrid',
        channel: 'email',
        credentials: { apiKey: FAKE_API_KEY },
        active: false,
        name: `email-non-agent-${Date.now()}`,
      });

      expect(mockProvider.provisionIntegration.called, 'provisionIntegration should NOT be called').to.be.false;
    });
  });

  // ─── POST /v1/agents — managed runtime ──────────────────────────────────────

  describe('POST /v1/agents — managed runtime', () => {
    it('should create a managed agent using a pre-provisioned integration', async () => {
      const integrationId = await createAgentRuntimeIntegration();
      const identifier = `e2e-managed-${Date.now()}`;
      createdAgentIdentifiers.push(identifier);

      const res = await session.testAgent.post('/v1/agents').send(managedBody(identifier, integrationId));

      expect(res.status).to.equal(201);
      expect(res.body.data.runtime).to.equal('managed');
      expect(res.body.data.managedRuntime).to.exist;
      expect(res.body.data.managedRuntime.providerId).to.equal(AgentRuntimeProviderIdEnum.Anthropic);
      expect(res.body.data.managedRuntime.integrationId).to.equal(integrationId);
      expect(res.body.data.managedRuntime.externalAgentId).to.equal(FAKE_EXTERNAL_AGENT_ID);
    });

    it('should forward model, systemPrompt, tools, and resolved mcpServers to createAgent', async () => {
      const integrationId = await createAgentRuntimeIntegration();
      const identifier = `e2e-managed-full-${Date.now()}`;
      createdAgentIdentifiers.push(identifier);

      await session.testAgent.post('/v1/agents').send(
        managedBody(identifier, integrationId, {
          managedRuntime: {
            providerId: AgentRuntimeProviderIdEnum.Anthropic,
            integrationId,
            model: 'claude-opus-4-5',
            systemPrompt: 'You are a helpful assistant',
            tools: ['web_search'],
            mcpServers: ['slack'],
          },
        })
      );

      expect(mockProvider.createAgent.calledOnce).to.be.true;
      const createAgentArg = mockProvider.createAgent.getCall(0).args[0];

      expect(createAgentArg.model).to.equal('claude-opus-4-5');
      expect(createAgentArg.systemPrompt).to.equal('You are a helpful assistant');
      expect(createAgentArg.tools).to.deep.equal(['web_search']);
      expect(createAgentArg.mcpServers).to.be.an('array').with.length(1);
      expect(createAgentArg.mcpServers[0].name).to.equal('Slack');
      expect(createAgentArg.mcpServers[0].url).to.equal('https://mcp.slack.com/mcp');
    });

    it('should return 422 when runtime=managed but managedRuntime is omitted', async () => {
      const res = await session.testAgent.post('/v1/agents').send({
        name: 'Missing Managed Runtime',
        identifier: `e2e-no-managed-${Date.now()}`,
        runtime: 'managed',
      });

      expect(res.status).to.equal(422);
    });

    it('should return 422 when providerId is not a valid enum value', async () => {
      const res = await session.testAgent.post('/v1/agents').send({
        name: 'Bad Provider',
        identifier: `e2e-bad-provider-${Date.now()}`,
        runtime: 'managed',
        managedRuntime: {
          providerId: 'not-a-real-provider',
          integrationId: '000000000000000000000099',
        },
      });

      expect(res.status).to.equal(422);
    });

    it('should return 404 when the referenced integrationId does not exist', async () => {
      const res = await session.testAgent
        .post('/v1/agents')
        .send(managedBody(`e2e-bad-integ-${Date.now()}`, '000000000000000000000099'));

      expect(res.status).to.equal(404);
    });

    it('should return 401 when the provider rejects credentials during validateCredentials', async () => {
      const integrationId = await createAgentRuntimeIntegration();
      mockProvider.validateCredentials.rejects(
        new AgentRuntimeUnauthorizedError('Invalid API key', AgentRuntimeProviderIdEnum.Anthropic)
      );

      const identifier = `e2e-unauth-${Date.now()}`;
      const res = await session.testAgent.post('/v1/agents').send(managedBody(identifier, integrationId));

      expect(res.status).to.equal(401);
      expect(res.body.code).to.equal('AGENT_RUNTIME_UNAUTHORIZED');
    });

    it('should return 400 and leave no Mongo record when createAgent throws', async () => {
      const integrationId = await createAgentRuntimeIntegration();
      mockProvider.createAgent.rejects(
        new AgentRuntimeBadRequestError('Invalid model name', AgentRuntimeProviderIdEnum.Anthropic)
      );

      const identifier = `e2e-create-fail-${Date.now()}`;
      const res = await session.testAgent.post('/v1/agents').send(managedBody(identifier, integrationId));

      expect(res.status).to.equal(400);
      expect(res.body.code).to.equal('AGENT_RUNTIME_BAD_REQUEST');

      const leftover = await agentRepository.findOne(
        {
          identifier,
          _environmentId: session.environment._id,
          _organizationId: session.organization._id,
        },
        ['_id']
      );

      expect(leftover, 'agent document should have been rolled back').to.equal(null);
    });

    it('should return 409 when creating a managed agent with a duplicate identifier', async () => {
      const integrationId = await createAgentRuntimeIntegration();
      const identifier = `e2e-dup-managed-${Date.now()}`;
      createdAgentIdentifiers.push(identifier);

      await session.testAgent.post('/v1/agents').send(managedBody(identifier, integrationId));

      const second = await session.testAgent.post('/v1/agents').send(managedBody(identifier, integrationId));

      expect(second.status).to.equal(409);
    });

    it('should return 400 and NOT call createAgent when mcpServers contains an unknown catalog ID', async () => {
      const integrationId = await createAgentRuntimeIntegration();
      const identifier = `e2e-bad-mcp-id-${Date.now()}`;

      const res = await session.testAgent.post('/v1/agents').send(
        managedBody(identifier, integrationId, {
          managedRuntime: {
            providerId: AgentRuntimeProviderIdEnum.Anthropic,
            integrationId,
            mcpServers: ['definitely-not-in-the-catalog'],
          },
        })
      );

      expect(res.status).to.equal(400);
      expect(mockProvider.createAgent.called, 'createAgent should NOT be called for an unknown catalog ID').to.be.false;
    });
  });

  // ─── POST /v1/agents — externalEnvironmentId rebinding ─────────────────────
  // When the caller supplies a managedRuntime.externalEnvironmentId that
  // differs from the integration's stored value, the use-case calls the
  // provider's getEnvironment() and persists the *canonical id returned by the
  // provider* back into the integration credentials (not the raw input). When
  // the input matches the stored value, both the lookup and the update are
  // skipped. When the provider rejects the lookup (e.g. unknown env id), no
  // mutation happens and the agent creation is rolled back.
  describe('POST /v1/agents — externalEnvironmentId rebinding', () => {
    it('should persist the canonical id returned by the provider, not the raw input id', async () => {
      const integrationId = await createAgentRuntimeIntegration();
      const identifier = `e2e-rebind-env-${Date.now()}`;
      createdAgentIdentifiers.push(identifier);

      const inputEnvId = 'my-prod-env';
      mockProvider.getEnvironment.resolves({ id: FAKE_NEW_EXTERNAL_ENV_ID, name: 'Production' });

      const res = await session.testAgent.post('/v1/agents').send(
        managedBody(identifier, integrationId, {
          managedRuntime: {
            providerId: AgentRuntimeProviderIdEnum.Anthropic,
            integrationId,
            externalEnvironmentId: inputEnvId,
          },
        })
      );

      expect(res.status).to.equal(201);
      expect(mockProvider.getEnvironment.calledOnce, 'getEnvironment should be called once').to.be.true;
      expect(mockProvider.getEnvironment.getCall(0).args[0]).to.equal(inputEnvId);

      const integration = await integrationRepository.findOne(
        {
          _id: integrationId,
          _environmentId: session.environment._id,
          _organizationId: session.organization._id,
        },
        ['credentials']
      );

      if (!integration) throw new Error('integration should exist after rebinding');
      const decrypted = decryptCredentials(integration.credentials);

      expect(decrypted.externalEnvironmentId, 'stored value should be the provider canonical id').to.equal(
        FAKE_NEW_EXTERNAL_ENV_ID
      );
      expect(decrypted.externalEnvironmentId, 'stored value should NOT be the raw input id').to.not.equal(inputEnvId);
      expect(decrypted.apiKey, 'apiKey must remain intact and decryptable').to.equal(FAKE_API_KEY);
    });

    it('should NOT call getEnvironment and NOT mutate credentials when externalEnvironmentId matches the stored value', async () => {
      const integrationId = await createAgentRuntimeIntegration();
      const identifier = `e2e-rebind-noop-${Date.now()}`;
      createdAgentIdentifiers.push(identifier);

      const res = await session.testAgent.post('/v1/agents').send(
        managedBody(identifier, integrationId, {
          managedRuntime: {
            providerId: AgentRuntimeProviderIdEnum.Anthropic,
            integrationId,
            externalEnvironmentId: FAKE_EXTERNAL_ENV_ID,
          },
        })
      );

      expect(res.status).to.equal(201);
      expect(mockProvider.getEnvironment.called, 'getEnvironment should NOT be called when env id is unchanged').to.be
        .false;

      const integration = await integrationRepository.findOne(
        {
          _id: integrationId,
          _environmentId: session.environment._id,
          _organizationId: session.organization._id,
        },
        ['credentials']
      );

      if (!integration) throw new Error('integration should exist for no-op test');
      const decrypted = decryptCredentials(integration.credentials);
      expect(decrypted.externalEnvironmentId).to.equal(FAKE_EXTERNAL_ENV_ID);
    });

    it('should return 409 AGENT_RUNTIME_DRIFT and leave credentials untouched when getEnvironment rejects with not found', async () => {
      const integrationId = await createAgentRuntimeIntegration();
      const identifier = `e2e-rebind-invalid-${Date.now()}`;

      mockProvider.getEnvironment.rejects(
        new AgentRuntimeNotFoundError('Environment not found on provider', AgentRuntimeProviderIdEnum.Anthropic)
      );

      const res = await session.testAgent.post('/v1/agents').send(
        managedBody(identifier, integrationId, {
          managedRuntime: {
            providerId: AgentRuntimeProviderIdEnum.Anthropic,
            integrationId,
            externalEnvironmentId: 'env_does_not_exist',
          },
        })
      );

      expect(res.status).to.equal(409);
      expect(res.body.code).to.equal('AGENT_RUNTIME_DRIFT');
      expect(mockProvider.getEnvironment.calledOnce).to.be.true;
      expect(mockProvider.createAgent.called, 'createAgent must not run when env lookup fails').to.be.false;

      const integration = await integrationRepository.findOne(
        {
          _id: integrationId,
          _environmentId: session.environment._id,
          _organizationId: session.organization._id,
        },
        ['credentials']
      );

      if (!integration) throw new Error('integration should still exist after env lookup failure');
      const decrypted = decryptCredentials(integration.credentials);

      expect(decrypted.externalEnvironmentId, 'credentials must not be mutated when env lookup fails').to.equal(
        FAKE_EXTERNAL_ENV_ID
      );

      const leftover = await agentRepository.findOne(
        {
          identifier,
          _environmentId: session.environment._id,
          _organizationId: session.organization._id,
        },
        ['_id']
      );

      expect(leftover, 'agent document should be rolled back when env lookup fails').to.equal(null);
    });
  });

  // ─── GET /v1/agents/:identifier/runtime/config ──────────────────────────────

  describe('GET /v1/agents/:identifier/runtime/config', () => {
    it('should return a minimal config (empty mcpServers and tools) for a managed agent', async () => {
      const integrationId = await createAgentRuntimeIntegration();
      const identifier = `e2e-cfg-minimal-${Date.now()}`;
      createdAgentIdentifiers.push(identifier);

      await session.testAgent.post('/v1/agents').send(managedBody(identifier, integrationId));

      const res = await session.testAgent.get(`/v1/agents/${encodeURIComponent(identifier)}/runtime/config`);

      expect(res.status).to.equal(200);
      expect(res.body.data.model).to.be.a('string');
      expect(res.body.data.systemPrompt).to.be.a('string');
      expect(res.body.data.mcpServers).to.be.an('array');
      expect(res.body.data.tools).to.be.an('array');
    });

    it('should return all mcpServer and tool fields exactly as returned by the provider', async () => {
      const integrationId = await createAgentRuntimeIntegration();
      const identifier = `e2e-cfg-full-${Date.now()}`;
      createdAgentIdentifiers.push(identifier);

      await session.testAgent.post('/v1/agents').send(managedBody(identifier, integrationId));

      mockProvider.getConfig.resolves({
        model: 'claude-opus-4-5',
        systemPrompt: 'You are a helpful assistant',
        mcpServers: [
          {
            externalId: 'mcp-1',
            name: 'Slack',
            url: 'https://mcp.slack.com/sse',
          },
        ],
        tools: [
          {
            externalId: 'tool-1',
            name: 'web_search',
            type: 'builtin',
          },
          {
            externalId: 'tool-2',
            name: 'my-custom-tool',
            type: 'custom',
            description: 'does stuff',
          },
        ],
      });

      const res = await session.testAgent.get(`/v1/agents/${encodeURIComponent(identifier)}/runtime/config`);

      expect(res.status).to.equal(200);

      const { model, systemPrompt, mcpServers, tools } = res.body.data;

      expect(model).to.equal('claude-opus-4-5');
      expect(systemPrompt).to.equal('You are a helpful assistant');

      expect(mcpServers).to.have.length(1);
      expect(mcpServers[0].externalId).to.equal('mcp-1');
      expect(mcpServers[0].name).to.equal('Slack');
      expect(mcpServers[0].url).to.equal('https://mcp.slack.com/sse');

      expect(tools).to.have.length(2);
      expect(tools[0].externalId).to.equal('tool-1');
      expect(tools[0].name).to.equal('web_search');
      expect(tools[0].type).to.equal('builtin');

      expect(tools[1].externalId).to.equal('tool-2');
      expect(tools[1].name).to.equal('my-custom-tool');
      expect(tools[1].type).to.equal('custom');
      expect(tools[1].description).to.equal('does stuff');
    });

    it('should return 422 when the agent does not use a managed runtime', async () => {
      const identifier = `e2e-cfg-selfhosted-${Date.now()}`;
      createdAgentIdentifiers.push(identifier);

      await session.testAgent.post('/v1/agents').send({ name: 'Self-Hosted Agent', identifier });

      const res = await session.testAgent.get(`/v1/agents/${encodeURIComponent(identifier)}/runtime/config`);

      expect(res.status).to.equal(422);
    });

    it('should return 404 when the agent identifier does not exist', async () => {
      const res = await session.testAgent.get('/v1/agents/nonexistent-managed-agent/runtime/config');

      expect(res.status).to.equal(404);
    });

    it('should return 409 with code AGENT_RUNTIME_DRIFT when the provider returns not found', async () => {
      const integrationId = await createAgentRuntimeIntegration();
      const identifier = `e2e-cfg-drift-${Date.now()}`;
      createdAgentIdentifiers.push(identifier);

      await session.testAgent.post('/v1/agents').send(managedBody(identifier, integrationId));

      mockProvider.getConfig.rejects(
        new AgentRuntimeNotFoundError('Agent not found on provider', AgentRuntimeProviderIdEnum.Anthropic)
      );

      const res = await session.testAgent.get(`/v1/agents/${encodeURIComponent(identifier)}/runtime/config`);

      expect(res.status).to.equal(409);
      expect(res.body.code).to.equal('AGENT_RUNTIME_DRIFT');
    });
  });

  // ─── PATCH /v1/agents/:identifier/runtime/config ────────────────────────────

  describe('PATCH /v1/agents/:identifier/runtime/config', () => {
    it('should apply a partial update and return the updated config', async () => {
      const integrationId = await createAgentRuntimeIntegration();
      const identifier = `e2e-patch-cfg-${Date.now()}`;
      createdAgentIdentifiers.push(identifier);

      await session.testAgent.post('/v1/agents').send(managedBody(identifier, integrationId));

      mockProvider.updateConfig.resolves({
        model: 'claude-opus-4-5',
        systemPrompt: '',
        mcpServers: [],
        tools: [],
      });

      const res = await session.testAgent
        .patch(`/v1/agents/${encodeURIComponent(identifier)}/runtime/config`)
        .send({ model: 'claude-opus-4-5' });

      expect(res.status).to.equal(200);
      expect(res.body.data.model).to.equal('claude-opus-4-5');

      expect(mockProvider.updateConfig.calledOnce).to.be.true;
      const patchArg = mockProvider.updateConfig.getCall(0).args[1];
      expect(patchArg.model).to.equal('claude-opus-4-5');
    });

    it('should return 422 when the agent does not use a managed runtime', async () => {
      const identifier = `e2e-patch-selfhosted-${Date.now()}`;
      createdAgentIdentifiers.push(identifier);

      await session.testAgent.post('/v1/agents').send({ name: 'Self-Hosted Patch Agent', identifier });

      const res = await session.testAgent
        .patch(`/v1/agents/${encodeURIComponent(identifier)}/runtime/config`)
        .send({ model: 'claude-opus-4-5' });

      expect(res.status).to.equal(422);
    });

    it('should return 404 when the agent identifier does not exist', async () => {
      const res = await session.testAgent
        .patch('/v1/agents/nonexistent-managed-for-patch/runtime/config')
        .send({ model: 'claude-opus-4-5' });

      expect(res.status).to.equal(404);
    });

    it('should forward tools to updateConfig and surface the updated tools in the response', async () => {
      const integrationId = await createAgentRuntimeIntegration();
      const identifier = `e2e-patch-tools-${Date.now()}`;
      createdAgentIdentifiers.push(identifier);

      await session.testAgent.post('/v1/agents').send(managedBody(identifier, integrationId));

      mockProvider.updateConfig.resolves({
        model: 'claude-3-5-sonnet-20241022',
        systemPrompt: '',
        mcpServers: [],
        tools: [{ externalId: 'bash', name: 'bash', type: 'builtin' }],
      });

      const res = await session.testAgent.patch(`/v1/agents/${encodeURIComponent(identifier)}/runtime/config`).send({
        tools: [{ externalId: 'bash', name: 'Bash', type: 'builtin' }],
      });

      expect(res.status).to.equal(200);
      expect(res.body.data.tools).to.be.an('array').with.length(1);
      expect(res.body.data.tools[0].externalId).to.equal('bash');
      expect(res.body.data.tools[0].type).to.equal('builtin');

      const patchArg = mockProvider.updateConfig.getCall(0).args[1];
      // The use-case must pass tools through as full DTOs so the provider can read
      // the externalId (the actual provider tool `type`) — not just the display name.
      expect(patchArg.tools).to.be.an('array').with.length(1);
      expect(patchArg.tools[0].externalId).to.equal('bash');
      expect(patchArg.tools[0].name).to.equal('Bash');
      expect(patchArg.tools[0].type).to.equal('builtin');
    });

    it('should forward skills to updateConfig', async () => {
      const integrationId = await createAgentRuntimeIntegration();
      const identifier = `e2e-patch-skills-${Date.now()}`;
      createdAgentIdentifiers.push(identifier);

      await session.testAgent.post('/v1/agents').send(managedBody(identifier, integrationId));

      mockProvider.updateConfig.resolves({
        model: 'claude-3-5-sonnet-20241022',
        systemPrompt: '',
        mcpServers: [],
        tools: [],
        skills: [{ type: 'anthropic', skillId: 'xlsx', version: null }],
      });

      const res = await session.testAgent.patch(`/v1/agents/${encodeURIComponent(identifier)}/runtime/config`).send({
        skills: [{ type: 'anthropic', skillId: 'xlsx' }],
      });

      expect(res.status).to.equal(200);
      expect(res.body.data.skills).to.be.an('array').with.length(1);
      expect(res.body.data.skills[0].skillId).to.equal('xlsx');

      const patchArg = mockProvider.updateConfig.getCall(0).args[1];
      expect(patchArg.skills).to.deep.equal([{ type: 'anthropic', skillId: 'xlsx' }]);
    });

    it('should return 429 with Retry-After header when provider is rate limited', async () => {
      const integrationId = await createAgentRuntimeIntegration();
      const identifier = `e2e-patch-ratelimit-${Date.now()}`;
      createdAgentIdentifiers.push(identifier);

      await session.testAgent.post('/v1/agents').send(managedBody(identifier, integrationId));

      mockProvider.updateConfig.rejects(
        new AgentRuntimeRateLimitedError('Too many requests', AgentRuntimeProviderIdEnum.Anthropic, 5000)
      );

      const res = await session.testAgent
        .patch(`/v1/agents/${encodeURIComponent(identifier)}/runtime/config`)
        .send({ model: 'claude-3-5-sonnet-20241022' });

      expect(res.status).to.equal(429);
      expect(res.body.retryAfterMs).to.equal(5000);
      expect(res.headers['retry-after']).to.exist;
      expect(Number(res.headers['retry-after'])).to.equal(5);
    });

    // ── MCP server catalog enforcement ──────────────────────────────────────
    // The PATCH endpoint accepts full {externalId, name, url} MCP server DTOs,
    // but a caller with agent write access must never be able to attach an
    // arbitrary external MCP endpoint to a managed agent (tool-chain hijack /
    // exfiltration). The use-case resolves every entry against CLAUDE_MCP_SERVERS
    // before forwarding to the provider, ignoring the caller-supplied url.
    describe('mcpServers catalog enforcement', () => {
      it('should reject an MCP server whose name is not in the trusted catalog', async () => {
        const integrationId = await createAgentRuntimeIntegration();
        const identifier = `e2e-patch-mcp-unknown-${Date.now()}`;
        createdAgentIdentifiers.push(identifier);

        await session.testAgent.post('/v1/agents').send(managedBody(identifier, integrationId));

        const res = await session.testAgent.patch(`/v1/agents/${encodeURIComponent(identifier)}/runtime/config`).send({
          mcpServers: [{ externalId: 'Attacker MCP', name: 'Attacker MCP', url: 'https://attacker.example.com/mcp' }],
        });

        expect(res.status).to.equal(400);
        expect(mockProvider.updateConfig.called, 'updateConfig must not be called for unknown MCP entries').to.be.false;
      });

      it('should overwrite a caller-supplied url with the trusted catalog url before calling the provider', async () => {
        const integrationId = await createAgentRuntimeIntegration();
        const identifier = `e2e-patch-mcp-spoof-${Date.now()}`;
        createdAgentIdentifiers.push(identifier);

        await session.testAgent.post('/v1/agents').send(managedBody(identifier, integrationId));

        mockProvider.updateConfig.resolves({
          model: 'claude-3-5-sonnet-20241022',
          systemPrompt: '',
          mcpServers: [{ externalId: 'Slack', name: 'Slack', url: 'https://mcp.slack.com/mcp' }],
          tools: [],
        });

        const spoofedUrl = 'https://attacker.example.com/mcp';
        const res = await session.testAgent.patch(`/v1/agents/${encodeURIComponent(identifier)}/runtime/config`).send({
          mcpServers: [{ externalId: 'Slack', name: 'Slack', url: spoofedUrl }],
        });

        expect(res.status).to.equal(200);
        expect(mockProvider.updateConfig.calledOnce).to.be.true;

        const patchArg = mockProvider.updateConfig.getCall(0).args[1];
        expect(patchArg.mcpServers).to.be.an('array').with.length(1);
        expect(patchArg.mcpServers[0].name).to.equal('Slack');
        expect(
          patchArg.mcpServers[0].url,
          'caller-supplied url must be replaced with the trusted catalog url'
        ).to.equal('https://mcp.slack.com/mcp');
        expect(patchArg.mcpServers[0].url).to.not.equal(spoofedUrl);
      });

      it('should accept the GET-response round-trip shape (name matches catalog) and forward to the provider', async () => {
        const integrationId = await createAgentRuntimeIntegration();
        const identifier = `e2e-patch-mcp-roundtrip-${Date.now()}`;
        createdAgentIdentifiers.push(identifier);

        await session.testAgent.post('/v1/agents').send(managedBody(identifier, integrationId));

        mockProvider.updateConfig.resolves({
          model: 'claude-3-5-sonnet-20241022',
          systemPrompt: '',
          mcpServers: [{ externalId: 'Linear', name: 'Linear', url: 'https://mcp.linear.app/sse' }],
          tools: [],
        });

        const res = await session.testAgent.patch(`/v1/agents/${encodeURIComponent(identifier)}/runtime/config`).send({
          mcpServers: [{ externalId: 'Linear', name: 'Linear', url: 'https://mcp.linear.app/sse' }],
        });

        expect(res.status).to.equal(200);
        const patchArg = mockProvider.updateConfig.getCall(0).args[1];
        expect(patchArg.mcpServers).to.be.an('array').with.length(1);
        expect(patchArg.mcpServers[0].name).to.equal('Linear');
        expect(patchArg.mcpServers[0].url).to.equal('https://mcp.linear.app/sse');
      });
    });
  });

  // ─── POST /v1/agents — adopt existing managed agent ─────────────────────────

  describe('POST /v1/agents — adopt existing managed agent', () => {
    function adoptBody(integrationId: string, overrides: Record<string, unknown> = {}) {
      return {
        runtime: 'managed',
        managedRuntime: {
          providerId: AgentRuntimeProviderIdEnum.Anthropic,
          integrationId,
          externalAgentId: FAKE_ADOPT_AGENT_ID,
        },
        ...overrides,
      };
    }

    it('should adopt an existing provider agent, auto-generating name and identifier', async () => {
      const integrationId = await createAgentRuntimeIntegration();
      const res = await session.testAgent.post('/v1/agents').send(adoptBody(integrationId));

      expect(res.status).to.equal(201);
      expect(res.body.data.runtime).to.equal('managed');
      expect(res.body.data.name).to.equal(FAKE_ADOPT_AGENT_NAME);
      expect(res.body.data.identifier).to.be.a('string');
      expect(res.body.data.identifier).to.match(/^my-existing-claude-agent/);
      expect(res.body.data.managedRuntime.externalAgentId).to.equal(FAKE_ADOPT_AGENT_ID);
      expect(res.body.data.managedRuntime.integrationId).to.equal(integrationId);

      // getAgent should be called, not createAgent
      expect(mockProvider.getAgent.calledOnce, 'getAgent should be called').to.be.true;
      expect(mockProvider.createAgent.called, 'createAgent should NOT be called').to.be.false;
      expect(mockProvider.validateCredentials.called, 'validateCredentials should NOT be called').to.be.false;

      createdAgentIdentifiers.push(res.body.data.identifier);
    });

    it('should return 409 when the external agent ID does not exist on the provider', async () => {
      const integrationId = await createAgentRuntimeIntegration();
      mockProvider.getAgent.rejects(
        new AgentRuntimeNotFoundError('Agent not found on provider', AgentRuntimeProviderIdEnum.Anthropic)
      );

      const res = await session.testAgent.post('/v1/agents').send(adoptBody(integrationId));

      expect(res.status).to.equal(409);
      expect(res.body.code).to.equal('AGENT_RUNTIME_DRIFT');
    });

    it('should return 401 when the API key is rejected during getAgent', async () => {
      const integrationId = await createAgentRuntimeIntegration();
      mockProvider.getAgent.rejects(
        new AgentRuntimeUnauthorizedError('Invalid API key', AgentRuntimeProviderIdEnum.Anthropic)
      );

      const res = await session.testAgent.post('/v1/agents').send(adoptBody(integrationId));

      expect(res.status).to.equal(401);
      expect(res.body.code).to.equal('AGENT_RUNTIME_UNAUTHORIZED');
    });

    it('should handle identifier collision by appending a short ID suffix', async () => {
      const integrationId = await createAgentRuntimeIntegration();
      const collidingIdentifier = 'my-existing-claude-agent';
      createdAgentIdentifiers.push(collidingIdentifier);

      await session.testAgent.post('/v1/agents').send({ name: 'Collision Seed', identifier: collidingIdentifier });

      const res = await session.testAgent.post('/v1/agents').send(adoptBody(integrationId));

      expect(res.status).to.equal(201);
      expect(res.body.data.identifier).to.not.equal(collidingIdentifier);
      expect(res.body.data.identifier).to.match(/^my-existing-claude-agent/);

      createdAgentIdentifiers.push(res.body.data.identifier);
    });

    it('should return 422 when managedRuntime is omitted', async () => {
      const res = await session.testAgent.post('/v1/agents').send({
        runtime: 'managed',
      });

      expect(res.status).to.equal(422);
    });
  });
});
