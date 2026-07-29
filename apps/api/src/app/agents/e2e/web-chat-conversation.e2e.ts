import { AGENT_EVENT_PROTOCOL_VERSION, type AgentEventEnvelope } from '@novu/agent-event-protocol';
import {
  ConversationActivitySenderTypeEnum,
  ConversationActivityTypeEnum,
  ConversationParticipantTypeEnum,
} from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';
import { testServer } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { BridgeExecutorService } from '../conversation-runtime/runtime/bridge-executor.service';
import {
  activityRepository,
  AgentTestContext,
  conversationRepository,
  setupAgentTestContext,
} from './helpers/agent-test-setup';

describe('Web Chat - /web-chat/conversations #novu-v2', () => {
  let ctx: AgentTestContext;
  let subscriberToken: string;

  before(() => {
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
    process.env.IS_AGENT_EVENT_PROTOCOL_ENABLED = 'true';
  });

  after(() => {
    delete process.env.IS_AGENT_EVENT_PROTOCOL_ENABLED;
  });

  beforeEach(async () => {
    ctx = await setupAgentTestContext();

    const bridgeExecutor = testServer.getService(BridgeExecutorService);
    sinon.stub(bridgeExecutor, 'execute').resolves();

    const inboxSession = await ctx.session.testAgent.post('/v1/inbox/session').send({
      applicationIdentifier: ctx.session.environment.identifier,
      subscriberId: ctx.session.subscriberId,
    });
    expect(inboxSession.status).to.equal(201);
    subscriberToken = inboxSession.body.data.token;
  });

  afterEach(() => {
    sinon.restore();
  });

  async function linkWebChat(agentIdentifier = ctx.agentIdentifier) {
    const res = await ctx.session.testAgent.post(`/v1/agents/${agentIdentifier}/integrations`).send({
      providerId: ChatProviderIdEnum.NovuWebChat,
    });
    expect(res.status).to.equal(201);

    return res.body.data;
  }

  function createConversation(body: { agentId: string; text: string }, token = subscriberToken) {
    return ctx.session.testAgent
      .post('/v1/web-chat/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  }

  function getEvents(conversationIdentifier: string, token = subscriberToken) {
    return ctx.session.testAgent
      .get(`/v1/web-chat/conversations/${conversationIdentifier}/events`)
      .set('Authorization', `Bearer ${token}`);
  }

  function messageEnvelope(conversationId: string, messageId: string): AgentEventEnvelope {
    return {
      version: AGENT_EVENT_PROTOCOL_VERSION,
      conversationId,
      agentId: ctx.agentIdentifier,
      runId: 'run-e2e',
      turnId: 'turn-e2e',
      sequence: 1,
      timestamp: new Date().toISOString(),
      event: {
        type: 'message',
        messageId,
        content: { markdown: `Agent reply ${messageId}` },
      },
    };
  }

  it('should create a conversation on first message when agent is published to web chat', async () => {
    await linkWebChat();

    const res = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Hello from web chat',
    });

    expect(res.status).to.equal(201);
    expect(res.body.identifier).to.match(/^conv_/);

    const conversation = await conversationRepository.findOne(
      {
        identifier: res.body.identifier,
        _environmentId: ctx.session.environment._id,
      },
      '*'
    );
    expect(conversation).to.exist;
    expect(conversation!.participants.some(
      (p) => p.type === ConversationParticipantTypeEnum.SUBSCRIBER && p.id === ctx.session.subscriberId
    )).to.equal(true);

    const activities = await activityRepository.findByConversation(
      ctx.session.environment._id,
      conversation!._id,
      20
    );
    const subscriberMessage = activities.find(
      (a) =>
        a.senderType === ConversationActivitySenderTypeEnum.SUBSCRIBER &&
        a.type === ConversationActivityTypeEnum.MESSAGE
    );
    expect(subscriberMessage).to.exist;
    expect(subscriberMessage!.content).to.equal('Hello from web chat');
  });

  it('should reject unpublished agents with 400', async () => {
    const unpublishedIdentifier = `e2e-unpublished-${Date.now()}`;
    await ctx.session.testAgent.post('/v1/agents').send({
      name: 'Unpublished Agent',
      identifier: unpublishedIdentifier,
    });

    const res = await createConversation({
      agentId: unpublishedIdentifier,
      text: 'Should fail',
    });

    expect(res.status).to.equal(400);
    expect(res.body.message).to.equal('This agent is not available on web chat');
  });

  it('should return durable agent message events on GET .../events', async () => {
    await linkWebChat();

    const createRes = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Start thread',
    });
    expect(createRes.status).to.equal(201);

    const conversation = await conversationRepository.findOne(
      {
        identifier: createRes.body.identifier,
        _environmentId: ctx.session.environment._id,
      },
      '*'
    );
    expect(conversation).to.exist;

    const messageId = `msg-e2e-${Date.now()}`;
    const ingestRes = await ctx.session.testAgent.post('/v1/agents/events/ingest').send({
      events: [messageEnvelope(conversation!._id, messageId)],
    });
    expect(ingestRes.status).to.equal(200);

    const eventsRes = await getEvents(createRes.body.identifier);
    expect(eventsRes.status).to.equal(200);
    expect(eventsRes.body.hasMore).to.equal(false);
    expect(eventsRes.body.events.length).to.be.greaterThan(0);

    const agentMessageEvent = eventsRes.body.events.find(
      (envelope: AgentEventEnvelope) =>
        envelope.event.type === 'message' && envelope.event.messageId === messageId
    );
    expect(agentMessageEvent).to.exist;
    expect(agentMessageEvent.event.content.markdown).to.equal(`Agent reply ${messageId}`);
  });
});
