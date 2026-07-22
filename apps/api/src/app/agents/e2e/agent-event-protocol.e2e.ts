import { encryptCredentials } from '@novu/application-generic';
import {
  AgentIntegrationRepository,
  ChannelConnectionRepository,
  ConversationActivitySenderTypeEnum,
  ConversationActivityTypeEnum,
  IntegrationRepository,
} from '@novu/dal';
import {
  AgentRuntimeProviderIdEnum,
  ChannelTypeEnum,
  ChatProviderIdEnum,
  FeatureFlagsKeysEnum,
  IntegrationKindEnum,
} from '@novu/shared';
import { testServer, UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';

import { OutboundGateway } from '../conversation-runtime/egress/outbound.gateway';
import { BridgeExecutorService } from '../conversation-runtime/runtime/bridge-executor.service';
import { ManagedAgentService } from '../managed-runtime/managed-agent.service';
import { activityRepository, conversationRepository, seedConversation } from './helpers/agent-test-setup';
import { stubResolveAgentRuntime } from './helpers/stub-resolve-agent-runtime';

const THALAMUS_WEBHOOK_SECRET = 'e2e-thalamus-webhook-secret';
const FAKE_API_KEY = 'sk-fake-anthropic-key-for-e2e';
const FAKE_EXTERNAL_AGENT_ID = 'ext-agent-protocol-e2e';
const FAKE_EXTERNAL_ENV_ID = 'env_01ProtocolE2E';
const SLACK_SIGNING_SECRET = 'test-slack-signing-secret-protocol-e2e';
const SLACK_BOT_TOKEN = 'xoxb-fake-bot-token-protocol-e2e';

process.env.THALAMUS_WEBHOOK_SECRET = THALAMUS_WEBHOOK_SECRET;
process.env.THALAMUS_CF_URL = 'http://127.0.0.1:7890';

const integrationRepository = new IntegrationRepository();
const agentIntegrationRepository = new AgentIntegrationRepository();
const channelConnectionRepository = new ChannelConnectionRepository();

interface ManagedProtocolContext {
  session: UserSession;
  agentId: string;
  agentIdentifier: string;
  integrationId: string;
  integrationIdentifier: string;
  conversationId: string;
  platformThreadId: string;
}

interface ThalamusWebhookPayload {
  sessionId: string;
  runId: string;
  turnId: string;
  sequence: number;
  metadata: Record<string, string>;
  event: Record<string, unknown>;
}

async function signThalamusWebhook(rawBody: string, secret: string): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const signedPayload = `${timestamp}.${rawBody}`;
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
  const expectedHex = Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return `t=${timestamp},v1=${expectedHex}`;
}

async function pollFor<T>(fn: () => Promise<T | null | undefined>, timeoutMs: number, intervalMs = 50): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const result = await fn();
      if (result) {
        return result;
      }
    } catch (err) {
      lastError = err;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    `pollFor timed out after ${timeoutMs}ms${lastError ? `; last error: ${(lastError as Error).message}` : ''}`
  );
}

function buildMockProvider() {
  return {
    providerId: AgentRuntimeProviderIdEnum.Anthropic,
    capabilities: { mcpServers: true, tools: true, model: true, systemPrompt: true, skills: true, tokenVault: true },
    validateCredentials: sinon.stub().resolves(),
    createAgent: sinon.stub().resolves({ externalAgentId: FAKE_EXTERNAL_AGENT_ID }),
    deleteAgent: sinon.stub().resolves(),
    getAgent: sinon.stub().resolves({ externalAgentId: FAKE_EXTERNAL_AGENT_ID, name: 'Protocol E2E Agent' }),
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
    createVault: sinon.stub().resolves({ externalVaultId: 'vlt_protocol_e2e' }),
    upsertVaultCredential: sinon.stub().resolves({ vaultCredentialId: 'vltc_protocol_e2e' }),
    deleteVaultCredential: sinon.stub().resolves(),
    getAllPendingToolApprovals: sinon.stub().resolves([]),
  };
}

