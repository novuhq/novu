import { AgentRuntimeUnauthorizedError } from '@novu/application-generic';
import * as AnthropicProviderModule from '@novu/application-generic/build/main/agent-runtimes/anthropic/anthropic-agent-runtime.provider';
import { AgentRuntimeProviderIdEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';

const FAKE_API_KEY = 'sk-fake-anthropic-key-for-verify-e2e';

function buildMockProvider(overrides: Partial<Record<string, sinon.SinonStub>> = {}) {
  return {
    providerId: AgentRuntimeProviderIdEnum.Anthropic,
    capabilities: { mcpServers: true, tools: true, model: true, systemPrompt: true, skills: true },
    validateCredentials: sinon.stub().resolves(),
    createAgent: sinon.stub().resolves({ externalAgentId: 'ext-agent' }),
    deleteAgent: sinon.stub().resolves(),
    getAgent: sinon.stub().resolves({ externalAgentId: 'ext-agent', name: 'Agent' }),
    getEnvironment: sinon.stub().resolves({ id: 'env-id', name: 'Default' }),
    getConfig: sinon.stub().resolves({ model: 'claude', systemPrompt: '', mcpServers: [], tools: [] }),
    updateConfig: sinon.stub().resolves({ model: 'claude', systemPrompt: '', mcpServers: [], tools: [] }),
    provisionIntegration: sinon
      .stub()
      .resolves({ credentialsUpdate: { externalEnvironmentId: 'env-id' }, metadata: {} }),
    deprovisionIntegration: sinon.stub().resolves(),
    ...overrides,
  };
}

describe('Verify Managed Credentials API #novu-v2', () => {
  let session: UserSession;
  let mockProvider: ReturnType<typeof buildMockProvider>;

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
    sinon.stub(AnthropicProviderModule, 'createAnthropicProvider').returns(mockProvider as never);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('POST /v1/agents/verify-credentials', () => {
    it('returns { valid: true } when the provider accepts the credentials', async () => {
      const res = await session.testAgent.post('/v1/agents/verify-credentials').send({
        providerId: AgentRuntimeProviderIdEnum.Anthropic,
        apiKey: FAKE_API_KEY,
      });

      expect(res.status).to.equal(201);
      expect(res.body.data?.valid ?? res.body.valid).to.equal(true);
      expect(mockProvider.validateCredentials.calledOnce, 'validateCredentials should be called once').to.be.true;
      expect(mockProvider.validateCredentials.firstCall.args[0]).to.deep.equal({ apiKey: FAKE_API_KEY });
    });

    it('returns 401 when the provider rejects the API key', async () => {
      mockProvider.validateCredentials.rejects(
        new AgentRuntimeUnauthorizedError('Invalid API key', AgentRuntimeProviderIdEnum.Anthropic)
      );

      const res = await session.testAgent.post('/v1/agents/verify-credentials').send({
        providerId: AgentRuntimeProviderIdEnum.Anthropic,
        apiKey: 'invalid-key',
      });

      expect(res.status).to.equal(401);
      expect(res.body.message).to.match(/invalid api key/i);
    });

    it('returns 4xx when the body is missing required fields', async () => {
      const res = await session.testAgent
        .post('/v1/agents/verify-credentials')
        .send({ providerId: AgentRuntimeProviderIdEnum.Anthropic });

      expect(res.status).to.be.oneOf([400, 422]);
    });

    it('returns 401 when the request is unauthenticated', async () => {
      const res = await session.testAgent
        .post('/v1/agents/verify-credentials')
        .set('Authorization', '')
        .send({ providerId: AgentRuntimeProviderIdEnum.Anthropic, apiKey: FAKE_API_KEY });

      expect(res.status).to.equal(401);
    });

    it('accepts anthropic-aws api key credentials when the provider validates', async () => {
      const res = await session.testAgent.post('/v1/agents/verify-credentials').send({
        providerId: AgentRuntimeProviderIdEnum.AnthropicAws,
        region: 'us-east-1',
        externalWorkspaceId: 'wrkspc_test',
        apiKey: FAKE_API_KEY,
      });

      expect(res.status).to.equal(201);
      expect(res.body.data?.valid ?? res.body.valid).to.equal(true);
      expect(mockProvider.validateCredentials.calledOnce).to.be.true;
      expect(mockProvider.validateCredentials.firstCall.args[0]).to.deep.equal({
        apiKey: FAKE_API_KEY,
        region: 'us-east-1',
        externalWorkspaceId: 'wrkspc_test',
      });
    });
  });
});
