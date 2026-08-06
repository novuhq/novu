import { AGENT_EVENT_PROTOCOL_VERSION, type AgentEventEnvelope } from '@novu/agent-event-protocol';
import { AgentEntitlementsService, WebSocketsQueueService } from '@novu/application-generic';
import {
  ConversationActivationRepository,
  ConversationActivitySenderTypeEnum,
  ConversationActivityTypeEnum,
  ConversationParticipantTypeEnum,
} from '@novu/dal';
import { ChatProviderIdEnum, WebSocketEventEnum } from '@novu/shared';
import { testServer } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { PlanLimitGateService } from '../conversation-runtime/ingress/plan-limit-gate.service';
import { BridgeExecutorService } from '../conversation-runtime/runtime/bridge-executor.service';
import {
  AgentTestContext,
  activityRepository,
  conversationRepository,
  setupAgentTestContext,
} from './helpers/agent-test-setup';

const activationRepository = new ConversationActivationRepository();

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

  function createConversation(
    body: { agentId: string; text: string; id?: string; conversationIdentifier?: string },
    token = subscriberToken
  ) {
    return ctx.session.testAgent.post('/v1/web-chat/conversations').set('Authorization', `Bearer ${token}`).send(body);
  }

  function listConversations(token = subscriberToken, query: { after?: string; before?: string; limit?: number } = {}) {
    return ctx.session.testAgent.get('/v1/web-chat/conversations').query(query).set('Authorization', `Bearer ${token}`);
  }

  function getConversation(conversationIdentifier: string, token = subscriberToken) {
    return ctx.session.testAgent
      .get(`/v1/web-chat/conversations/${conversationIdentifier}`)
      .set('Authorization', `Bearer ${token}`);
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

  async function createOtherSubscriberToken() {
    const otherSubscriberId = `other-sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const otherSession = await ctx.session.testAgent.post('/v1/inbox/session').send({
      applicationIdentifier: ctx.session.environment.identifier,
      subscriberId: otherSubscriberId,
    });
    expect(otherSession.status).to.equal(201);

    return otherSession.body.data.token as string;
  }

  async function waitForConversation(identifier: string) {
    return pollFor(() =>
      conversationRepository.findOne(
        {
          identifier,
          _environmentId: ctx.session.environment._id,
        },
        '*'
      )
    );
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
        role: 'assistant',
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
    expect(res.body.data.messageId).to.match(/^msg_/);

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
    expect(activities.identifier).to.equal(res.body.data.messageId);
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
    expect(agentActivity.identifier).to.equal(messageId);
    // Delivery honors the runtime message id hint — one identity everywhere.
    expect(agentActivity.platformMessageId).to.equal(messageId);

    const eventsRes = await getEvents(createRes.body.data.identifier);
    expect(eventsRes.status).to.equal(200);
    expect(eventsRes.body.data.hasMore).to.equal(false);
    expect(eventsRes.body.data.next).to.equal(null);
    expect(eventsRes.body.data.events.length).to.be.greaterThan(0);

    const agentMessageEvent = eventsRes.body.data.events.find(
      (envelope: AgentEventEnvelope) =>
        envelope.event.type === 'message' && envelope.event.messageId === agentActivity.platformMessageId
    );
    expect(agentMessageEvent).to.exist;
    expect(agentMessageEvent.event.content.markdown).to.equal(`Agent reply ${messageId}`);

    const subscriberMessageEvent = eventsRes.body.data.events.find((envelope: AgentEventEnvelope) => {
      return (
        envelope.event.type === 'message' &&
        envelope.event.role === 'user' &&
        envelope.event.content?.markdown === 'Start thread'
      );
    });
    expect(subscriberMessageEvent).to.exist;
    expect(subscriberMessageEvent.event.type).to.equal('message');
    if (subscriberMessageEvent.event.type === 'message') {
      expect(subscriberMessageEvent.event.messageId).to.match(/^msg_/);
    }
  });

  it('should return the newest page by default and paginate older with before', async () => {
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

    const newestPage = await getEvents(createRes.body.data.identifier, subscriberToken, { limit: 1 });
    expect(newestPage.status).to.equal(200);
    expect(newestPage.body.data.events).to.have.length(1);
    expect(newestPage.body.data.hasMore).to.equal(true);
    expect(newestPage.body.data.previous).to.be.a('string');

    const olderPage = await ctx.session.testAgent
      .get(`/v1/web-chat/conversations/${createRes.body.data.identifier}/events`)
      .query({ before: newestPage.body.data.previous, limit: 50 })
      .set('Authorization', `Bearer ${subscriberToken}`);
    expect(olderPage.status).to.equal(200);
    expect(olderPage.body.data.events.length).to.be.greaterThan(0);
    expect(olderPage.body.data.events[olderPage.body.data.events.length - 1].sequence).to.be.lessThan(
      newestPage.body.data.events[0].sequence
    );
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

    const otherToken = await createOtherSubscriberToken();
    const eventsRes = await getEvents(createRes.body.data.identifier, otherToken);
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

  it('should list only the subscriber web-chat conversations', async () => {
    await linkWebChat();

    const mineA = await createConversation({ agentId: ctx.agentIdentifier, text: 'Mine A' });
    const mineB = await createConversation({ agentId: ctx.agentIdentifier, text: 'Mine B' });
    expect(mineA.status).to.equal(201);
    expect(mineB.status).to.equal(201);
    await waitForConversation(mineA.body.data.identifier);
    await waitForConversation(mineB.body.data.identifier);

    const otherToken = await createOtherSubscriberToken();
    const otherRes = await createConversation(
      { agentId: ctx.agentIdentifier, text: 'Other subscriber thread' },
      otherToken
    );
    expect(otherRes.status).to.equal(201);
    await waitForConversation(otherRes.body.data.identifier);

    await conversationRepository.create({
      identifier: `conv_e2e_slack_list_${Date.now()}`,
      _agentId: ctx.agentId,
      participants: [
        { type: ConversationParticipantTypeEnum.AGENT, id: ctx.agentId },
        { type: ConversationParticipantTypeEnum.SUBSCRIBER, id: ctx.session.subscriberId },
      ],
      channels: [
        {
          platform: 'slack',
          _integrationId: ctx.integrationId,
          platformThreadId: `thread-list-${Date.now()}`,
        },
      ],
      status: 'active',
      title: 'Slack should be hidden',
      metadata: {},
      _environmentId: ctx.session.environment._id,
      _organizationId: ctx.session.organization._id,
      lastActivityAt: new Date().toISOString(),
    });

    const listRes = await listConversations();
    expect(listRes.status).to.equal(200);
    expect(listRes.body.data).to.be.an('array');

    const identifiers = listRes.body.data.map((item: { identifier: string }) => item.identifier);
    expect(identifiers).to.include(mineA.body.data.identifier);
    expect(identifiers).to.include(mineB.body.data.identifier);
    expect(identifiers).to.not.include(otherRes.body.data.identifier);

    const first = listRes.body.data.find(
      (item: { identifier: string }) => item.identifier === mineA.body.data.identifier
    );
    expect(first).to.include.keys('identifier', 'title', 'status', 'agentIdentifier', 'lastActivityAt', 'createdAt');
    expect(first.agentIdentifier).to.equal(ctx.agentIdentifier);
    expect(first).to.not.have.property('participants');
  });

  it('should return conversation metadata for participants and 404 for others', async () => {
    await linkWebChat();

    const createRes = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Metadata thread',
    });
    expect(createRes.status).to.equal(201);
    await waitForConversation(createRes.body.data.identifier);

    const getRes = await getConversation(createRes.body.data.identifier);
    expect(getRes.status).to.equal(200);
    expect(getRes.body.data.identifier).to.equal(createRes.body.data.identifier);
    expect(getRes.body.data.agentIdentifier).to.equal(ctx.agentIdentifier);
    expect(getRes.body.data).to.include.keys('title', 'status', 'lastActivityAt', 'createdAt');

    const otherToken = await createOtherSubscriberToken();
    const denied = await getConversation(createRes.body.data.identifier, otherToken);
    expect(denied.status).to.equal(404);
  });

  it('should resume an existing conversation when conversationIdentifier ACL passes', async () => {
    await linkWebChat();

    const createRes = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Original message',
    });
    expect(createRes.status).to.equal(201);
    const identifier = createRes.body.data.identifier as string;
    const conversation = await waitForConversation(identifier);

    const resumeRes = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Follow-up message',
      conversationIdentifier: identifier,
    });
    expect(resumeRes.status).to.equal(201);
    expect(resumeRes.body.data.identifier).to.equal(identifier);

    const subscriberMessages = await pollFor(async () => {
      const activities = await activityRepository.findByConversation(ctx.session.environment._id, conversation._id, 50);
      const messages = activities.filter(
        (a) =>
          a.senderType === ConversationActivitySenderTypeEnum.SUBSCRIBER &&
          a.type === ConversationActivityTypeEnum.MESSAGE
      );

      return messages.length >= 2 ? messages : null;
    });
    expect(subscriberMessages.map((a) => a.content)).to.include.members(['Original message', 'Follow-up message']);
  });

  it('should reject resume when conversationIdentifier ACL fails', async () => {
    await linkWebChat();

    const createRes = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Owner only',
    });
    expect(createRes.status).to.equal(201);
    await waitForConversation(createRes.body.data.identifier);

    const otherToken = await createOtherSubscriberToken();
    const denied = await createConversation(
      {
        agentId: ctx.agentIdentifier,
        text: 'Should fail',
        conversationIdentifier: createRes.body.data.identifier,
      },
      otherToken
    );
    expect(denied.status).to.equal(404);
  });

  it('should still create a new conversation when conversationIdentifier is omitted', async () => {
    await linkWebChat();

    const first = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'First thread',
    });
    const second = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Second thread',
    });

    expect(first.status).to.equal(201);
    expect(second.status).to.equal(201);
    expect(second.body.data.identifier).to.not.equal(first.body.data.identifier);
    expect(second.body.data.identifier).to.match(/^conv_/);
  });

  it('should paginate durable history with afterSequence', async () => {
    await linkWebChat();

    const createRes = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Sequence start',
    });
    expect(createRes.status).to.equal(201);

    const conversation = await waitForConversation(createRes.body.data.identifier);

    await ctx.session.testAgent.post('/v1/agents/events/ingest').send({
      events: [messageEnvelope(conversation._id, `msg-seq-${Date.now()}`)],
    });

    const fullPage = await getEvents(createRes.body.data.identifier);
    expect(fullPage.status).to.equal(200);
    expect(fullPage.body.data.events.length).to.be.greaterThan(1);

    const firstSequence = fullPage.body.data.events[0].sequence as number;
    const gapFill = await getEvents(createRes.body.data.identifier, subscriberToken, {
      afterSequence: firstSequence,
      limit: 50,
    });
    expect(gapFill.status).to.equal(200);
    expect(gapFill.body.data.events.length).to.be.greaterThan(0);
    for (const envelope of gapFill.body.data.events) {
      expect(envelope.sequence).to.be.greaterThan(firstSequence);
    }
  });

  it('should emit exactly one live AGENT_EVENT per post/edit/delete/typing via adapter callbacks', async () => {
    await linkWebChat();
    const wsQueue = testServer.getService(WebSocketsQueueService);
    const addStub = sinon.stub(wsQueue, 'add');

    const createRes = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Live delivery thread',
    });
    expect(createRes.status).to.equal(201);
    const conversation = await waitForConversation(createRes.body.data.identifier);

    const messageId = `msg-live-${Date.now()}`;
    const ingestRes = await ctx.session.testAgent.post('/v1/agents/events/ingest').send({
      events: [messageEnvelope(conversation._id, messageId)],
    });
    expect(ingestRes.status).to.equal(200);

    const messageActivity = await pollFor(() =>
      activityRepository.findOne(
        {
          _conversationId: conversation._id,
          _environmentId: ctx.session.environment._id,
          identifier: messageId,
        },
        '*'
      )
    );
    if (!messageActivity.platformMessageId) {
      throw new Error('Expected web-chat delivery to persist a platform message id');
    }
    const platformMessageId = messageActivity.platformMessageId;
    // Delivery honors the runtime message id hint: identifier, platform id and
    // live envelope share one identity.
    expect(platformMessageId).to.equal(messageId);

    const typingEnvelope: AgentEventEnvelope = {
      ...messageEnvelope(conversation._id, messageId),
      runId: 'run-typing',
      sequence: 2,
      event: { type: 'channel.typing', state: 'on', status: 'Thinking...' },
    };
    const editEnvelope: AgentEventEnvelope = {
      ...messageEnvelope(conversation._id, messageId),
      runId: 'run-edit',
      sequence: 3,
      event: {
        type: 'channel.edit',
        messageId,
        content: { markdown: 'Edited live' },
      },
    };
    const deleteEnvelope: AgentEventEnvelope = {
      ...messageEnvelope(conversation._id, messageId),
      runId: 'run-delete',
      sequence: 4,
      event: { type: 'channel.delete', messageId },
    };

    await ctx.session.testAgent.post('/v1/agents/events/ingest').send({ events: [typingEnvelope] });
    await ctx.session.testAgent.post('/v1/agents/events/ingest').send({ events: [editEnvelope] });
    await ctx.session.testAgent.post('/v1/agents/events/ingest').send({ events: [deleteEnvelope] });

    await pollFor(async () => {
      const edit = await activityRepository.findOne(
        {
          _conversationId: conversation._id,
          _environmentId: ctx.session.environment._id,
          type: ConversationActivityTypeEnum.EDIT,
          platformMessageId,
        },
        '*'
      );

      return edit ?? null;
    });
    await pollFor(async () => {
      const tombstone = await activityRepository.findOne(
        {
          _conversationId: conversation._id,
          _environmentId: ctx.session.environment._id,
          type: ConversationActivityTypeEnum.DELETE,
          platformMessageId,
        },
        '*'
      );

      return tombstone ?? null;
    });

    const agentEvents = addStub
      .getCalls()
      .map((call) => call.args[0])
      .filter((job) => job?.data?.event === WebSocketEventEnum.AGENT_EVENT);

    const byType = (type: string) =>
      agentEvents.filter((job) => (job.data.payload as AgentEventEnvelope)?.event?.type === type);

    expect(byType('message')).to.have.length(1);
    expect(byType('channel.typing')).to.have.length(1);
    expect(byType('channel.edit')).to.have.length(1);
    expect(byType('channel.delete')).to.have.length(1);

    const liveMessage = byType('message')[0].data.payload as AgentEventEnvelope;
    expect(liveMessage.event).to.deep.include({
      type: 'message',
      role: 'assistant',
      messageId: platformMessageId,
    });

    const historyRes = await getEvents(createRes.body.data.identifier);
    expect(historyRes.status).to.equal(200);
    const historyMessage = historyRes.body.data.events.find(
      (envelope: AgentEventEnvelope) =>
        envelope.event.type === 'message' && envelope.event.messageId === platformMessageId
    );
    expect(historyMessage).to.exist;
    expect(historyMessage.sequence).to.equal(liveMessage.sequence);

    const liveEdit = byType('channel.edit')[0].data.payload as AgentEventEnvelope;
    const historyEdit = historyRes.body.data.events.find(
      (envelope: AgentEventEnvelope) =>
        envelope.event.type === 'channel.edit' && envelope.event.messageId === platformMessageId
    );
    expect(historyEdit).to.exist;
    expect(historyEdit.sequence).to.equal(liveEdit.sequence);

    const liveDelete = byType('channel.delete')[0].data.payload as AgentEventEnvelope;
    const historyDelete = historyRes.body.data.events.find(
      (envelope: AgentEventEnvelope) =>
        envelope.event.type === 'channel.delete' && envelope.event.messageId === platformMessageId
    );
    expect(historyDelete).to.exist;
    expect(historyDelete.sequence).to.equal(liveDelete.sequence);
  });

  it('should suppress duplicate live delivery for concurrent runtime retries', async () => {
    await linkWebChat();
    const wsQueue = testServer.getService(WebSocketsQueueService);
    const addStub = sinon.stub(wsQueue, 'add').resolves();
    const createRes = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Concurrent duplicate thread',
    });
    expect(createRes.status).to.equal(201);
    const conversation = await waitForConversation(createRes.body.data.identifier);
    const runtimeMessageId = `msg-concurrent-${Date.now()}`;

    const responses = await Promise.all([
      ctx.session.testAgent.post('/v1/agents/events/ingest').send({
        events: [messageEnvelope(conversation._id, runtimeMessageId)],
      }),
      ctx.session.testAgent.post('/v1/agents/events/ingest').send({
        events: [messageEnvelope(conversation._id, runtimeMessageId)],
      }),
    ]);
    expect(responses.map((response) => response.status)).to.deep.equal([200, 200]);

    const activity = await pollFor(() =>
      activityRepository.findOne(
        {
          _conversationId: conversation._id,
          _environmentId: ctx.session.environment._id,
          identifier: runtimeMessageId,
        },
        '*'
      )
    );
    const liveMessages = addStub
      .getCalls()
      .map((call) => call.args[0])
      .filter(
        (job) =>
          job?.data?.event === WebSocketEventEnum.AGENT_EVENT &&
          (job.data.payload as AgentEventEnvelope)?.event?.type === 'message'
      );

    expect(liveMessages).to.have.length(1);
    expect((liveMessages[0].data.payload as AgentEventEnvelope).event).to.deep.include({
      type: 'message',
      role: 'assistant',
      messageId: activity.platformMessageId,
    });
  });

  it('should keep durable persist when WS enqueue fails', async () => {
    await linkWebChat();
    const wsQueue = testServer.getService(WebSocketsQueueService);
    sinon.stub(wsQueue, 'add').rejects(new Error('ws down'));

    const createRes = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Persist despite WS failure',
    });
    expect(createRes.status).to.equal(201);
    const conversation = await waitForConversation(createRes.body.data.identifier);

    const messageId = `msg-ws-fail-${Date.now()}`;
    const ingestRes = await ctx.session.testAgent.post('/v1/agents/events/ingest').send({
      events: [messageEnvelope(conversation._id, messageId)],
    });
    expect(ingestRes.status).to.equal(200);

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

    const eventsRes = await getEvents(createRes.body.data.identifier);
    expect(eventsRes.status).to.equal(200);
    expect(
      eventsRes.body.data.events.some(
        (envelope: AgentEventEnvelope) =>
          envelope.event.type === 'message' && envelope.event.messageId === agentActivity.platformMessageId
      )
    ).to.equal(true);
  });

  it('should soft-block plan-limit turns mid-inbound without activating the agent', async () => {
    await linkWebChat();
    const bridgeExecutor = testServer.getService(BridgeExecutorService);
    const bridgeStub = bridgeExecutor.execute as sinon.SinonStub;
    const maybeBlockSpy = sinon.spy(testServer.getService(PlanLimitGateService), 'maybeBlock');

    sinon.stub(testServer.getService(AgentEntitlementsService), 'checkRuntimeLimits').resolves({
      agentWithinLimit: false,
      channelWithinLimit: true,
    });

    const createRes = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Blocked by plan limit',
    });
    // Same spine as other channels: accept returns 201; PlanLimitGate soft-blocks
    // inside inbound-turn (upgrade card may be ephemeral for brand-new web threads).
    expect(createRes.status).to.equal(201);
    expect(createRes.body.data.identifier).to.match(/^conv_/);

    await pollFor(async () => (maybeBlockSpy.called && (await maybeBlockSpy.returnValues[0]) ? true : null));
    expect(bridgeStub.called).to.equal(false);
    const activations = await activationRepository.count({ _organizationId: ctx.session.organization._id });
    expect(activations).to.equal(0);
  });

  it('should initialize sequence allocation above legacy unsequenced history', async () => {
    await linkWebChat();
    const createRes = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Legacy sequence thread',
    });
    expect(createRes.status).to.equal(201);
    const conversation = await waitForConversation(createRes.body.data.identifier);

    await activityRepository.update(
      {
        _conversationId: conversation._id,
        _environmentId: ctx.session.environment._id,
        _organizationId: ctx.session.organization._id,
      },
      { $unset: { sequence: 1 } }
    );
    await conversationRepository.update(
      {
        _id: conversation._id,
        _environmentId: ctx.session.environment._id,
        _organizationId: ctx.session.organization._id,
      },
      { $set: { eventSequence: 0 } }
    );

    const runtimeMessageId = `msg-legacy-seq-${Date.now()}`;
    await ctx.session.testAgent.post('/v1/agents/events/ingest').send({
      events: [messageEnvelope(conversation._id, runtimeMessageId)],
    });

    const agentActivity = await pollFor(() =>
      activityRepository.findOne(
        {
          _conversationId: conversation._id,
          _environmentId: ctx.session.environment._id,
          identifier: runtimeMessageId,
        },
        '*'
      )
    );
    expect(agentActivity.sequence).to.be.greaterThan(1);

    const eventsRes = await getEvents(createRes.body.data.identifier);
    expect(eventsRes.status).to.equal(200);
    const sequences = eventsRes.body.data.events.map((event: AgentEventEnvelope) => event.sequence);
    expect(new Set(sequences).size).to.equal(sequences.length);

    const gapFillRes = await getEvents(createRes.body.data.identifier, subscriberToken, {
      afterSequence: 1,
      limit: 1,
    });
    expect(gapFillRes.status).to.equal(200);
    expect(gapFillRes.body.data.events.map((event: AgentEventEnvelope) => event.sequence)).to.deep.equal([
      agentActivity.sequence,
    ]);
  });

  it('should return concurrent durable events in sequence order during gap-fill', async () => {
    await linkWebChat();
    const createRes = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Out-of-order persistence thread',
    });
    expect(createRes.status).to.equal(201);
    const conversation = await waitForConversation(createRes.body.data.identifier);
    const channel = conversation.channels.find((candidate) => candidate.platform === 'web_chat');
    if (!channel) {
      throw new Error('Expected a web-chat channel');
    }

    const createActivity = (sequence: number) =>
      activityRepository.createAgentActivity({
        identifier: `runtime-sequence-${sequence}`,
        conversationId: conversation._id,
        platform: channel.platform,
        integrationId: channel._integrationId,
        platformThreadId: channel.platformThreadId,
        platformMessageId: `platform-sequence-${sequence}`,
        agentId: ctx.agentIdentifier,
        content: `Sequence ${sequence}`,
        sequence,
        environmentId: ctx.session.environment._id,
        organizationId: ctx.session.organization._id,
      });

    await createActivity(3);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await createActivity(2);

    const firstGapPage = await getEvents(createRes.body.data.identifier, subscriberToken, {
      afterSequence: 1,
      limit: 1,
    });
    expect(firstGapPage.status).to.equal(200);
    expect(firstGapPage.body.data.events.map((event: AgentEventEnvelope) => event.sequence)).to.deep.equal([2]);
    expect(firstGapPage.body.data.hasMore).to.equal(true);

    const secondGapPage = await getEvents(createRes.body.data.identifier, subscriberToken, {
      afterSequence: 2,
      limit: 1,
    });
    expect(secondGapPage.status).to.equal(200);
    expect(secondGapPage.body.data.events.map((event: AgentEventEnvelope) => event.sequence)).to.deep.equal([3]);
  });

  it('should support ephemeral sequence gaps in durable afterSequence gap-fill', async () => {
    await linkWebChat();
    const createRes = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Gap fill thread',
    });
    expect(createRes.status).to.equal(201);
    const conversation = await waitForConversation(createRes.body.data.identifier);

    // Simulate ephemeral typing consuming a sequence without a durable activity.
    await conversationRepository.allocateEventSequence(
      ctx.session.environment._id,
      ctx.session.organization._id,
      conversation._id
    );

    const messageId = `msg-gap-${Date.now()}`;
    await ctx.session.testAgent.post('/v1/agents/events/ingest').send({
      events: [messageEnvelope(conversation._id, messageId)],
    });

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

    const refreshed = await conversationRepository.findOne(
      { _id: conversation._id, _environmentId: ctx.session.environment._id },
      '*'
    );
    expect(refreshed?.eventSequence).to.be.greaterThan(1);

    const eventsRes = await getEvents(createRes.body.data.identifier);
    expect(eventsRes.status).to.equal(200);
    const agentMsg = eventsRes.body.data.events.find(
      (e: AgentEventEnvelope) => e.event.type === 'message' && e.event.messageId === agentActivity.platformMessageId
    );
    expect(agentMsg).to.exist;
    expect(agentMsg.sequence).to.be.a('number');
    // Durable history has fewer events than the high-watermark (ephemeral left a gap).
    expect(eventsRes.body.data.events.length).to.be.lessThan(refreshed!.eventSequence!);

    const afterUser = await getEvents(createRes.body.data.identifier, subscriberToken, {
      afterSequence: 1,
      limit: 50,
    });
    expect(afterUser.status).to.equal(200);
    expect(
      afterUser.body.data.events.some(
        (e: AgentEventEnvelope) => e.event.type === 'message' && e.event.messageId === agentActivity.platformMessageId
      )
    ).to.equal(true);
  });
});
