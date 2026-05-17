import * as AgentRuntimeFactoryModule from '@novu/application-generic/build/main/agent-runtimes/agent-runtime.factory';
import { AgentMcpServerRepository, AgentRepository, IntegrationRepository, McpConnectionRepository } from '@novu/dal';
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

function buildMockProvider(overrides: Partial<Record<string, sinon.SinonStub>> = {}) {
  return {
    providerId: AgentRuntimeProviderIdEnum.Anthropic,
    capabilities: { mcpServers: true, tools: true, model: true, systemPrompt: true, skills: true },
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
});
