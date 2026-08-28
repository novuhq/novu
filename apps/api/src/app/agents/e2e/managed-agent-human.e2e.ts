import {
  ConversationActivityRepository,
  ConversationActivityTypeEnum,
  ConversationRepository,
  type HumanInteractionEntity,
  HumanInteractionRepository,
} from '@novu/dal';
import { AgentRuntimeProviderIdEnum, HumanInteractionStatusEnum, IntegrationKindEnum } from '@novu/shared';
import { testServer, UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { OutboundGateway } from '../conversation-runtime/egress/outbound.gateway';
import { buildHumanApproveActionId } from '../human-relay/human-action-id';
import { HumanConversationInboundInterceptor } from '../human-relay/human-conversation-inbound.interceptor';
import { ManagedAgentService } from '../managed-runtime/managed-agent.service';
import { ManagedAgentProviderFactory } from '../managed-runtime/managed-agent-provider-factory.service';
import { HandlePendingToolApprovalsCommand } from '../managed-runtime/tool-approval/handle-pending-tool-approvals.command';
import { HandlePendingToolApprovals } from '../managed-runtime/tool-approval/handle-pending-tool-approvals.usecase';
import { AgentEventEnum } from '../shared/enums/agent-event.enum';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';
import { stubResolveAgentRuntime } from './helpers/stub-resolve-agent-runtime';

const FAKE_API_KEY = 'sk-fake-anthropic-key-for-hitl-e2e';
const FAKE_EXTERNAL_AGENT_ID = 'ext-agent-hitl-e2e';
const FAKE_EXTERNAL_ENV_ID = 'env_01XJ5HitlEnvE2E';

const conversationRepository = new ConversationRepository();
const humanInteractionRepository = new HumanInteractionRepository();
const activityRepository = new ConversationActivityRepository();

function buildMockProvider(overrides: Partial<Record<string, sinon.SinonStub>> = {}) {
  return {
    providerId: AgentRuntimeProviderIdEnum.Anthropic,
    capabilities: { mcpServers: true, tools: true, model: true, systemPrompt: true, skills: true, tokenVault: true },
    validateCredentials: sinon.stub().resolves(),
    createAgent: sinon.stub().resolves({ externalAgentId: FAKE_EXTERNAL_AGENT_ID }),
    deleteAgent: sinon.stub().resolves(),
    getAgent: sinon.stub().resolves({ externalAgentId: FAKE_EXTERNAL_AGENT_ID, name: 'HITL E2E Agent' }),
    getEnvironment: sinon.stub().resolves({ id: FAKE_EXTERNAL_ENV_ID, name: 'Default Env' }),
    getConfig: sinon.stub().resolves({
      model: 'claude-3-5-sonnet-20241022',
      systemPrompt: '',
      mcpServers: [],
      tools: [],
      skills: [],
    }),
    refreshPlatformDefinition: sinon.stub().resolves(undefined),
    updateConfig: sinon.stub().resolves({
      model: 'claude-3-5-sonnet-20241022',
      systemPrompt: '',
      mcpServers: [],
      tools: [],
      skills: [],
    }),
    provisionIntegration: sinon.stub().resolves({
      credentialsUpdate: { externalEnvironmentId: FAKE_EXTERNAL_ENV_ID },
      metadata: {},
    }),
    deprovisionIntegration: sinon.stub().resolves(),
    uploadSkill: sinon.stub().resolves({ skillId: 'skill_novu_hitl_e2e', version: 'v1' }),
    getAllPendingToolApprovals: sinon.stub().resolves([]),
    ...overrides,
  };
}

describe('Managed agent HITL novu_human #novu-v2', () => {
  let session: UserSession;
  let mockProvider: ReturnType<typeof buildMockProvider>;
  let sendToolResult: sinon.SinonStub;
  const createdAgentIdentifiers: string[] = [];
  const createdIntegrationIds: string[] = [];

  const previousConversationalAgentsFlag = process.env.IS_CONVERSATIONAL_AGENTS_ENABLED;
  const previousManagedRuntimeFlag = process.env.IS_MANAGED_AGENT_RUNTIME_ENABLED;
  const previousHitlFlag = process.env.IS_AGENT_HUMAN_HITL_ENABLED;

  before(() => {
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
    process.env.IS_MANAGED_AGENT_RUNTIME_ENABLED = 'true';
    process.env.IS_AGENT_HUMAN_HITL_ENABLED = 'true';
  });

  after(() => {
    restoreEnv('IS_CONVERSATIONAL_AGENTS_ENABLED', previousConversationalAgentsFlag);
    restoreEnv('IS_MANAGED_AGENT_RUNTIME_ENABLED', previousManagedRuntimeFlag);
    restoreEnv('IS_AGENT_HUMAN_HITL_ENABLED', previousHitlFlag);
  });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    mockProvider = buildMockProvider();
    stubResolveAgentRuntime(mockProvider as any);

    const providerFactory = testServer.getService(ManagedAgentProviderFactory);
    sinon.stub(providerFactory, 'tryGetByAgentIdentifier').resolves(mockProvider as any);

    const outboundGateway = testServer.getService(OutboundGateway);
    sinon
      .stub(outboundGateway, 'postToConversation')
      .resolves({ messageId: 'platform-hitl-msg-1', platformThreadId: 'thread-hitl-1' });
    sinon.stub(outboundGateway, 'editInConversation').resolves();
    sinon.stub(outboundGateway, 'replyOnThread').resolves();

    const managedAgentService = testServer.getService(ManagedAgentService);
    sendToolResult = sinon.stub(managedAgentService, 'sendToolResult').resolves();
  });

  afterEach(async () => {
    sinon.restore();

    for (const identifier of createdAgentIdentifiers) {
      await session.testAgent.delete(`/v1/agents/${encodeURIComponent(identifier)}`).catch(() => {});
    }
    createdAgentIdentifiers.length = 0;
  });

  async function createAgentRuntimeIntegration(): Promise<string> {
    const res = await session.testAgent.post('/v1/integrations').send({
      providerId: AgentRuntimeProviderIdEnum.Anthropic,
      kind: IntegrationKindEnum.AGENT,
      credentials: { apiKey: FAKE_API_KEY },
      active: true,
      name: `anthropic-hitl-e2e-${Date.now()}`,
    });

    expect(res.status, `createAgentRuntimeIntegration failed: ${JSON.stringify(res.body)}`).to.equal(201);
    const integrationId: string = res.body._id ?? res.body.data?._id ?? res.body.data?.id;
    createdIntegrationIds.push(integrationId);

    return integrationId;
  }

  async function createManagedAgent(overrides: Record<string, unknown> = {}) {
    const integrationId = await createAgentRuntimeIntegration();
    const identifier = `e2e-hitl-${Date.now()}`;
    createdAgentIdentifiers.push(identifier);

    const res = await session.testAgent.post('/v1/agents').send({
      name: 'Managed HITL E2E Agent',
      identifier,
      runtime: 'managed',
      managedRuntime: {
        providerId: AgentRuntimeProviderIdEnum.Anthropic,
        integrationId,
        ...overrides,
      },
    });

    expect(res.status, `create managed agent failed: ${JSON.stringify(res.body)}`).to.equal(201);

    return {
      agentId: res.body.data._id as string,
      agentIdentifier: identifier,
      integrationId,
      integrationIdentifier: 'slack-hitl-e2e',
    };
  }

  async function seedManagedConversation(agentId: string, integrationId: string) {
    const platformThreadId = `thread-hitl-${Date.now()}`;
    const conversation = await conversationRepository.create({
      identifier: `conv-hitl-${Date.now()}`,
      _agentId: agentId,
      participants: [
        { type: 'agent' as const, id: agentId },
        { type: 'subscriber' as const, id: session.subscriberId },
      ],
      channels: [
        {
          platform: 'slack',
          _integrationId: integrationId,
          platformThreadId,
        },
      ],
      status: 'active',
      title: 'Managed HITL conversation',
      metadata: {},
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      lastActivityAt: new Date().toISOString(),
    });

    return { conversation, platformThreadId };
  }

  async function dispatchNovuHuman(params: {
    agentId: string;
    agentIdentifier: string;
    integrationId: string;
    kind: 'ask' | 'approve' | 'choose' | 'tell';
    prompt: string;
    options?: string[];
    toolUseId?: string;
    sessionId?: string;
  }) {
    const { conversation, platformThreadId } = await seedManagedConversation(params.agentId, params.integrationId);
    const toolUseId = params.toolUseId ?? `sevt_${Date.now()}`;
    const sessionId = params.sessionId ?? `ses_${Date.now()}`;
    const handlePending = testServer.getService(HandlePendingToolApprovals);

    await handlePending.execute(
      HandlePendingToolApprovalsCommand.create({
        userId: session.user._id,
        environmentId: session.environment._id,
        organizationId: session.organization._id,
        conversationId: conversation._id,
        agentIdentifier: params.agentIdentifier,
        integrationIdentifier: 'slack-hitl-e2e',
        subscriberId: session.subscriberId,
        platform: AgentPlatformEnum.SLACK,
        platformThreadId,
        sessionId,
        response: {
          messages: [],
          finishReason: 'requires-action',
          actionsRequired: [
            {
              type: 'direct-approval',
              toolUseId,
              toolName: 'novu_human',
              input: {
                kind: params.kind,
                prompt: params.prompt,
                ...(params.options ? { options: params.options } : {}),
              },
            },
          ],
        } as any,
      })
    );

    const interaction = await humanInteractionRepository.findOne({
      _environmentId: session.environment._id,
      requestId: `novu_human:${sessionId}:${toolUseId}`,
    });

    return { conversation, platformThreadId, toolUseId, sessionId, interaction: requireInteraction(interaction) };
  }

  it('creates a HumanInteraction for approve and does not post an MCP approval card', async () => {
    const agent = await createManagedAgent();
    const { interaction, conversation } = await dispatchNovuHuman({
      ...agent,
      kind: 'approve',
      prompt: 'Delete these rows?',
    });

    expect(interaction.kind).to.equal('approve');
    expect(interaction.status).to.equal(HumanInteractionStatusEnum.PENDING);
    expect(interaction.prompt).to.equal('Delete these rows?');
    expect(sendToolResult.called).to.equal(false);

    const activities = await activityRepository.findByConversation(session.environment._id, conversation._id);
    expect(
      activities.some((activity) => activity.type === ConversationActivityTypeEnum.TOOL_APPROVAL_REQUEST)
    ).to.equal(false);
  });

  it('resumes the parked session with the verdict when the human clicks approve', async () => {
    const agent = await createManagedAgent();
    const { interaction, conversation, platformThreadId, toolUseId } = await dispatchNovuHuman({
      ...agent,
      kind: 'approve',
      prompt: 'Deploy v2?',
    });

    sendToolResult.resetHistory();

    const interceptor = testServer.getService(HumanConversationInboundInterceptor);
    const consumed = await interceptor.tryHandleAction({
      agentId: agent.agentId,
      agent: { _id: agent.agentId, runtime: 'managed' },
      config: {
        environmentId: session.environment._id,
        organizationId: session.organization._id,
        platform: AgentPlatformEnum.SLACK,
        agentId: agent.agentId,
        agentIdentifier: agent.agentIdentifier,
        integrationIdentifier: 'slack-hitl-e2e',
      },
      conversation,
      subscriber: { subscriberId: session.subscriberId },
      message: null,
      event: AgentEventEnum.ON_ACTION,
      thread: { id: platformThreadId, post: async () => ({ id: 'reply' }) },
      platformThreadId,
      action: { id: buildHumanApproveActionId(interaction.identifier) },
    } as any);

    expect(consumed).to.equal(true);
    expect(sendToolResult.calledOnce).to.equal(true);
    const payload = JSON.parse(sendToolResult.firstCall.args[0].content);
    expect(sendToolResult.firstCall.args[0].toolUseId).to.equal(toolUseId);
    expect(sendToolResult.firstCall.args[0].approved).to.equal(undefined);
    expect(payload).to.include({ ok: true, kind: 'approve', status: 'approved', approved: true });
  });

  it('resumes with a terminal result when the interaction is canceled', async () => {
    const agent = await createManagedAgent();
    const { interaction, toolUseId } = await dispatchNovuHuman({
      ...agent,
      kind: 'approve',
      prompt: 'Ship it?',
    });

    sendToolResult.resetHistory();

    const res = await session.testAgent.post(`/v1/human/interactions/${interaction.identifier}/cancel`);
    expect(res.status).to.equal(200);
    expect(res.body.data.status).to.equal(HumanInteractionStatusEnum.CANCELED);
    expect(sendToolResult.calledOnce).to.equal(true);
    expect(sendToolResult.firstCall.args[0].toolUseId).to.equal(toolUseId);
    expect(JSON.parse(sendToolResult.firstCall.args[0].content)).to.include({
      ok: false,
      status: 'canceled',
      expired: false,
    });
  });

  it('resumes with expired when a GET lazy-expires an overdue correlated row', async () => {
    const agent = await createManagedAgent();
    const { interaction, toolUseId } = await dispatchNovuHuman({
      ...agent,
      kind: 'ask',
      prompt: 'Which environment?',
    });

    await humanInteractionRepository.update(
      { _id: interaction._id, _environmentId: session.environment._id },
      { $set: { expiresAt: new Date(Date.now() - 1000).toISOString() } }
    );
    sendToolResult.resetHistory();

    const res = await session.testAgent.get(`/v1/human/interactions/${interaction.identifier}`);
    expect(res.status).to.equal(200);
    expect(res.body.data.status).to.equal(HumanInteractionStatusEnum.EXPIRED);
    expect(sendToolResult.calledOnce).to.equal(true);
    expect(sendToolResult.firstCall.args[0].toolUseId).to.equal(toolUseId);
    expect(JSON.parse(sendToolResult.firstCall.args[0].content)).to.include({
      ok: false,
      status: 'expired',
      expired: true,
    });
  });

  it('delivers tell and sendToolResult in the same turn', async () => {
    const agent = await createManagedAgent();
    const { interaction } = await dispatchNovuHuman({
      ...agent,
      kind: 'tell',
      prompt: 'Deploy finished.',
    });

    expect(interaction.status).to.equal(HumanInteractionStatusEnum.DELIVERED);
    expect(sendToolResult.calledOnce).to.equal(true);
    expect(JSON.parse(sendToolResult.firstCall.args[0].content)).to.include({
      ok: true,
      kind: 'tell',
      status: 'delivered',
    });
  });

  it('uploads and attaches the Novu HITL skill at provision even without Read', async () => {
    await createManagedAgent({ tools: ['bash'] });

    expect(mockProvider.uploadSkill.calledOnce).to.equal(true);
    const createArg = mockProvider.createAgent.firstCall.args[0];
    expect(createArg.skills).to.deep.equal([{ type: 'custom', skillId: 'skill_novu_hitl_e2e', version: 'v1' }]);
  });
});

function restoreEnv(key: string, previous: string | undefined) {
  if (previous === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = previous;
  }
}

function requireInteraction(interaction: HumanInteractionEntity | null): HumanInteractionEntity {
  expect(interaction, 'HumanInteraction should be created').to.exist;
  if (!interaction) {
    throw new Error('expected HumanInteraction');
  }

  return interaction;
}
