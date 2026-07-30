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
  AgentTestContext,
  activityRepository,
  conversationRepository,
  setupAgentTestContext,
} from './helpers/agent-test-setup';

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

describe('Web Chat - /web-chat/conversations #novu-v2', () => {
  let ctx: AgentTestContext;
  let subscriberToken: string;

  before(() => {
    process.env.IS_AGENT_EVENT_PROTOCOL_ENABLED = 'true';
    process.env.IS_AGENT_WEB_CHAT_ENABLED = 'true';
  });

  after(() => {
    delete process.env.IS_AGENT_EVENT_PROTOCOL_ENABLED;
    delete process.env.IS_AGENT_WEB_CHAT_ENABLED;
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

  function createConversation(body: { agentId: string; text: string; id?: string }, token = subscriberToken) {
    return ctx.session.testAgent.post('/v1/web-chat/conversations').set('Authorization', `Bearer ${token}`).send(body);
  }

  function getEvents(
    conversationIdentifier: string,
    token = subscriberToken,
    query: { after?: string; before?: string; afterSequence?: number; limit?: number } = {}
  ) {
    return ctx.session.testAgent
      .get(`/v1/web-chat/conversations/${conversationIdentifier}/events`)
      .query(query)
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
    expect(res.body.data.identifier).to.match(/^conv_/);

    const conversation = await pollFor(() =>
      conversationRepository.findOne(
        {
          identifier: res.body.data.identifier,
          _environmentId: ctx.session.environment._id,
        },
        '*'
      )
    );
    expect(
      conversation.participants.some(
        (p) => p.type === ConversationParticipantTypeEnum.SUBSCRIBER && p.id === ctx.session.subscriberId
      )
    ).to.equal(true);

    const activities = await pollFor(async () => {
      const found = await activityRepository.findByConversation(ctx.session.environment._id, conversation._id, 20);
      const subscriberMessage = found.find(
        (a) =>
          a.senderType === ConversationActivitySenderTypeEnum.SUBSCRIBER &&
          a.type === ConversationActivityTypeEnum.MESSAGE
      );

      return subscriberMessage ?? null;
    });
    expect(activities.content).to.equal('Hello from web chat');
    expect(activities.identifier).to.match(/^msg_/);
    expect(conversation.channels.some((channel) => channel.platform === 'web_chat')).to.equal(true);
    expect(conversation.channels[0]?.platformThreadId).to.equal(`web_chat:${res.body.data.identifier}`);
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

  it('should return 404 when IS_AGENT_WEB_CHAT_ENABLED is off', async () => {
    const previousFlag = process.env.IS_AGENT_WEB_CHAT_ENABLED;
    delete process.env.IS_AGENT_WEB_CHAT_ENABLED;

    try {
      await linkWebChat();

      const res = await createConversation({
        agentId: ctx.agentIdentifier,
        text: 'Should be hidden',
      });

      expect(res.status).to.equal(404);
    } finally {
      if (previousFlag === undefined) {
        delete process.env.IS_AGENT_WEB_CHAT_ENABLED;
      } else {
        process.env.IS_AGENT_WEB_CHAT_ENABLED = previousFlag;
      }
    }
  });

  it('should return 401 when Authorization is missing on POST', async () => {
    await linkWebChat();

    const res = await ctx.session.testAgent.post('/v1/web-chat/conversations').send({
      agentId: ctx.agentIdentifier,
      text: 'No auth',
    });

    expect(res.status).to.equal(401);
  });

  it('should return durable agent message events on GET .../events', async () => {
    await linkWebChat();

    const createRes = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Start thread',
    });
    expect(createRes.status).to.equal(201);

    const conversation = await pollFor(() =>
      conversationRepository.findOne(
        {
          identifier: createRes.body.data.identifier,
          _environmentId: ctx.session.environment._id,
        },
        '*'
      )
    );

    const messageId = `msg-e2e-${Date.now()}`;
    const ingestRes = await ctx.session.testAgent.post('/v1/agents/events/ingest').send({
      events: [messageEnvelope(conversation._id, messageId)],
    });
    expect(ingestRes.status).to.equal(200);

    // platformMessageId ≡ durable activity identifier (web chat has no external id).
    const agentActivity = await pollFor(() =>
      activityRepository.findOne(
        {
          _conversationId: conversation._id,
          _environmentId: ctx.session.environment._id,
          identifier: messageId,
        },
        '*'
      )
    );
    expect(agentActivity.platformMessageId).to.equal(messageId);
    expect(agentActivity.identifier).to.equal(messageId);

    const eventsRes = await getEvents(createRes.body.data.identifier);
    expect(eventsRes.status).to.equal(200);
    expect(eventsRes.body.data.hasMore).to.equal(false);
    expect(eventsRes.body.data.next).to.equal(null);
    expect(eventsRes.body.data.events.length).to.be.greaterThan(0);

    const agentMessageEvent = eventsRes.body.data.events.find(
      (envelope: AgentEventEnvelope) => envelope.event.type === 'message' && envelope.event.messageId === messageId
    );
    expect(agentMessageEvent).to.exist;
    expect(agentMessageEvent.event.content.markdown).to.equal(`Agent reply ${messageId}`);

    const subscriberMessageEvent = eventsRes.body.data.events.find((envelope: AgentEventEnvelope) => {
      if (envelope.event.type !== 'custom' || envelope.event.name !== 'subscriber.message') {
        return false;
      }
      const data = envelope.event.data as { content?: { markdown?: string }; messageId?: string };

      return data.content?.markdown === 'Start thread';
    });
    expect(subscriberMessageEvent).to.exist;
    const subscriberData = subscriberMessageEvent.event.data as { messageId?: string };
    expect(subscriberData.messageId).to.match(/^msg_/);
  });

  it('should paginate events with activity cursor', async () => {
    await linkWebChat();

    const createRes = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Page one',
    });
    expect(createRes.status).to.equal(201);

    const conversation = await pollFor(() =>
      conversationRepository.findOne(
        {
          identifier: createRes.body.data.identifier,
          _environmentId: ctx.session.environment._id,
        },
        '*'
      )
    );

    await ctx.session.testAgent.post('/v1/agents/events/ingest').send({
      events: [messageEnvelope(conversation._id, `msg-page-${Date.now()}`)],
    });

    const firstPage = await getEvents(createRes.body.data.identifier, subscriberToken, { limit: 1 });
    expect(firstPage.status).to.equal(200);
    expect(firstPage.body.data.events).to.have.length(1);
    expect(firstPage.body.data.hasMore).to.equal(true);
    expect(firstPage.body.data.next).to.be.a('string');

    const secondPage = await ctx.session.testAgent
      .get(`/v1/web-chat/conversations/${createRes.body.data.identifier}/events`)
      .query({ after: firstPage.body.data.next, limit: 50 })
      .set('Authorization', `Bearer ${subscriberToken}`);
    expect(secondPage.status).to.equal(200);
    expect(secondPage.body.data.events.length).to.be.greaterThan(0);
    expect(secondPage.body.data.events[0].sequence).to.be.greaterThan(firstPage.body.data.events[0].sequence);
  });

  it('should reject GET events for another subscriber', async () => {
    await linkWebChat();

    const createRes = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Private thread',
    });
    expect(createRes.status).to.equal(201);

    await pollFor(() =>
      conversationRepository.findOne(
        {
          identifier: createRes.body.data.identifier,
          _environmentId: ctx.session.environment._id,
        },
        '*'
      )
    );

    const otherSubscriberId = `other-sub-${Date.now()}`;
    const otherSession = await ctx.session.testAgent.post('/v1/inbox/session').send({
      applicationIdentifier: ctx.session.environment.identifier,
      subscriberId: otherSubscriberId,
    });
    expect(otherSession.status).to.equal(201);

    const eventsRes = await getEvents(createRes.body.data.identifier, otherSession.body.data.token);
    expect(eventsRes.status).to.equal(404);
  });

  it('should reject GET events for non-web-chat conversations', async () => {
    const slackConversation = await conversationRepository.create({
      identifier: `conv_e2e_slack_${Date.now()}`,
      _agentId: ctx.agentId,
      participants: [
        { type: ConversationParticipantTypeEnum.AGENT, id: ctx.agentId },
        { type: ConversationParticipantTypeEnum.SUBSCRIBER, id: ctx.session.subscriberId },
      ],
      channels: [
        {
          platform: 'slack',
          _integrationId: ctx.integrationId,
          platformThreadId: `thread-${Date.now()}`,
        },
      ],
      status: 'active',
      title: 'Slack thread',
      metadata: {},
      _environmentId: ctx.session.environment._id,
      _organizationId: ctx.session.organization._id,
      lastActivityAt: new Date().toISOString(),
    });

    const eventsRes = await getEvents(slackConversation.identifier);
    expect(eventsRes.status).to.equal(404);
  });
});