describe('AgentEvent protocol — managed webhook path #novu-v2', () => {
  let ctx: ManagedProtocolContext;
  let sequence = 0;

  const previousConversationalAgentsFlag = process.env.IS_CONVERSATIONAL_AGENTS_ENABLED;
  const previousManagedRuntimeFlag = process.env.IS_MANAGED_AGENT_RUNTIME_ENABLED;
  const previousProtocolFlag = process.env[FeatureFlagsKeysEnum.IS_AGENT_EVENT_PROTOCOL_ENABLED];
  const previousThalamusSecret = process.env.THALAMUS_WEBHOOK_SECRET;
  const previousThalamusCfUrl = process.env.THALAMUS_CF_URL;

  const createdAgentIdentifiers: string[] = [];
  const createdIntegrationIds: string[] = [];

  before(() => {
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
    process.env.IS_MANAGED_AGENT_RUNTIME_ENABLED = 'true';
    process.env[FeatureFlagsKeysEnum.IS_AGENT_EVENT_PROTOCOL_ENABLED] = 'true';

    const managedAgentService = testServer.getService(ManagedAgentService);
    managedAgentService.onModuleInit();
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

    if (previousProtocolFlag === undefined) {
      delete process.env[FeatureFlagsKeysEnum.IS_AGENT_EVENT_PROTOCOL_ENABLED];
    } else {
      process.env[FeatureFlagsKeysEnum.IS_AGENT_EVENT_PROTOCOL_ENABLED] = previousProtocolFlag;
    }

    if (previousThalamusSecret === undefined) {
      delete process.env.THALAMUS_WEBHOOK_SECRET;
    } else {
      process.env.THALAMUS_WEBHOOK_SECRET = previousThalamusSecret;
    }

    if (previousThalamusCfUrl === undefined) {
      delete process.env.THALAMUS_CF_URL;
    } else {
      process.env.THALAMUS_CF_URL = previousThalamusCfUrl;
    }
  });

  beforeEach(async () => {
    ctx = await setupManagedProtocolContext();
    sequence = 0;

    const bridgeExecutor = testServer.getService(BridgeExecutorService);
    sinon.stub(bridgeExecutor, 'execute').resolves();

    const outboundGateway = testServer.getService(OutboundGateway);
    sinon
      .stub(outboundGateway, 'postToConversation')
      .resolves({ messageId: 'platform-msg-protocol', platformThreadId: ctx.platformThreadId });
    sinon
      .stub(outboundGateway, 'editInConversation')
      .resolves({ messageId: 'platform-msg-protocol', platformThreadId: ctx.platformThreadId });
    sinon.stub(outboundGateway, 'reactToMessage').resolves();
    sinon.stub(outboundGateway, 'deleteInConversation').resolves();
    sinon.stub(outboundGateway, 'removeReaction').resolves();
    sinon.stub(outboundGateway, 'startTypingInConversation').resolves();
    sinon.stub(outboundGateway, 'stopTypingInConversation').resolves();
  });

  afterEach(async () => {
    if (!ctx) {
      return;
    }

    for (const identifier of createdAgentIdentifiers) {
      await ctx.session.testAgent.delete(`/v1/agents/${encodeURIComponent(identifier)}`).catch(() => {});
    }
    createdAgentIdentifiers.length = 0;

    for (const id of createdIntegrationIds) {
      await integrationRepository.delete({ _id: id, _organizationId: ctx.session.organization._id }).catch(() => {});
    }
    createdIntegrationIds.length = 0;
  });

  async function createAgentRuntimeIntegration(session: UserSession): Promise<string> {
    const res = await session.testAgent.post('/v1/integrations').send({
      providerId: AgentRuntimeProviderIdEnum.Anthropic,
      kind: IntegrationKindEnum.AGENT,
      credentials: { apiKey: FAKE_API_KEY },
      active: true,
      name: `anthropic-protocol-e2e-${Date.now()}`,
    });

    expect(res.status, `createAgentRuntimeIntegration failed: ${JSON.stringify(res.body)}`).to.equal(201);
    const integrationId: string = res.body._id ?? res.body.data?._id ?? res.body.data?.id;
    createdIntegrationIds.push(integrationId);

    return integrationId;
  }

  async function setupManagedProtocolContext(): Promise<ManagedProtocolContext> {
    const session = new UserSession();
    await session.initialize();

    stubResolveAgentRuntime(buildMockProvider());

    const runtimeIntegrationId = await createAgentRuntimeIntegration(session);
    const agentIdentifier = `e2e-protocol-agent-${Date.now()}`;
    createdAgentIdentifiers.push(agentIdentifier);

    const createAgentRes = await session.testAgent.post('/v1/agents').send({
      name: 'Protocol E2E Agent',
      identifier: agentIdentifier,
      runtime: 'managed',
      managedRuntime: {
        providerId: AgentRuntimeProviderIdEnum.Anthropic,
        integrationId: runtimeIntegrationId,
      },
    });

    expect(createAgentRes.status, `create managed agent failed: ${JSON.stringify(createAgentRes.body)}`).to.equal(201);
    const agentId = createAgentRes.body.data._id as string;

    const slackIntegration = await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      providerId: ChatProviderIdEnum.Slack,
      channel: ChannelTypeEnum.CHAT,
      credentials: encryptCredentials({ signingSecret: SLACK_SIGNING_SECRET }),
      active: true,
      name: 'Slack Protocol E2E',
      identifier: `slack-protocol-e2e-${Date.now()}`,
      priority: 1,
      primary: false,
      deleted: false,
    });

    await agentIntegrationRepository.create({
      _agentId: agentId,
      _integrationId: slackIntegration._id,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    await channelConnectionRepository.create({
      identifier: `conn-protocol-e2e-${Date.now()}`,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      integrationIdentifier: slackIntegration.identifier,
      providerId: ChatProviderIdEnum.Slack,
      channel: ChannelTypeEnum.CHAT,
      contextKeys: [],
      workspace: { id: 'W_PROTOCOL', name: 'Protocol Workspace' },
      auth: { accessToken: SLACK_BOT_TOKEN },
    });

    const agentTestContext = {
      session,
      agentId,
      agentIdentifier,
      integrationId: slackIntegration._id,
      integrationIdentifier: slackIntegration.identifier,
      signingSecret: SLACK_SIGNING_SECRET,
    };

    const conversationId = await seedConversation(agentTestContext);
    const conversation = await conversationRepository.findOne(
      { _id: conversationId, _environmentId: session.environment._id },
      '*'
    );

    if (!conversation?.channels?.[0]?.platformThreadId) {
      throw new Error('seeded conversation is missing a platform thread id');
    }

    const platformThreadId = conversation.channels[0].platformThreadId;

    return {
      session,
      agentId,
      agentIdentifier,
      integrationId: slackIntegration._id,
      integrationIdentifier: slackIntegration.identifier,
      conversationId,
      platformThreadId,
    };
  }

  function buildMetadata(sessionId: string): Record<string, string> {
    return {
      conversationId: ctx.conversationId,
      environmentId: ctx.session.environment._id,
      organizationId: ctx.session.organization._id,
      agentIdentifier: ctx.agentIdentifier,
      integrationIdentifier: ctx.integrationIdentifier,
      agentId: ctx.agentId,
      subscriberId: '',
      platform: 'slack',
      platformThreadId: ctx.platformThreadId,
      sessionId,
    };
  }

  async function postThalamusWebhook(payload: ThalamusWebhookPayload) {
    const rawBody = JSON.stringify(payload);
    const signature = await signThalamusWebhook(rawBody, THALAMUS_WEBHOOK_SECRET);

    const res = await ctx.session.testAgent
      .post('/v1/agents/events')
      .set('x-thalamus-signature', signature)
      .set('content-type', 'application/json')
      .send(rawBody);

    expect(res.status, `Thalamus webhook failed: ${JSON.stringify(res.body)}`).to.equal(200);

    return res;
  }

  async function deliverSignedSequence(
    sessionId: string,
    runId: string,
    turnId: string,
    events: Record<string, unknown>[]
  ) {
    const metadata = buildMetadata(sessionId);

    for (const event of events) {
      sequence += 1;
      await postThalamusWebhook({
        sessionId,
        runId,
        turnId,
        sequence,
        metadata,
        event,
      });
    }
  }

  it('persists an agent reply activity when stream-start → message → finish(end_turn) webhooks arrive', async () => {
    const sessionId = `sess_reply_${Date.now()}`;
    const runId = `run_reply_${Date.now()}`;
    const turnId = `turn_reply_${Date.now()}`;
    const replyMarkdown = 'Hello from the AgentEvent protocol path';

    await deliverSignedSequence(sessionId, runId, turnId, [
      { type: 'stream-start' },
      { type: 'message', text: replyMarkdown },
      {
        type: 'finish',
        response: {
          messages: [replyMarkdown],
          finishReason: 'stop',
          usage: { input_tokens: 12, output_tokens: 18 },
        },
      },
    ]);

    const agentActivity = await pollFor(async () => {
      const activities = await activityRepository.findByConversation(ctx.session.environment._id, ctx.conversationId);
      const match = activities.find(
        (activity) =>
          activity.senderType === ConversationActivitySenderTypeEnum.AGENT &&
          activity.type === ConversationActivityTypeEnum.MESSAGE &&
          activity.content === replyMarkdown
      );

      return match ?? null;
    }, 10_000);

    expect(agentActivity).to.exist;

    if (!agentActivity) {
      throw new Error('expected agent reply activity to be persisted');
    }

    expect(agentActivity.content).to.equal(replyMarkdown);
  });

  it('persists a pending approval card activity when finish requires-action with actionsRequired', async () => {
    const sessionId = `sess_approval_${Date.now()}`;
    const runId = `run_approval_${Date.now()}`;
    const turnId = `turn_approval_${Date.now()}`;
    const toolUseId = `tool_use_${Date.now()}`;

    await deliverSignedSequence(sessionId, runId, turnId, [
      { type: 'stream-start' },
      {
        type: 'finish',
        response: {
          messages: [],
          finishReason: 'requires-action',
          actionsRequired: [
            {
              type: 'mcp-approval',
              toolUseId,
              toolName: 'issueRefund',
              serverName: 'linear',
              input: { amount: 100 },
            },
          ],
        },
      },
    ]);

    const approvalActivity = await pollFor(async () => {
      const activities = await activityRepository.findByConversation(ctx.session.environment._id, ctx.conversationId);
      const match = activities.find(
        (activity) =>
          activity.type === ConversationActivityTypeEnum.TOOL_APPROVAL_REQUEST &&
          activity.toolData?.approvalId === toolUseId
      );

      return match ?? null;
    }, 10_000);

    expect(approvalActivity).to.exist;

    if (!approvalActivity) {
      throw new Error('expected pending approval activity to be persisted');
    }

    expect(approvalActivity.toolData?.toolName).to.equal('issueRefund');
    expect(approvalActivity.toolData?.toolCallId).to.equal(toolUseId);
  });
});
