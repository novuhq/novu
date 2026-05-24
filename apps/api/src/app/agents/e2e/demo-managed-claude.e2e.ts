import { decryptCredentials, encryptCredentials } from '@novu/application-generic';
import * as AgentRuntimeFactoryModule from '@novu/application-generic/build/main/agent-runtimes/agent-runtime.factory';
import { AgentRepository, IntegrationRepository } from '@novu/dal';
import { AgentRuntimeProviderIdEnum, IntegrationKindEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';

const FAKE_MASTER_KEY = 'sk-ant-novu-master-key';
const FAKE_EXTERNAL_AGENT_ID = 'ext-demo-agent-e2e';
const FAKE_EXTERNAL_ENV_ID = 'env_01DemoClaudeE2E';

const integrationRepository = new IntegrationRepository();
const agentRepository = new AgentRepository();

function buildMockProvider(overrides: Partial<Record<string, sinon.SinonStub>> = {}) {
  return {
    providerId: AgentRuntimeProviderIdEnum.NovuAnthropic,
    capabilities: { mcpServers: true, tools: true, model: true, systemPrompt: true, skills: true, tokenVault: true },
    validateCredentials: sinon.stub().resolves(),
    createAgent: sinon.stub().resolves({ externalAgentId: FAKE_EXTERNAL_AGENT_ID }),
    deleteAgent: sinon.stub().resolves(),
    getAgent: sinon.stub().resolves({ externalAgentId: FAKE_EXTERNAL_AGENT_ID, name: 'Demo Agent' }),
    getEnvironment: sinon.stub().resolves({ id: FAKE_EXTERNAL_ENV_ID, name: 'Demo Env' }),
    getConfig: sinon.stub().resolves({
      model: 'claude-3-5-sonnet-20241022',
      systemPrompt: '',
      mcpServers: [],
      tools: [],
      skills: [],
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

describe('Demo Managed Claude #novu-v2', () => {
  let session: UserSession;
  let mockProvider: ReturnType<typeof buildMockProvider>;
  let getAgentRuntimeProviderStub: sinon.SinonStub;
  const createdAgentIdentifiers: string[] = [];
  const createdIntegrationIds: string[] = [];

  const previousManagedClaudeKey = process.env.NOVU_MANAGED_CLAUDE_API_KEY;
  const previousConversationalAgentsFlag = process.env.IS_CONVERSATIONAL_AGENTS_ENABLED;
  const previousManagedRuntimeFlag = process.env.IS_MANAGED_AGENT_RUNTIME_ENABLED;

  before(() => {
    process.env.NOVU_MANAGED_CLAUDE_API_KEY = FAKE_MASTER_KEY;
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
    process.env.IS_MANAGED_AGENT_RUNTIME_ENABLED = 'true';
  });

  after(() => {
    process.env.NOVU_MANAGED_CLAUDE_API_KEY = previousManagedClaudeKey;
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
    getAgentRuntimeProviderStub = sinon
      .stub(AgentRuntimeFactoryModule, 'getAgentRuntimeProvider')
      .callsFake((_providerId: string, apiKey?: string) => {
        if (apiKey === FAKE_MASTER_KEY) {
          return mockProvider as never;
        }

        return buildMockProvider({
          providerId: AgentRuntimeProviderIdEnum.Anthropic,
          createAgent: sinon.stub().resolves({ externalAgentId: 'ext-user-agent' }),
        }) as never;
      });
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

  async function createNovuAnthropicIntegration(): Promise<string> {
    const res = await session.testAgent.post('/v1/integrations').send({
      providerId: AgentRuntimeProviderIdEnum.NovuAnthropic,
      kind: IntegrationKindEnum.AGENT,
      active: true,
      name: `novu-managed-claude-e2e-${Date.now()}`,
    });

    expect(res.status, `createNovuAnthropicIntegration failed: ${JSON.stringify(res.body)}`).to.equal(201);
    const integrationId: string = res.body._id ?? res.body.data?._id ?? res.body.data?.id;
    createdIntegrationIds.push(integrationId);

    return integrationId;
  }

  it('should NOT call provisionIntegration when creating novu-anthropic integration', async () => {
    await createNovuAnthropicIntegration();

    expect(mockProvider.provisionIntegration.called, 'provisionIntegration should be deferred').to.equal(false);
  });

  it('should lazy-provision Anthropic env on first managed agent creation', async () => {
    const integrationId = await createNovuAnthropicIntegration();
    const identifier = `e2e-demo-claude-${Date.now()}`;
    createdAgentIdentifiers.push(identifier);

    const res = await session.testAgent.post('/v1/agents').send({
      name: 'Demo Claude Agent',
      identifier,
      runtime: 'managed',
      managedRuntime: {
        providerId: AgentRuntimeProviderIdEnum.NovuAnthropic,
        integrationId,
      },
    });

    expect(res.status).to.equal(201);
    expect(mockProvider.provisionIntegration.calledOnce, 'lazy provision should run once').to.equal(true);
    expect(getAgentRuntimeProviderStub.calledWith(AgentRuntimeProviderIdEnum.NovuAnthropic, FAKE_MASTER_KEY)).to.equal(
      true
    );

    const integration = await integrationRepository.findOne(
      {
        _id: integrationId,
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
      },
      ['credentials']
    );

    const decrypted = decryptCredentials(integration?.credentials ?? encryptCredentials({}));
    expect(decrypted.externalEnvironmentId).to.equal(FAKE_EXTERNAL_ENV_ID);
  });

  it('should return demo quota for agents on novu-anthropic integration', async () => {
    const integrationId = await createNovuAnthropicIntegration();
    const identifier = `e2e-demo-quota-${Date.now()}`;
    createdAgentIdentifiers.push(identifier);

    await session.testAgent.post('/v1/agents').send({
      name: 'Demo Quota Agent',
      identifier,
      runtime: 'managed',
      managedRuntime: {
        providerId: AgentRuntimeProviderIdEnum.NovuAnthropic,
        integrationId,
      },
    });

    const quotaRes = await session.testAgent.get(`/v1/agents/${encodeURIComponent(identifier)}/demo-quota`);

    expect(quotaRes.status).to.equal(200);
    expect(quotaRes.body.data.isDemoAgent).to.equal(true);
    expect(quotaRes.body.data.conversations.limit).to.equal(10);
  });

  it('should migrate agent runtime to user Anthropic integration', async () => {
    const demoIntegrationId = await createNovuAnthropicIntegration();
    const identifier = `e2e-demo-migrate-${Date.now()}`;
    createdAgentIdentifiers.push(identifier);

    await session.testAgent.post('/v1/agents').send({
      name: 'Migrate Demo Agent',
      identifier,
      runtime: 'managed',
      managedRuntime: {
        providerId: AgentRuntimeProviderIdEnum.NovuAnthropic,
        integrationId: demoIntegrationId,
      },
    });

    const userIntegrationRes = await session.testAgent.post('/v1/integrations').send({
      providerId: AgentRuntimeProviderIdEnum.Anthropic,
      kind: IntegrationKindEnum.AGENT,
      credentials: { apiKey: 'sk-user-anthropic-key' },
      active: true,
      name: `user-anthropic-e2e-${Date.now()}`,
    });

    expect(userIntegrationRes.status).to.equal(201);
    const userIntegrationId: string =
      userIntegrationRes.body._id ?? userIntegrationRes.body.data?._id ?? userIntegrationRes.body.data?.id;
    createdIntegrationIds.push(userIntegrationId);

    const migrateRes = await session.testAgent
      .post(`/v1/agents/${encodeURIComponent(identifier)}/migrate-runtime`)
      .send({ integrationId: userIntegrationId });

    expect(migrateRes.status).to.equal(201);
    expect(migrateRes.body.data.externalAgentId).to.equal('ext-user-agent');

    const agent = await agentRepository.findOne(
      {
        identifier,
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
      },
      ['managedRuntime']
    );

    expect(agent?.managedRuntime?.providerId).to.equal(AgentRuntimeProviderIdEnum.Anthropic);
    expect(String(agent?.managedRuntime?._integrationId)).to.equal(userIntegrationId);
  });
});
