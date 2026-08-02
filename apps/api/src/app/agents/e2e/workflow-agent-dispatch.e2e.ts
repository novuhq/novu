import {
  ConversationActivitySenderTypeEnum,
  ConversationActivityTypeEnum,
  MessageRepository,
  NotificationRepository,
  WorkflowAgentDispatchRepository,
} from '@novu/dal';
import { ChannelTypeEnum, ENDPOINT_TYPES, WorkflowAgentDispatchStatusEnum } from '@novu/shared';
import { testServer } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { AgentConfigResolver } from '../channels/agent-config-resolver.service';
import { OutboundGateway } from '../conversation-runtime/egress/outbound.gateway';
import { AgentInboundHandler } from '../conversation-runtime/ingress/inbound-turn.handler';
import { BridgeExecutorService } from '../conversation-runtime/runtime/bridge-executor.service';
import { AgentEventEnum } from '../shared/enums/agent-event.enum';
import {
  activityRepository,
  AgentTestContext,
  conversationRepository,
  setupAgentTestContext,
} from './helpers/agent-test-setup';

const PLATFORM_MESSAGE_ID = '1777837477.371619';
const PLATFORM_THREAD_ID = `slack:D123:${PLATFORM_MESSAGE_ID}`;

describe('Workflow agent dispatch - /agents/:agentId/workflow-dispatch #novu-v2', () => {
  let ctx: AgentTestContext;
  const dispatchRepository = new WorkflowAgentDispatchRepository();
  const notificationRepository = new NotificationRepository();
  const messageRepository = new MessageRepository();

  before(() => {
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
  });

  beforeEach(async () => {
    ctx = await setupAgentTestContext();

    const outboundGateway = testServer.getService(OutboundGateway);
    sinon.stub(outboundGateway, 'sendDirectMessage').resolves({
      messageId: PLATFORM_MESSAGE_ID,
      platformThreadId: PLATFORM_THREAD_ID,
    });
    sinon.stub(outboundGateway, 'sendChannelMessage').resolves({
      messageId: '1777837478.111111',
      platformThreadId: 'slack:C123:1777837478.111111',
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  function buildBody(overrides: Record<string, unknown> = {}) {
    return {
      integrationIdentifier: ctx.integrationIdentifier,
      destination: { type: ENDPOINT_TYPES.SLACK_USER, userId: 'U_E2E' },
      content: 'Workflow alert',
      idempotencyKey: `e2e-msg-${Date.now()}:endpoint-1`,
      origin: {
        notificationId: '507f1f77bcf86cd799439011',
        jobId: '507f1f77bcf86cd799439012',
        messageId: '507f1f77bcf86cd799439013',
        transactionId: `txn-${Date.now()}`,
        workflowIdentifier: 'e2e-workflow',
        subscriberId: 'sub-e2e',
      },
      ...overrides,
    };
  }

  it('should dispatch a Slack DM, persist a seed, and not create a conversation', async () => {
    const body = buildBody();
    const res = await ctx.session.testAgent
      .post(`/v1/agents/${encodeURIComponent(ctx.agentIdentifier)}/workflow-dispatch`)
      .send(body);

    expect(res.status).to.equal(200);
    expect(res.body.data.dispatchId).to.be.a('string');
    expect(res.body.data.platformMessageId).to.equal(PLATFORM_MESSAGE_ID);
    expect(res.body.data.platformThreadId).to.equal(PLATFORM_THREAD_ID);
    expect(res.body.data.status).to.equal(WorkflowAgentDispatchStatusEnum.SENT);

    const seed = await dispatchRepository.findByIdempotencyKey(
      ctx.session.environment._id,
      ctx.session.organization._id,
      body.idempotencyKey as string
    );

    expect(seed).to.not.equal(null);
    expect(seed?.status).to.equal(WorkflowAgentDispatchStatusEnum.SENT);
    expect(seed?.content).to.equal(undefined);
    expect(seed?.platformThreadId).to.equal(PLATFORM_THREAD_ID);

    const conversations = await conversationRepository.find({
      _environmentId: ctx.session.environment._id,
      _organizationId: ctx.session.organization._id,
      _agentId: ctx.agentId,
    });
    expect(conversations).to.have.length(0);
  });

  it('should be idempotent for the same idempotencyKey', async () => {
    const body = buildBody({ idempotencyKey: `idempotent-${Date.now()}:ep` });
    const outboundGateway = testServer.getService(OutboundGateway);
    const sendStub = outboundGateway.sendDirectMessage as sinon.SinonStub;

    const first = await ctx.session.testAgent
      .post(`/v1/agents/${encodeURIComponent(ctx.agentIdentifier)}/workflow-dispatch`)
      .send(body);
    const second = await ctx.session.testAgent
      .post(`/v1/agents/${encodeURIComponent(ctx.agentIdentifier)}/workflow-dispatch`)
      .send(body);

    expect(first.status).to.equal(200);
    expect(second.status).to.equal(200);
    expect(second.body.data.dispatchId).to.equal(first.body.data.dispatchId);
    expect(second.body.data.platformMessageId).to.equal(first.body.data.platformMessageId);
    expect(sendStub.callCount).to.equal(1);
  });

  it('should accept ApiKey authentication', async () => {
    const body = buildBody({ idempotencyKey: `apikey-${Date.now()}:ep` });
    const res = await ctx.session.testAgent
      .post(`/v1/agents/${encodeURIComponent(ctx.agentIdentifier)}/workflow-dispatch`)
      .set('Authorization', `ApiKey ${ctx.session.apiKey}`)
      .send(body);

    expect(res.status).to.equal(200);
    expect(res.body.data.status).to.equal(WorkflowAgentDispatchStatusEnum.SENT);
  });

  it('should reject when the integration is not linked to the agent', async () => {
    const body = buildBody({
      integrationIdentifier: 'not-linked-integration',
      idempotencyKey: `unlink-${Date.now()}:ep`,
    });
    const res = await ctx.session.testAgent
      .post(`/v1/agents/${encodeURIComponent(ctx.agentIdentifier)}/workflow-dispatch`)
      .send(body);

    expect(res.status).to.be.oneOf([400, 404]);
  });

  it('should hydrate workflow context into conversation history on first reply', async () => {
    const notification = await notificationRepository.create({
      _environmentId: ctx.session.environment._id,
      _organizationId: ctx.session.organization._id,
      _templateId: '507f1f77bcf86cd799439021',
      _subscriberId: '507f1f77bcf86cd799439022',
      transactionId: `txn-hydrate-${Date.now()}`,
      topics: [],
      payload: { orderId: 'ORD-42', amount: 19 },
    });
    const message = await messageRepository.create({
      _notificationId: notification._id,
      _environmentId: ctx.session.environment._id,
      _organizationId: ctx.session.organization._id,
      _subscriberId: '507f1f77bcf86cd799439022',
      _templateId: '507f1f77bcf86cd799439021',
      channel: ChannelTypeEnum.CHAT,
      transactionId: notification.transactionId,
      content: 'Order ORD-42 needs attention',
      providerId: 'slack',
    });

    const body = buildBody({
      idempotencyKey: `hydrate-${Date.now()}:ep`,
      content: 'Order ORD-42 needs attention',
      origin: {
        notificationId: notification._id,
        jobId: '507f1f77bcf86cd799439012',
        messageId: message._id,
        transactionId: notification.transactionId,
        workflowIdentifier: 'e2e-workflow',
        subscriberId: 'sub-e2e',
        stepId: 'chat-step',
      },
    });

    const dispatchRes = await ctx.session.testAgent
      .post(`/v1/agents/${encodeURIComponent(ctx.agentIdentifier)}/workflow-dispatch`)
      .send(body);
    expect(dispatchRes.status).to.equal(200);

    const bridgeExecutor = testServer.getService(BridgeExecutorService);
    sinon.stub(bridgeExecutor, 'execute').resolves(undefined);

    const inboundHandler = testServer.getService(AgentInboundHandler);
    const configResolver = testServer.getService(AgentConfigResolver);
    const config = await configResolver.resolve(ctx.agentId, ctx.integrationIdentifier);

    const thread = {
      id: 'slack:D123:',
      channelId: 'slack:D123',
      isDM: true,
      startTyping: async () => {},
      subscribe: async () => {},
      toJSON: () => ({ id: 'slack:D123:', platform: 'slack', channelId: 'slack:D123', serialized: true }),
    };
    const inboundMessage = {
      id: '1777837480.999999',
      text: 'What is this about?',
      author: {
        userId: 'U_E2E',
        fullName: 'E2E User',
        userName: 'e2e',
        isBot: false,
      },
      metadata: { dateSent: new Date() },
      raw: { thread_ts: PLATFORM_MESSAGE_ID },
    };

    await inboundHandler.handle(
      ctx.agentId,
      config,
      thread as never,
      inboundMessage as never,
      AgentEventEnum.ON_MESSAGE
    );

    const conversation = await conversationRepository.findByPlatformThread(
      ctx.session.environment._id,
      ctx.session.organization._id,
      ctx.agentId,
      ctx.integrationId,
      PLATFORM_THREAD_ID
    );
    expect(conversation).to.exist;

    const activities = await activityRepository.find(
      {
        _environmentId: ctx.session.environment._id,
        _conversationId: conversation!._id,
      },
      '*',
      { sort: { createdAt: 1 } }
    );

    const syntheticOutbound = activities.find(
      (activity) =>
        activity.type === ConversationActivityTypeEnum.MESSAGE &&
        activity.senderType === ConversationActivitySenderTypeEnum.AGENT &&
        activity.platformMessageId === PLATFORM_MESSAGE_ID
    );
    expect(syntheticOutbound).to.exist;
    expect(syntheticOutbound?.content).to.equal(
      'Order ORD-42 needs attention\n\nAdditional data for this message:\n{\n  "orderId": "ORD-42",\n  "amount": 19\n}'
    );

    const originSignal = activities.find(
      (activity) =>
        activity.type === ConversationActivityTypeEnum.SIGNAL && activity.signalData?.type === 'workflow_origin'
    );
    expect(originSignal).to.exist;
    expect(originSignal?.signalData?.payload?.workflowIdentifier).to.equal('e2e-workflow');
    expect(originSignal?.signalData?.payload?.payload).to.deep.equal({ orderId: 'ORD-42', amount: 19 });
  });
});
