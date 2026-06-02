import { decryptCredentials, encryptCredentials } from '@novu/application-generic';
import * as AgentRuntimeFactoryModule from '@novu/application-generic/build/main/agent-runtimes/agent-runtime.factory';
import { AgentRepository, IntegrationRepository } from '@novu/dal';
import { AgentRuntimeProviderIdEnum, IntegrationKindEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';

import { stubResolveAgentRuntime } from './helpers/stub-resolve-agent-runtime';

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
  let resolveAgentRuntimeStub: sinon.SinonStub;
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
    if (previousManagedClaudeKey === undefined) {
      delete process.env.NOVU_MANAGED_CLAUDE_API_KEY;
    } else {
      process.env.NOVU_MANAGED_CLAUDE_API_KEY = previousManagedClaudeKey;
    }
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
    resolveAgentRuntimeStub = stubResolveAgentRuntime(mockProvider, {
      resolve: (providerId, credentials) => {
        if (providerId === AgentRuntimeProviderIdEnum.NovuAnthropic) {
          return {
            apiKey: FAKE_MASTER_KEY,
            credentials: decryptCredentials(credentials ?? {}),
            provider: mockProvider,
            validateCredentialsInput: { apiKey: FAKE_MASTER_KEY },
          };
        }

        if (providerId === AgentRuntimeProviderIdEnum.Anthropic) {
          return {
            apiKey: 'sk-user-anthropic-key',
            credentials: decryptCredentials(credentials ?? {}),
            provider: buildMockProvider({
              providerId: AgentRuntimeProviderIdEnum.Anthropic,
              createAgent: sinon.stub().resolves({ externalAgentId: 'ext-user-agent' }),
            }),
            validateCredentialsInput: { apiKey: 'sk-user-anthropic-key' },
          };
        }

        return null;
      },
    });
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
    expect(mockProvider.provisionIntegration.firstCall.args[0].resourceName).to.equal(session.organization._id);
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

  it('should fetch runtime config using the Novu master key for demo integrations', async () => {
    const integrationId = await createNovuAnthropicIntegration();
    const identifier = `e2e-demo-runtime-config-${Date.now()}`;
    createdAgentIdentifiers.push(identifier);

    await session.testAgent.post('/v1/agents').send({
      name: 'Demo Runtime Config Agent',
      identifier,
      runtime: 'managed',
      managedRuntime: {
        providerId: AgentRuntimeProviderIdEnum.NovuAnthropic,
        integrationId,
      },
    });

    mockProvider.getConfig.resetHistory();
    resolveAgentRuntimeStub.resetHistory();

    const configRes = await session.testAgent.get(`/v1/agents/${encodeURIComponent(identifier)}/runtime/config`);

    expect(configRes.status).to.equal(200);
    expect(resolveAgentRuntimeStub.calledWith(AgentRuntimeProviderIdEnum.NovuAnthropic)).to.equal(true);
    expect(mockProvider.getConfig.calledOnce).to.equal(true);
    expect(configRes.body.data.tools).to.be.an('array');
  });

  it('should reject adopting an external provider agent on novu-anthropic integration', async () => {
    const integrationId = await createNovuAnthropicIntegration();
    const identifier = `e2e-demo-adopt-agent-${Date.now()}`;

    const res = await session.testAgent.post('/v1/agents').send({
      name: 'Should Not Adopt',
      identifier,
      runtime: 'managed',
      managedRuntime: {
        providerId: AgentRuntimeProviderIdEnum.NovuAnthropic,
        integrationId,
        externalAgentId: 'agent_owned_by_another_tenant',
      },
    });

    expect(res.status).to.equal(400);
    expect(res.body.message).to.include('Adopting an existing provider agent is not supported');
    expect(mockProvider.getAgent.called, 'getAgent should not run for blocked demo adopt').to.equal(false);
    expect(mockProvider.createAgent.called, 'createAgent should not run after adopt rejection').to.equal(false);
  });

  it('should reject adopting an external provider environment on novu-anthropic integration', async () => {
    const integrationId = await createNovuAnthropicIntegration();
    const identifier = `e2e-demo-adopt-env-${Date.now()}`;

    const res = await session.testAgent.post('/v1/agents').send({
      name: 'Should Not Adopt Env',
      identifier,
      runtime: 'managed',
      managedRuntime: {
        providerId: AgentRuntimeProviderIdEnum.NovuAnthropic,
        integrationId,
        externalEnvironmentId: 'env_owned_by_another_tenant',
      },
    });

    expect(res.status).to.equal(400);
    expect(res.body.message).to.include('Adopting an existing provider environment is not supported');
    expect(mockProvider.getEnvironment.called, 'getEnvironment should not run for blocked demo adopt').to.equal(false);
  });

  it('should delete demo agents locally without archiving upstream on deleteFromProvider', async () => {
    const integrationId = await createNovuAnthropicIntegration();
    const identifier = `e2e-demo-delete-${Date.now()}`;

    const createRes = await session.testAgent.post('/v1/agents').send({
      name: 'Demo Delete Agent',
      identifier,
      runtime: 'managed',
      managedRuntime: {
        providerId: AgentRuntimeProviderIdEnum.NovuAnthropic,
        integrationId,
      },
    });

    expect(createRes.status).to.equal(201);
    mockProvider.deleteAgent.resetHistory();

    const deleteRes = await session.testAgent
      .delete(`/v1/agents/${encodeURIComponent(identifier)}`)
      .query({ deleteFromProvider: 'true' });

    expect(deleteRes.status).to.equal(204);
    expect(mockProvider.deleteAgent.called, 'upstream deleteAgent should be skipped for demo').to.equal(false);

    const agent = await agentRepository.findOne(
      {
        identifier,
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
      },
      ['_id']
    );

    expect(agent).to.equal(null);
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

    const demoIntegration = await integrationRepository.findOne({
      _id: demoIntegrationId,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    expect(demoIntegration).to.equal(null);
  });
});
