import { encryptCredentials } from '@novu/application-generic';
import {
  AgentIntegrationRepository,
  ConversationActivityRepository,
  ConversationActivityTypeEnum,
  ConversationEntity,
  ConversationParticipantTypeEnum,
  ConversationRepository,
  IntegrationRepository,
  SubscriberRepository,
} from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum } from '@novu/shared';
import { testServer, UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { OutboundGateway } from '../conversation-runtime/egress/outbound.gateway';
import { ChatInstanceRegistry } from '../conversation-runtime/ingress/chat-instance.registry';
import { HandleAgentReplyCommand } from '../conversation-runtime/reply/handle-agent-reply/handle-agent-reply.command';
import { HandleAgentReply } from '../conversation-runtime/reply/handle-agent-reply/handle-agent-reply.usecase';
import { AgentExecutionParams, BridgeExecutorService } from '../conversation-runtime/runtime/bridge-executor.service';
import { AgentEventEnum } from '../shared/enums/agent-event.enum';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';
import { REPLY_APPROVAL_INSTRUCTIONS } from '../shared/tool-approval/reply-based-approval';
import { type SendblueApiStub, startSendblueApiStub } from './helpers/sendblue-api-stub';

const integrationRepository = new IntegrationRepository();
const agentIntegrationRepository = new AgentIntegrationRepository();
const subscriberRepository = new SubscriberRepository();
const conversationRepository = new ConversationRepository();
const conversationActivityRepository = new ConversationActivityRepository();

const SENDBLUE_WEBHOOK_SECRET = 'e2e-sendblue-webhook-secret';
const USER_PHONE = '+19998887777';
const AGENT_PHONE = '+15122164639';
// Mirrors the vendor `chat-adapter-sendblue` package's `encodeThreadId`:
// `sendblue:<b64url from>:<b64url contact>` for 1:1 threads.
const EXPECTED_THREAD_ID = `sendblue:${Buffer.from(AGENT_PHONE).toString('base64url')}:${Buffer.from(USER_PHONE).toString('base64url')}`;

const POLL_TIMEOUT_MS = 10_000;
const POLL_INTERVAL_MS = 50;

async function pollFor<T>(fn: () => Promise<T | null | undefined>, timeoutMs = POLL_TIMEOUT_MS): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (err) {
      lastError = err;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(
    `pollFor timed out after ${timeoutMs}ms${lastError ? `; last error: ${(lastError as Error).message}` : ''}`
  );
}

function buildReceivePayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    accountEmail: 'e2e@novu.test',
    content: 'Hello agent from iMessage',
    is_outbound: false,
    status: 'RECEIVED',
    message_handle: `e2e-handle-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    date_sent: new Date().toISOString(),
    from_number: USER_PHONE,
    number: USER_PHONE,
    to_number: AGENT_PHONE,
    media_url: '',
    message_type: 'message',
    group_id: '',
    participants: [USER_PHONE, AGENT_PHONE],
    sendblue_number: AGENT_PHONE,
    service: 'iMessage',
    ...overrides,
  };
}

describe('Sendblue agent webhook - inbound flow #novu-v2', () => {
  let session: UserSession;
  let agentId: string;
  let agentIdentifier: string;
  let integrationId: string;
  let integrationIdentifier: string;
  let bridgeCalls: AgentExecutionParams[];
  let sendblueApiStub: SendblueApiStub;

  before(async () => {
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
    sendblueApiStub = await startSendblueApiStub();
  });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    agentIdentifier = `e2e-sb-agent-${Date.now()}`;
    const createRes = await session.testAgent.post('/v1/agents').send({
      name: 'Sendblue E2E Agent',
      identifier: agentIdentifier,
    });
    agentId = createRes.body.data._id as string;

    const integration = await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      providerId: ChatProviderIdEnum.Sendblue,
      channel: ChannelTypeEnum.CHAT,
      credentials: encryptCredentials({
        apiKey: 'e2e-sendblue-api-key',
        secretKey: 'e2e-sendblue-secret-key',
        from: AGENT_PHONE,
        token: SENDBLUE_WEBHOOK_SECRET,
      }),
      active: true,
      name: 'Sendblue Agent E2E',
      identifier: `sendblue-agent-e2e-${Date.now()}`,
      priority: 1,
      primary: false,
      deleted: false,
    });
    integrationId = String(integration._id);
    integrationIdentifier = integration.identifier;

    await agentIntegrationRepository.create({
      _agentId: agentId,
      _integrationId: integration._id,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    bridgeCalls = [];
    const bridgeExecutor = testServer.getService(BridgeExecutorService);
    sinon.stub(bridgeExecutor, 'execute').callsFake(async (params: AgentExecutionParams) => {
      bridgeCalls.push(params);
    });
  });

  afterEach(async () => {
    const registry = testServer.getService(ChatInstanceRegistry);
    await registry.onModuleDestroy();
    sendblueApiStub.reset();
    sinon.restore();
  });

  async function postSendblueWebhook(
    payload: Record<string, unknown>,
    secret: string | null = SENDBLUE_WEBHOOK_SECRET
  ) {
    let request = session.testAgent
      .post(`/v1/agents/${agentId}/webhook/${integrationIdentifier}`)
      .set('content-type', 'application/json');

    if (secret !== null) {
      request = request.set('sb-signing-secret', secret);
    }

    return request.send(payload);
  }

  describe('inbound receive webhook (full chat SDK path)', () => {
    it('fires the bridge onMessage and creates a conversation for a signed receive payload', async () => {
      const res = await postSendblueWebhook(buildReceivePayload());
      expect(res.status).to.equal(200);

      await pollFor(async () => (bridgeCalls.length >= 1 ? true : null));

      const call = bridgeCalls[0];
      expect(call.config.platform).to.equal(AgentPlatformEnum.SENDBLUE);
      expect(call.config.integrationIdentifier).to.equal(integrationIdentifier);
      expect(call.message).to.exist;
      expect(call.message!.text).to.equal('Hello agent from iMessage');
      expect(call.platformContext.threadId).to.equal(EXPECTED_THREAD_ID);
      expect(call.platformContext.isDM).to.equal(true);

      const conversation = await pollFor(() =>
        conversationRepository.findByPlatformThread(
          session.environment._id,
          session.organization._id,
          agentId,
          integrationId,
          EXPECTED_THREAD_ID
        )
      );

      expect(conversation.channels[0].platform).to.equal(AgentPlatformEnum.SENDBLUE);
      expect(conversation.channels[0].platformThreadId).to.equal(EXPECTED_THREAD_ID);
    });

    it('resolves the subscriber by phone when subscriber.phone matches from_number', async () => {
      const subscriber = await subscriberRepository.create({
        subscriberId: `sub-sb-e2e-${Date.now()}`,
        firstName: 'Sendblue',
        lastName: 'Subscriber',
        phone: USER_PHONE,
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
      });

      const res = await postSendblueWebhook(buildReceivePayload({ content: 'Message from a known phone' }));
      expect(res.status).to.equal(200);

      await pollFor(async () => (bridgeCalls.length >= 1 ? true : null));

      expect(bridgeCalls[0].subscriber).to.exist;
      expect(bridgeCalls[0].subscriber!.subscriberId).to.equal(subscriber.subscriberId);

      const conversation = await pollFor(() =>
        conversationRepository.findByPlatformThread(
          session.environment._id,
          session.organization._id,
          agentId,
          integrationId,
          EXPECTED_THREAD_ID
        )
      );

      const subParticipant = conversation.participants.find(
        (p) => p.type === ConversationParticipantTypeEnum.SUBSCRIBER
      );
      expect(subParticipant).to.exist;
      expect(subParticipant!.id).to.equal(subscriber.subscriberId);
    });

    it('delivers an agent reply through the Sendblue send-message API', async () => {
      const res = await postSendblueWebhook(buildReceivePayload({ content: 'Trigger a reply' }));
      expect(res.status).to.equal(200);
      await pollFor(async () => (bridgeCalls.length >= 1 ? true : null));

      const outboundGateway = testServer.getService(OutboundGateway);
      const sent = await outboundGateway.postToConversation(
        agentId,
        integrationIdentifier,
        AgentPlatformEnum.SENDBLUE,
        EXPECTED_THREAD_ID,
        { markdown: 'Hi! This is your agent replying.' }
      );

      expect(sent.messageId).to.be.a('string');
      expect(sent.platformThreadId).to.equal(EXPECTED_THREAD_ID);

      const sendCall = sendblueApiStub.calls.find((call) => call.path === '/api/send-message');
      expect(sendCall, 'expected a send-message call against the Sendblue API stub').to.exist;
      expect(sendCall!.payload.number).to.equal(USER_PHONE);
      expect(sendCall!.payload.from_number).to.equal(AGENT_PHONE);
      expect(String(sendCall!.payload.content)).to.contain('Hi! This is your agent replying.');
      expect(sendCall!.headers['sb-api-key-id']).to.equal('e2e-sendblue-api-key');
      expect(sendCall!.headers['sb-api-secret-key']).to.equal('e2e-sendblue-secret-key');
    });

    it('acknowledges outbound echoes without dispatching to the bridge', async () => {
      const res = await postSendblueWebhook(
        buildReceivePayload({ is_outbound: true, from_number: AGENT_PHONE, number: USER_PHONE })
      );

      expect(res.status).to.equal(200);

      // Give any (incorrect) dispatch a moment to surface before asserting.
      await new Promise((resolve) => setTimeout(resolve, 500));
      expect(bridgeCalls.length).to.equal(0);
    });
  });

  describe('reply-based tool approvals', () => {
    const APPROVAL_ID = 'appr-refund-1';

    /**
     * Opens a conversation via a real inbound webhook, then delivers a tool
     * approval card through the same reply pipeline the bridge/managed runtime
     * uses. Returns the conversation and the flattened SMS text of the prompt.
     */
    async function openConversationWithPendingApproval(): Promise<{
      conversation: ConversationEntity;
      approvalPromptText: string;
    }> {
      const res = await postSendblueWebhook(buildReceivePayload({ content: 'I want a refund for order #42' }));
      expect(res.status).to.equal(200);
      await pollFor(async () => (bridgeCalls.length >= 1 ? true : null));

      const conversation = await pollFor(() =>
        conversationRepository.findByPlatformThread(
          session.environment._id,
          session.organization._id,
          agentId,
          integrationId,
          EXPECTED_THREAD_ID
        )
      );

      const handleAgentReply = testServer.getService(HandleAgentReply);
      await handleAgentReply.execute(
        HandleAgentReplyCommand.create({
          userId: session.user._id,
          environmentId: session.environment._id,
          organizationId: session.organization._id,
          conversationId: conversation._id,
          agentIdentifier,
          integrationIdentifier,
          reply: { toolApprovalCard: {} },
          toolApprovalRequest: {
            approvalId: APPROVAL_ID,
            toolCallId: 'tc-refund-1',
            name: 'issueRefund',
            input: { amount: 50 },
          },
        })
      );

      const promptCall = sendblueApiStub.calls.find(
        (call) => call.path === '/api/send-message' && String(call.payload.content).includes('Tool approval required')
      );
      expect(promptCall, 'expected the approval prompt to be sent through the Sendblue API').to.exist;

      return { conversation, approvalPromptText: String(promptCall!.payload.content) };
    }

    it('delivers the approval prompt as text with explicit reply instructions', async () => {
      const { approvalPromptText } = await openConversationWithPendingApproval();

      expect(approvalPromptText).to.include('issueRefund');
      expect(approvalPromptText).to.include(REPLY_APPROVAL_INSTRUCTIONS);
    });

    it('consumes a "Yes" reply as an approval: records the decision, acks, and dispatches ON_ACTION', async () => {
      const { conversation } = await openConversationWithPendingApproval();

      const res = await postSendblueWebhook(buildReceivePayload({ content: 'Yes' }));
      expect(res.status).to.equal(200);

      await pollFor(async () => (bridgeCalls.length >= 2 ? true : null));

      const actionCall = bridgeCalls[1];
      expect(actionCall.event).to.equal(AgentEventEnum.ON_ACTION);
      expect(actionCall.action).to.deep.include({ id: `tool-approval:approve:${APPROVAL_ID}` });
      expect(actionCall.message).to.equal(null);

      const decision = await pollFor(async () => {
        const activities = await conversationActivityRepository.findByConversation(
          session.environment._id,
          conversation._id
        );

        return activities.find((a) => a.type === ConversationActivityTypeEnum.TOOL_APPROVAL_DECISION) ?? null;
      });
      expect(decision.toolData).to.deep.include({ approvalId: APPROVAL_ID, approved: true });

      const ackCall = sendblueApiStub.calls.find(
        (call) => call.path === '/api/send-message' && String(call.payload.content).includes('Approved')
      );
      expect(ackCall, 'expected an approval ack to be texted back').to.exist;
      expect(String(ackCall!.payload.content)).to.include('issueRefund');
    });

    it('consumes an iMessage "Liked" tapback (delivered as inbound text) as an approval', async () => {
      const { conversation } = await openConversationWithPendingApproval();

      // Sendblue relays an iMessage tapback as an ordinary receive webhook whose
      // content is the tapback rendered as text — there is no dedicated reaction webhook.
      const res = await postSendblueWebhook(
        buildReceivePayload({ content: 'Liked "Tool approval required: issueRefund"' })
      );
      expect(res.status).to.equal(200);

      await pollFor(async () => (bridgeCalls.length >= 2 ? true : null));

      const actionCall = bridgeCalls[1];
      expect(actionCall.event).to.equal(AgentEventEnum.ON_ACTION);
      expect(actionCall.action).to.deep.include({ id: `tool-approval:approve:${APPROVAL_ID}` });

      const decision = await pollFor(async () => {
        const activities = await conversationActivityRepository.findByConversation(
          session.environment._id,
          conversation._id
        );

        return activities.find((a) => a.type === ConversationActivityTypeEnum.TOOL_APPROVAL_DECISION) ?? null;
      });
      expect(decision.toolData).to.deep.include({ approvalId: APPROVAL_ID, approved: true });
    });

    it('consumes a "No" reply as a denial', async () => {
      const { conversation } = await openConversationWithPendingApproval();

      const res = await postSendblueWebhook(buildReceivePayload({ content: 'No.' }));
      expect(res.status).to.equal(200);

      await pollFor(async () => (bridgeCalls.length >= 2 ? true : null));

      const actionCall = bridgeCalls[1];
      expect(actionCall.event).to.equal(AgentEventEnum.ON_ACTION);
      expect(actionCall.action).to.deep.include({ id: `tool-approval:deny:${APPROVAL_ID}` });

      const decision = await pollFor(async () => {
        const activities = await conversationActivityRepository.findByConversation(
          session.environment._id,
          conversation._id
        );

        return activities.find((a) => a.type === ConversationActivityTypeEnum.TOOL_APPROVAL_DECISION) ?? null;
      });
      expect(decision.toolData).to.deep.include({ approvalId: APPROVAL_ID, approved: false });
    });

    it('routes a non-verdict reply through the normal message flow', async () => {
      await openConversationWithPendingApproval();

      const res = await postSendblueWebhook(buildReceivePayload({ content: 'What exactly does this tool do?' }));
      expect(res.status).to.equal(200);

      await pollFor(async () => (bridgeCalls.length >= 2 ? true : null));

      const messageCall = bridgeCalls[1];
      expect(messageCall.event).to.equal(AgentEventEnum.ON_MESSAGE);
      expect(messageCall.message?.text).to.equal('What exactly does this tool do?');
    });

    it('does not consume a "yes" when no approval is pending', async () => {
      const res = await postSendblueWebhook(buildReceivePayload({ content: 'yes' }));
      expect(res.status).to.equal(200);

      await pollFor(async () => (bridgeCalls.length >= 1 ? true : null));

      expect(bridgeCalls[0].event).to.equal(AgentEventEnum.ON_MESSAGE);
      expect(bridgeCalls[0].message?.text).to.equal('yes');
    });
  });

  describe('security', () => {
    it('rejects inbound with a wrong signing secret', async () => {
      const res = await postSendblueWebhook(buildReceivePayload(), 'wrong-secret');

      expect(res.status).to.equal(401);
      expect(bridgeCalls.length).to.equal(0);
    });

    it('rejects inbound without a signing secret header', async () => {
      const res = await postSendblueWebhook(buildReceivePayload(), null);

      expect(res.status).to.equal(401);
      expect(bridgeCalls.length).to.equal(0);
    });

    it('rejects inbound before the webhook secret has been configured', async () => {
      // Simulate the pre-"Configure webhook" state: credentials without `token`.
      await integrationRepository.update(
        {
          _id: integrationId,
          _environmentId: session.environment._id,
          _organizationId: session.organization._id,
        },
        {
          $set: {
            credentials: encryptCredentials({
              apiKey: 'e2e-sendblue-api-key',
              secretKey: 'e2e-sendblue-secret-key',
              from: AGENT_PHONE,
            }),
          },
        }
      );

      const res = await postSendblueWebhook(buildReceivePayload());

      expect(res.status).to.equal(404);
      expect(bridgeCalls.length).to.equal(0);
    });
  });
});
