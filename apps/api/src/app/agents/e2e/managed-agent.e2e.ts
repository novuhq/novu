import {
  AgentRuntimeBadRequestError,
  AgentRuntimeNotFoundError,
  AgentRuntimeRateLimitedError,
  AgentRuntimeUnauthorizedError,
  encryptCredentials,
} from '@novu/application-generic';
import * as AgentRuntimeFactoryModule from '@novu/application-generic/build/main/agent-runtimes/agent-runtime.factory';
import { AgentRepository, IntegrationRepository } from '@novu/dal';
import { AgentRuntimeProviderIdEnum, ChannelTypeEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';

const FAKE_API_KEY = 'sk-fake-anthropic-key-for-e2e';
const FAKE_EXTERNAL_AGENT_ID = 'ext-agent-e2e-123';
const FAKE_ADOPT_AGENT_ID = 'agent_01XJ5AdoptE2E';
const FAKE_ADOPT_AGENT_NAME = 'My Existing Claude Agent';

const agentRepository = new AgentRepository();
const integrationRepository = new IntegrationRepository();

interface ManagedAgentTestContext {
  session: UserSession;
  integrationId: string;
}

async function setupManagedRuntimeContext(): Promise<ManagedAgentTestContext> {
  const session = new UserSession();
  await session.initialize();

  const integration = await integrationRepository.create({
    _environmentId: session.environment._id,
    _organizationId: session.organization._id,
    providerId: AgentRuntimeProviderIdEnum.Anthropic,
    channel: ChannelTypeEnum.IN_APP,
    credentials: encryptCredentials({ apiKey: FAKE_API_KEY }),
    active: true,
    name: 'Anthropic Runtime E2E',
    identifier: `anthropic-runtime-e2e-${Date.now()}`,
    priority: 1,
    primary: false,
    deleted: false,
  });

  return {
    session,
    integrationId: integration._id,
  };
}

const FAKE_EXTERNAL_ENV_ID = 'env_01XJ5FakeEnvE2E';

function buildMockProvider(overrides: Partial<Record<string, sinon.SinonStub>> = {}) {
  return {
    providerId: AgentRuntimeProviderIdEnum.Anthropic,
    capabilities: { mcpServers: true, tools: true, model: true, systemPrompt: true, skills: true },
    validateCredentials: sinon.stub().resolves(),
    createAgent: sinon.stub().resolves({ externalAgentId: FAKE_EXTERNAL_AGENT_ID }),
    deleteAgent: sinon.stub().resolves(),
    getAgent: sinon.stub().resolves({ externalAgentId: FAKE_ADOPT_AGENT_ID, name: FAKE_ADOPT_AGENT_NAME }),
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
    createEnvironment: sinon.stub().resolves({ externalEnvironmentId: FAKE_EXTERNAL_ENV_ID }),
    getEnvironment: sinon.stub().resolves({ externalEnvironmentId: FAKE_EXTERNAL_ENV_ID }),
    archiveEnvironment: sinon.stub().resolves(),
    ...overrides,
  };
}

describe('Managed Agents API #novu-v2', () => {
  let ctx: ManagedAgentTestContext;
  let mockProvider: ReturnType<typeof buildMockProvider>;
  const createdIdentifiers: string[] = [];

  before(() => {
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
  });

  beforeEach(async () => {
    ctx = await setupManagedRuntimeContext();
    mockProvider = buildMockProvider();
    sinon.stub(AgentRuntimeFactoryModule, 'getAgentRuntimeProvider').returns(mockProvider as never);
  });

  afterEach(async () => {
    sinon.restore();

    for (const identifier of createdIdentifiers) {
      await ctx.session.testAgent.delete(`/v1/agents/${encodeURIComponent(identifier)}`).catch(() => {});
    }

    createdIdentifiers.length = 0;
  });

  function managedBody(identifier: string, overrides: Record<string, unknown> = {}) {
    return {
      name: 'Managed E2E Agent',
      identifier,
      runtime: 'managed',
      managedRuntime: {
        providerId: AgentRuntimeProviderIdEnum.Anthropic,
        integrationId: ctx.integrationId,
      },
      ...overrides,
    };
  }

  // ─── POST /v1/agents — managed runtime ──────────────────────────────────────

  describe('POST /v1/agents — managed runtime', () => {
    it('should create a managed agent and return runtime + managedRuntime fields', async () => {
      const identifier = `e2e-managed-${Date.now()}`;
      createdIdentifiers.push(identifier);

      const res = await ctx.session.testAgent.post('/v1/agents').send(managedBody(identifier));

      expect(res.status).to.equal(201);
      expect(res.body.data.runtime).to.equal('managed');
      expect(res.body.data.managedRuntime).to.exist;
      expect(res.body.data.managedRuntime.providerId).to.equal(AgentRuntimeProviderIdEnum.Anthropic);
      expect(res.body.data.managedRuntime.integrationId).to.equal(ctx.integrationId);
      expect(res.body.data.managedRuntime.externalAgentId).to.equal(FAKE_EXTERNAL_AGENT_ID);
    });

    it('should forward model, systemPrompt, tools, and resolved mcpServers to createAgent', async () => {
      const identifier = `e2e-managed-full-${Date.now()}`;
      createdIdentifiers.push(identifier);

      await ctx.session.testAgent.post('/v1/agents').send(
        managedBody(identifier, {
          managedRuntime: {
            providerId: AgentRuntimeProviderIdEnum.Anthropic,
            integrationId: ctx.integrationId,
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
      expect(createAgentArg.mcpServers[0].url).to.equal('https://mcp.slack.com/sse');
    });

    it('should return 422 when runtime=managed but managedRuntime is omitted', async () => {
      const res = await ctx.session.testAgent.post('/v1/agents').send({
        name: 'Missing Managed Runtime',
        identifier: `e2e-no-managed-${Date.now()}`,
        runtime: 'managed',
      });

      expect(res.status).to.equal(422);
    });

    it('should return 422 when providerId is not a valid enum value', async () => {
      const res = await ctx.session.testAgent.post('/v1/agents').send({
        name: 'Bad Provider',
        identifier: `e2e-bad-provider-${Date.now()}`,
        runtime: 'managed',
        managedRuntime: {
          providerId: 'not-a-real-provider',
          integrationId: ctx.integrationId,
        },
      });

      expect(res.status).to.equal(422);
    });

    it('should return 404 when the referenced integrationId does not exist', async () => {
      const res = await ctx.session.testAgent.post('/v1/agents').send(
        managedBody(`e2e-bad-integ-${Date.now()}`, {
          managedRuntime: {
            providerId: AgentRuntimeProviderIdEnum.Anthropic,
            integrationId: '000000000000000000000099',
          },
        })
      );

      expect(res.status).to.equal(404);
    });

    it('should return 401 when the provider rejects credentials during validateCredentials', async () => {
      mockProvider.validateCredentials.rejects(
        new AgentRuntimeUnauthorizedError('Invalid API key', AgentRuntimeProviderIdEnum.Anthropic)
      );

      const identifier = `e2e-unauth-${Date.now()}`;
      const res = await ctx.session.testAgent.post('/v1/agents').send(managedBody(identifier));

      expect(res.status).to.equal(401);
      expect(res.body.code).to.equal('AGENT_RUNTIME_UNAUTHORIZED');
    });

    it('should return 400 and leave no Mongo record when createAgent throws', async () => {
      mockProvider.createAgent.rejects(
        new AgentRuntimeBadRequestError('Invalid model name', AgentRuntimeProviderIdEnum.Anthropic)
      );

      const identifier = `e2e-create-fail-${Date.now()}`;
      const res = await ctx.session.testAgent.post('/v1/agents').send(managedBody(identifier));

      expect(res.status).to.equal(400);
      expect(res.body.code).to.equal('AGENT_RUNTIME_BAD_REQUEST');

      const leftover = await agentRepository.findOne(
        {
          identifier,
          _environmentId: ctx.session.environment._id,
          _organizationId: ctx.session.organization._id,
        },
        ['_id']
      );

      expect(leftover, 'agent document should have been rolled back').to.equal(null);
    });

    it('should return 409 when creating a managed agent with a duplicate identifier', async () => {
      const identifier = `e2e-dup-managed-${Date.now()}`;
      createdIdentifiers.push(identifier);

      await ctx.session.testAgent.post('/v1/agents').send(managedBody(identifier));

      const second = await ctx.session.testAgent.post('/v1/agents').send(managedBody(identifier));

      expect(second.status).to.equal(409);
    });
  });

  // ─── GET /v1/agents/runtime-providers ───────────────────────────────────────

  describe('GET /v1/agents/runtime-providers', () => {
    it('should return the catalog of runtime providers with capabilities', async () => {
      const res = await ctx.session.testAgent.get('/v1/agents/runtime-providers');

      expect(res.status).to.equal(200);
      expect(res.body.data).to.be.an('array').with.length.gte(1);

      const anthropic = res.body.data.find(
        (p: { providerId: string }) => p.providerId === AgentRuntimeProviderIdEnum.Anthropic
      );

      expect(anthropic, 'anthropic entry').to.exist;
      expect(anthropic.displayName).to.equal('Claude (Anthropic)');
      expect(anthropic.capabilities).to.deep.include({
        mcpServers: true,
        tools: true,
        model: true,
        systemPrompt: true,
      });
    });
  });

  // ─── GET /v1/agents/:identifier/runtime/config ──────────────────────────────

  describe('GET /v1/agents/:identifier/runtime/config', () => {
    it('should return a minimal config (empty mcpServers and tools) for a managed agent', async () => {
      const identifier = `e2e-cfg-minimal-${Date.now()}`;
      createdIdentifiers.push(identifier);

      await ctx.session.testAgent.post('/v1/agents').send(managedBody(identifier));

      const res = await ctx.session.testAgent.get(`/v1/agents/${encodeURIComponent(identifier)}/runtime/config`);

      expect(res.status).to.equal(200);
      expect(res.body.data.model).to.be.a('string');
      expect(res.body.data.systemPrompt).to.be.a('string');
      expect(res.body.data.mcpServers).to.be.an('array');
      expect(res.body.data.tools).to.be.an('array');
    });

    it('should return all mcpServer and tool fields exactly as returned by the provider', async () => {
      const identifier = `e2e-cfg-full-${Date.now()}`;
      createdIdentifiers.push(identifier);

      await ctx.session.testAgent.post('/v1/agents').send(managedBody(identifier));

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

      const res = await ctx.session.testAgent.get(`/v1/agents/${encodeURIComponent(identifier)}/runtime/config`);

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
      createdIdentifiers.push(identifier);

      await ctx.session.testAgent.post('/v1/agents').send({ name: 'Self-Hosted Agent', identifier });

      const res = await ctx.session.testAgent.get(`/v1/agents/${encodeURIComponent(identifier)}/runtime/config`);

      expect(res.status).to.equal(422);
    });

    it('should return 404 when the agent identifier does not exist', async () => {
      const res = await ctx.session.testAgent.get('/v1/agents/nonexistent-managed-agent/runtime/config');

      expect(res.status).to.equal(404);
    });

    it('should return 409 with code AGENT_RUNTIME_DRIFT when the provider returns not found', async () => {
      const identifier = `e2e-cfg-drift-${Date.now()}`;
      createdIdentifiers.push(identifier);

      await ctx.session.testAgent.post('/v1/agents').send(managedBody(identifier));

      mockProvider.getConfig.rejects(
        new AgentRuntimeNotFoundError('Agent not found on provider', AgentRuntimeProviderIdEnum.Anthropic)
      );

      const res = await ctx.session.testAgent.get(`/v1/agents/${encodeURIComponent(identifier)}/runtime/config`);

      expect(res.status).to.equal(409);
      expect(res.body.code).to.equal('AGENT_RUNTIME_DRIFT');
    });
  });

  // ─── PATCH /v1/agents/:identifier/runtime/config ────────────────────────────

  describe('PATCH /v1/agents/:identifier/runtime/config', () => {
    it('should apply a partial update and return the updated config', async () => {
      const identifier = `e2e-patch-cfg-${Date.now()}`;
      createdIdentifiers.push(identifier);

      await ctx.session.testAgent.post('/v1/agents').send(managedBody(identifier));

      mockProvider.updateConfig.resolves({
        model: 'claude-opus-4-5',
        systemPrompt: '',
        mcpServers: [],
        tools: [],
      });

      const res = await ctx.session.testAgent
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
      createdIdentifiers.push(identifier);

      await ctx.session.testAgent.post('/v1/agents').send({ name: 'Self-Hosted Patch Agent', identifier });

      const res = await ctx.session.testAgent
        .patch(`/v1/agents/${encodeURIComponent(identifier)}/runtime/config`)
        .send({ model: 'claude-opus-4-5' });

      expect(res.status).to.equal(422);
    });

    it('should return 404 when the agent identifier does not exist', async () => {
      const res = await ctx.session.testAgent
        .patch('/v1/agents/nonexistent-managed-for-patch/runtime/config')
        .send({ model: 'claude-opus-4-5' });

      expect(res.status).to.equal(404);
    });

    it('should return 429 with Retry-After header when provider is rate limited', async () => {
      const identifier = `e2e-patch-ratelimit-${Date.now()}`;
      createdIdentifiers.push(identifier);

      await ctx.session.testAgent.post('/v1/agents').send(managedBody(identifier));

      mockProvider.updateConfig.rejects(
        new AgentRuntimeRateLimitedError('Too many requests', AgentRuntimeProviderIdEnum.Anthropic, 5000)
      );

      const res = await ctx.session.testAgent
        .patch(`/v1/agents/${encodeURIComponent(identifier)}/runtime/config`)
        .send({ model: 'claude-3-5-sonnet-20241022' });

      expect(res.status).to.equal(429);
      expect(res.body.retryAfterMs).to.equal(5000);
      expect(res.headers['retry-after']).to.exist;
      expect(Number(res.headers['retry-after'])).to.equal(5);
    });
  });

  // ─── POST /v1/agents — adopt existing managed agent ─────────────────────────

  describe('POST /v1/agents — adopt existing managed agent', () => {
    function adoptBody(overrides: Record<string, unknown> = {}) {
      return {
        runtime: 'managed',
        managedRuntime: {
          providerId: AgentRuntimeProviderIdEnum.Anthropic,
          integrationId: ctx.integrationId,
          externalAgentId: FAKE_ADOPT_AGENT_ID,
        },
        ...overrides,
      };
    }

    it('should adopt an existing Claude agent, auto-generating name and identifier from provider', async () => {
      const res = await ctx.session.testAgent.post('/v1/agents').send(adoptBody());

      expect(res.status).to.equal(201);
      expect(res.body.data.runtime).to.equal('managed');
      expect(res.body.data.name).to.equal(FAKE_ADOPT_AGENT_NAME);
      // Identifier should be a slugified version of the name
      expect(res.body.data.identifier).to.be.a('string');
      expect(res.body.data.identifier).to.match(/^my-existing-claude-agent/);
      expect(res.body.data.managedRuntime.externalAgentId).to.equal(FAKE_ADOPT_AGENT_ID);
      expect(res.body.data.managedRuntime.integrationId).to.equal(ctx.integrationId);

      // Verify getAgent was called (not createAgent)
      expect(mockProvider.getAgent.calledOnce, 'getAgent should be called').to.be.true;
      expect(mockProvider.createAgent.called, 'createAgent should NOT be called').to.be.false;
      expect(mockProvider.validateCredentials.called, 'validateCredentials should NOT be called').to.be.false;

      createdIdentifiers.push(res.body.data.identifier);
    });

    it('should return 404 when the external agent ID does not exist on the provider', async () => {
      mockProvider.getAgent.rejects(
        new AgentRuntimeNotFoundError('Agent not found on provider', AgentRuntimeProviderIdEnum.Anthropic)
      );

      const res = await ctx.session.testAgent.post('/v1/agents').send(adoptBody());

      // AgentRuntimeNotFoundError maps to 409 (AGENT_RUNTIME_DRIFT) in the exception filter
      expect(res.status).to.equal(409);
      expect(res.body.code).to.equal('AGENT_RUNTIME_DRIFT');
    });

    it('should return 401 when the API key is rejected during getAgent', async () => {
      mockProvider.getAgent.rejects(
        new AgentRuntimeUnauthorizedError('Invalid API key', AgentRuntimeProviderIdEnum.Anthropic)
      );

      const res = await ctx.session.testAgent.post('/v1/agents').send(adoptBody());

      expect(res.status).to.equal(401);
      expect(res.body.code).to.equal('AGENT_RUNTIME_UNAUTHORIZED');
    });

    it('should handle identifier collision by appending a short ID suffix', async () => {
      // Pre-create an agent whose identifier would collide with the slugified adopt name
      const collidingIdentifier = 'my-existing-claude-agent';
      createdIdentifiers.push(collidingIdentifier);

      await ctx.session.testAgent.post('/v1/agents').send({ name: 'Collision Seed', identifier: collidingIdentifier });

      const res = await ctx.session.testAgent.post('/v1/agents').send(adoptBody());

      expect(res.status).to.equal(201);
      // Identifier should still start with the slug but have a suffix
      expect(res.body.data.identifier).to.be.a('string');
      expect(res.body.data.identifier).to.not.equal(collidingIdentifier);
      expect(res.body.data.identifier).to.match(/^my-existing-claude-agent/);

      createdIdentifiers.push(res.body.data.identifier);
    });

    it('should return 422 when managedRuntime is omitted even with an externalAgentId intent', async () => {
      const res = await ctx.session.testAgent.post('/v1/agents').send({
        runtime: 'managed',
      });

      expect(res.status).to.equal(422);
    });
  });

  // ─── POST /v1/agents — apiKey flow (auto-create Integration + Environment) ──

  describe('POST /v1/agents — apiKey auto-provisioning', () => {
    function apiKeyBody(identifier: string, overrides: Record<string, unknown> = {}) {
      return {
        name: 'API Key Auto Agent',
        identifier,
        runtime: 'managed',
        managedRuntime: {
          providerId: AgentRuntimeProviderIdEnum.Anthropic,
          apiKey: FAKE_API_KEY,
        },
        ...overrides,
      };
    }

    it('should create an Integration and persist externalEnvironmentId when apiKey is provided', async () => {
      const identifier = `e2e-apikey-${Date.now()}`;
      createdIdentifiers.push(identifier);

      const res = await ctx.session.testAgent.post('/v1/agents').send(apiKeyBody(identifier));

      expect(res.status).to.equal(201);
      expect(res.body.data.runtime).to.equal('managed');
      expect(res.body.data.managedRuntime).to.exist;
      expect(res.body.data.managedRuntime.externalAgentId).to.equal(FAKE_EXTERNAL_AGENT_ID);

      const integrationId = res.body.data.managedRuntime.integrationId;
      expect(integrationId).to.be.a('string');

      // Verify the integration was auto-created with the environment ID in credentials
      const integration = await integrationRepository.findOne(
        {
          _id: integrationId,
          _environmentId: ctx.session.environment._id,
          _organizationId: ctx.session.organization._id,
        },
        ['credentials']
      );

      expect(integration, 'auto-created integration should exist').to.exist;

      // Verify createEnvironment was called on the provider
      expect(mockProvider.createEnvironment.calledOnce, 'createEnvironment should be called').to.be.true;
    });

    it('should NOT call createEnvironment when an existing integrationId is provided', async () => {
      const identifier = `e2e-existing-integ-${Date.now()}`;
      createdIdentifiers.push(identifier);

      await ctx.session.testAgent.post('/v1/agents').send({
        name: 'Existing Integration Agent',
        identifier,
        runtime: 'managed',
        managedRuntime: {
          providerId: AgentRuntimeProviderIdEnum.Anthropic,
          integrationId: ctx.integrationId,
        },
      });

      expect(mockProvider.createEnvironment.called, 'createEnvironment should NOT be called').to.be.false;
    });

    it('should return 400 and roll back Integration + archive Environment when createAgent fails', async () => {
      mockProvider.createAgent.rejects(
        new AgentRuntimeBadRequestError('Invalid model', AgentRuntimeProviderIdEnum.Anthropic)
      );

      const identifier = `e2e-apikey-fail-${Date.now()}`;
      const res = await ctx.session.testAgent.post('/v1/agents').send(apiKeyBody(identifier));

      expect(res.status).to.equal(400);
      expect(res.body.code).to.equal('AGENT_RUNTIME_BAD_REQUEST');

      // archiveEnvironment should have been called as part of rollback
      expect(mockProvider.archiveEnvironment.calledOnce, 'archiveEnvironment should be called on rollback').to.be.true;
      expect(mockProvider.archiveEnvironment.getCall(0).args[0]).to.equal(FAKE_EXTERNAL_ENV_ID);

      // No agent document should remain
      const leftover = await agentRepository.findOne(
        {
          identifier,
          _environmentId: ctx.session.environment._id,
          _organizationId: ctx.session.organization._id,
        },
        ['_id']
      );

      expect(leftover, 'agent document should have been rolled back').to.equal(null);
    });

    it('should return 422 when neither apiKey nor integrationId is provided', async () => {
      const res = await ctx.session.testAgent.post('/v1/agents').send({
        name: 'Missing Credentials Agent',
        identifier: `e2e-no-creds-${Date.now()}`,
        runtime: 'managed',
        managedRuntime: {
          providerId: AgentRuntimeProviderIdEnum.Anthropic,
        },
      });

      expect(res.status).to.equal(422);
    });

    it('should work with adopt flow using raw apiKey', async () => {
      const res = await ctx.session.testAgent.post('/v1/agents').send({
        runtime: 'managed',
        managedRuntime: {
          providerId: AgentRuntimeProviderIdEnum.Anthropic,
          apiKey: FAKE_API_KEY,
          externalAgentId: FAKE_ADOPT_AGENT_ID,
        },
      });

      expect(res.status).to.equal(201);
      expect(res.body.data.name).to.equal(FAKE_ADOPT_AGENT_NAME);
      expect(res.body.data.managedRuntime.externalAgentId).to.equal(FAKE_ADOPT_AGENT_ID);

      // An integration should have been auto-created
      expect(res.body.data.managedRuntime.integrationId).to.be.a('string');

      // createEnvironment should have been called
      expect(mockProvider.createEnvironment.calledOnce, 'createEnvironment should be called').to.be.true;

      createdIdentifiers.push(res.body.data.identifier);
    });
  });
});
