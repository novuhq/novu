import { AGENT_EVENT_PROTOCOL_VERSION, type AgentEventEnvelope } from '@novu/agent-event-protocol';
import { AgentEntitlementsService, createHash, WebSocketsQueueService } from '@novu/application-generic';
import {
  ConversationActivationRepository,
  ConversationActivitySenderTypeEnum,
  ConversationActivityTypeEnum,
  ConversationParticipantTypeEnum,
  IntegrationRepository,
} from '@novu/dal';
import { ChatProviderIdEnum, WebSocketEventEnum } from '@novu/shared';
import { testServer } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { ConversationActivationService } from '../conversation-runtime/conversation/conversation-activation.service';
import { BridgeExecutorService } from '../conversation-runtime/runtime/bridge-executor.service';
import {
  AgentTestContext,
  activityRepository,
  conversationRepository,
  setupAgentTestContext,
} from './helpers/agent-test-setup';

const activationRepository = new ConversationActivationRepository();
const integrationRepository = new IntegrationRepository();

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
    body: {
      agentId: string;
      text: string;
      id?: string;
      conversationIdentifier?: string;
      agentHash?: string;
    },
    token = subscriberToken
  ) {
    return ctx.session.testAgent
      .post('/v1/web-chat/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  }

  async function setWebChatHmac(enabled: boolean) {
    await integrationRepository.update(
      {
        _environmentId: ctx.session.environment._id,
        _organizationId: ctx.session.organization._id,
        providerId: ChatProviderIdEnum.NovuWebChat,
      },
      {
        $set: {
          'credentials.hmac': enabled,
        },
      }
    );
  }

  function mintAgentHash(agentIdentifier = ctx.agentIdentifier) {
    const secretKey = ctx.session.environment.apiKeys[0].key;

    return createHash(secretKey, agentIdentifier) as string;
  }

  function listConversations(token = subscriberToken, query: { after?: string; before?: string; limit?: number } = {}) {
    return ctx.session.testAgent
      .get('/v1/web-chat/conversations')
      .query(query)
      .set('Authorization', `Bearer ${token}`);
  }

  function getConversation(conversationIdentifier: string, token = subscriberToken) {
    return ctx.session.testAgent
      .get(`/v1/web-chat/conversations/${conversationIdentifier}`)
      .set('Authorization', `Bearer ${token}`);
  }

  function getEvents(
    conversationIdentifier: string,
    token = subscriberToken,
    query: { before?: string; limit?: number } = {}
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

  it('should resolve the Web Chat integration linked to the requested agent when several exist', async () => {
    await linkWebChat();

    const otherIdentifier = `e2e-other-web-chat-${Date.now()}`;
    const createOther = await ctx.session.testAgent.post('/v1/agents').send({
      name: 'Other Web Chat Agent',
      identifier: otherIdentifier,
    });
    expect(createOther.status).to.equal(201);
    await linkWebChat(otherIdentifier);

    const res = await createConversation({
      agentId: otherIdentifier,
      text: 'Hello from the second published agent',
    });

    expect(res.status).to.equal(201);
    expect(res.body.data.identifier).to.match(/^conv_/);
  });

  it('should allow create without agentHash when web-chat HMAC is off', async () => {
    await linkWebChat();
    await setWebChatHmac(false);

    const res = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'No hash needed',
    });

    expect(res.status).to.equal(201);
    expect(res.body.data.identifier).to.match(/^conv_/);
  });

  it('should allow resume without agentHash when web-chat HMAC is off', async () => {
    await linkWebChat();
    await setWebChatHmac(false);

    const created = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Bootstrap thread',
    });
    expect(created.status).to.equal(201);
    const identifier = created.body.data.identifier as string;
    await waitForConversation(identifier);

    const res = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Resume without hash',
      conversationIdentifier: identifier,
    });

    expect(res.status).to.equal(201);
    expect(res.body.data.identifier).to.equal(identifier);
  });

  it('should reject missing agentHash with 400 when web-chat HMAC is on', async () => {
    await linkWebChat();
    await setWebChatHmac(true);

    const res = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Missing hash',
    });

    expect(res.status).to.equal(400);
    expect(res.body.message).to.equal('Please provide a valid HMAC hash');
  });

  it('should reject invalid agentHash with 400 when web-chat HMAC is on', async () => {
    await linkWebChat();
    await setWebChatHmac(true);

    const res = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Bad hash',
      agentHash: 'not-a-valid-hmac-digest',
    });

    expect(res.status).to.equal(400);
    expect(res.body.message).to.equal('Please provide a valid HMAC hash');
  });

  it('should create when agentHash is valid and agent is published with HMAC on', async () => {
    await linkWebChat();
    await setWebChatHmac(true);

    const res = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Signed agent',
      agentHash: mintAgentHash(),
    });

    expect(res.status).to.equal(201);
    expect(res.body.data.identifier).to.match(/^conv_/);
    expect(res.body.data.messageId).to.match(/^msg_/);
  });

  it('should reject resume with missing agentHash when web-chat HMAC is on', async () => {
    await linkWebChat();
    await setWebChatHmac(false);

    const created = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Bootstrap thread',
    });
    expect(created.status).to.equal(201);
    await waitForConversation(created.body.data.identifier);

    await setWebChatHmac(true);

    const res = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Resume without hash',
      conversationIdentifier: created.body.data.identifier,
    });

    expect(res.status).to.equal(400);
    expect(res.body.message).to.equal('Please provide a valid HMAC hash');
  });

  it('should resume when agentHash is valid with HMAC on', async () => {
    await linkWebChat();
    await setWebChatHmac(true);
    const agentHash = mintAgentHash();

    const created = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'First signed message',
      agentHash,
    });
    expect(created.status).to.equal(201);
    const identifier = created.body.data.identifier as string;
    await waitForConversation(identifier);

    const res = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Resume signed',
      conversationIdentifier: identifier,
      agentHash,
    });

    expect(res.status).to.equal(201);
    expect(res.body.data.identifier).to.equal(identifier);
  });

  it('should still enforce publication when agentHash is valid', async () => {
    await linkWebChat();
    await setWebChatHmac(true);

    const unpublishedIdentifier = `e2e-unpublished-hmac-${Date.now()}`;
    await ctx.session.testAgent.post('/v1/agents').send({
      name: 'Unpublished HMAC Agent',
      identifier: unpublishedIdentifier,
    });

    const res = await createConversation({
      agentId: unpublishedIdentifier,
      text: 'Valid hash, unpublished agent',
      agentHash: mintAgentHash(unpublishedIdentifier),
    });

    expect(res.status).to.equal(400);
    expect(res.body.message).to.equal('This agent is not available on web chat');
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
    expect(eventsRes.body.data.olderCursor).to.equal(null);
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
    expect(newestPage.body.data.olderCursor).to.be.a('string');

    const newestSequences = newestPage.body.data.events.map((event: AgentEventEnvelope) => event.sequence);
    for (let index = 1; index < newestSequences.length; index += 1) {
      expect(newestSequences[index]).to.be.greaterThan(newestSequences[index - 1]);
    }

    const olderPage = await getEvents(createRes.body.data.identifier, subscriberToken, {
      before: newestPage.body.data.olderCursor,
      limit: 50,
    });
    expect(olderPage.status).to.equal(200);
    expect(olderPage.body.data.events.length).to.be.greaterThan(0);
    expect(olderPage.body.data.events[olderPage.body.data.events.length - 1].sequence).to.be.lessThan(
      newestPage.body.data.events[0].sequence
    );

    const olderSequences = olderPage.body.data.events.map((event: AgentEventEnvelope) => event.sequence);
    for (let index = 1; index < olderSequences.length; index += 1) {
      expect(olderSequences[index]).to.be.greaterThan(olderSequences[index - 1]);
    }
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

    // Inbound ack starts typing on web_chat (PLATFORMS_WITH_TYPING_INDICATOR). Wait for
    // that job, then drop it so the counts below only cover adapter-callback emits from ingest.
    const ackTypingJobs = await pollFor(() => {
      const typingJobs = addStub
        .getCalls()
        .map((call) => call.args[0])
        .filter(
          (job) =>
            job?.data?.event === WebSocketEventEnum.AGENT_EVENT &&
            (job.data.payload as AgentEventEnvelope)?.event?.type === 'channel.typing'
        );

      return typingJobs.length > 0 ? typingJobs : null;
    });
    expect(ackTypingJobs).to.have.length(1);
    expect((ackTypingJobs[0].data.payload as AgentEventEnvelope).event).to.deep.include({
      type: 'channel.typing',
      state: 'on',
    });
    addStub.resetHistory();

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
    // Branding is applied on the adapter delivery path, not persist — web chat
    // must leave the live envelope unbranded even for orgs that still show
    // "Powered by Novu" on Slack/Teams/Telegram.
    if (liveMessage.event.type === 'message') {
      expect(liveMessage.event.content.markdown).to.equal(`Agent reply ${messageId}`);
    }

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

  it('should mint sequence and stamp public agent id when bridge ingests provider-event', async () => {
    await linkWebChat();
    const wsQueue = testServer.getService(WebSocketsQueueService);
    const addStub = sinon.stub(wsQueue, 'add');

    const createRes = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Provider event bridge thread',
    });
    expect(createRes.status).to.equal(201);
    const conversation = await waitForConversation(createRes.body.data.identifier);

    const historyBefore = await getEvents(createRes.body.data.identifier);
    expect(historyBefore.status).to.equal(200);
    const maxHistorySequence = Math.max(
      0,
      ...historyBefore.body.data.events.map((envelope: AgentEventEnvelope) => envelope.sequence)
    );

    addStub.resetHistory();

    const providerEnvelope: AgentEventEnvelope = {
      ...messageEnvelope(conversation._id, 'msg-unused'),
      runId: 'run-provider',
      sequence: 1,
      event: {
        type: 'provider-event',
        provider: 'anthropic',
        event: 'content_block_delta',
        data: { index: 0, delta: 'x' },
      },
    };

    const ingestRes = await ctx.session.testAgent.post('/v1/agents/events/ingest').send({ events: [providerEnvelope] });
    expect(ingestRes.status).to.equal(200);

    const providerJobs = addStub
      .getCalls()
      .map((call) => call.args[0])
      .filter(
        (job) =>
          job?.data?.event === WebSocketEventEnum.AGENT_EVENT &&
          (job.data.payload as AgentEventEnvelope)?.event?.type === 'provider-event'
      );
    expect(providerJobs).to.have.length(1);

    const liveEnvelope = providerJobs[0].data.payload as AgentEventEnvelope;
    expect(liveEnvelope.agentId).to.equal(ctx.agentIdentifier);
    expect(liveEnvelope.sequence).to.be.greaterThan(maxHistorySequence);
    expect(liveEnvelope.event).to.deep.equal(providerEnvelope.event);

    const historyRes = await getEvents(createRes.body.data.identifier);
    expect(historyRes.status).to.equal(200);
    const historyProvider = historyRes.body.data.events.find(
      (envelope: AgentEventEnvelope) => envelope.event.type === 'provider-event'
    );
    expect(historyProvider).to.be.undefined;
  });

  it('should deliver provider-event live after history has advanced lastSequence', async () => {
    await linkWebChat();
    const wsQueue = testServer.getService(WebSocketsQueueService);
    const addStub = sinon.stub(wsQueue, 'add');

    const createRes = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Provider event after history thread',
    });
    expect(createRes.status).to.equal(201);
    const conversation = await waitForConversation(createRes.body.data.identifier);
    const messageId = `msg-history-${Date.now()}`;

    const messageIngest = await ctx.session.testAgent.post('/v1/agents/events/ingest').send({
      events: [messageEnvelope(conversation._id, messageId)],
    });
    expect(messageIngest.status).to.equal(200);

    const historyRes = await getEvents(createRes.body.data.identifier);
    expect(historyRes.status).to.equal(200);
    const maxHistorySequence = Math.max(
      ...historyRes.body.data.events.map((envelope: AgentEventEnvelope) => envelope.sequence)
    );

    addStub.resetHistory();

    const providerEnvelope: AgentEventEnvelope = {
      ...messageEnvelope(conversation._id, 'msg-unused'),
      runId: 'run-provider-stale-seq',
      sequence: 1,
      event: {
        type: 'provider-event',
        provider: 'anthropic',
        event: 'message_stop',
        data: { reason: 'end_turn' },
      },
    };

    const ingestRes = await ctx.session.testAgent.post('/v1/agents/events/ingest').send({ events: [providerEnvelope] });
    expect(ingestRes.status).to.equal(200);

    const providerJobs = addStub
      .getCalls()
      .map((call) => call.args[0])
      .filter(
        (job) =>
          job?.data?.event === WebSocketEventEnum.AGENT_EVENT &&
          (job.data.payload as AgentEventEnvelope)?.event?.type === 'provider-event'
      );
    expect(providerJobs).to.have.length(1);

    const liveEnvelope = providerJobs[0].data.payload as AgentEventEnvelope;
    expect(liveEnvelope.sequence).to.be.greaterThan(maxHistorySequence);
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

  it('should return 402 on accept when agent is over plan limit without minting conv_*', async () => {
    await linkWebChat();
    const bridgeExecutor = testServer.getService(BridgeExecutorService);
    const bridgeStub = bridgeExecutor.execute as sinon.SinonStub;

    sinon.stub(testServer.getService(AgentEntitlementsService), 'checkRuntimeLimits').resolves({
      agentWithinLimit: false,
      channelWithinLimit: true,
    });

    const createRes = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Blocked by plan limit',
    });

    expect(createRes.status).to.equal(402);
    expect(createRes.body.reason).to.equal('agents');
    expect(createRes.body.message).to.be.a('string').and.not.empty;
    expect(createRes.body.data).to.equal(undefined);
    expect(bridgeStub.called).to.equal(false);
    const activations = await activationRepository.count({ _organizationId: ctx.session.organization._id });
    expect(activations).to.equal(0);
  });

  it('should return 402 on accept when channel is over plan limit without minting conv_*', async () => {
    await linkWebChat();
    const bridgeExecutor = testServer.getService(BridgeExecutorService);
    const bridgeStub = bridgeExecutor.execute as sinon.SinonStub;

    sinon.stub(testServer.getService(AgentEntitlementsService), 'checkRuntimeLimits').resolves({
      agentWithinLimit: true,
      channelWithinLimit: false,
    });

    const createRes = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Blocked by channel limit',
    });

    expect(createRes.status).to.equal(402);
    expect(createRes.body.reason).to.equal('channels');
    expect(createRes.body.message).to.be.a('string').and.not.empty;
    expect(bridgeStub.called).to.equal(false);
  });

  it('should return 402 on accept when free-tier conversation cap is reached on a new thread', async () => {
    await linkWebChat();
    const bridgeExecutor = testServer.getService(BridgeExecutorService);
    const bridgeStub = bridgeExecutor.execute as sinon.SinonStub;

    sinon.stub(testServer.getService(AgentEntitlementsService), 'checkRuntimeLimits').resolves({
      agentWithinLimit: true,
      channelWithinLimit: true,
    });
    sinon.stub(testServer.getService(ConversationActivationService), 'shouldBlockFreeTier').resolves({
      blocked: true,
      limit: 100,
    });

    const createRes = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Blocked by conversation limit',
    });

    expect(createRes.status).to.equal(402);
    expect(createRes.body.reason).to.equal('conversations');
    expect(createRes.body.message).to.be.a('string').and.not.empty;
    expect(bridgeStub.called).to.equal(false);
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

    // Unsequenced legacy rows are excluded; only sequenced events appear, ascending.
    const eventsRes = await getEvents(createRes.body.data.identifier);
    expect(eventsRes.status).to.equal(200);
    expect(eventsRes.body.data.events).to.have.length(1);
    expect(eventsRes.body.data.events[0].sequence).to.equal(agentActivity.sequence);
    expect(eventsRes.body.data.olderCursor).to.equal(null);
  });

  it('should return concurrent durable events in sequence order on the newest page', async () => {
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

    const newestPage = await getEvents(createRes.body.data.identifier, subscriberToken, { limit: 2 });
    expect(newestPage.status).to.equal(200);
    // Newest page is chronological within the page (seq 2 then 3), not insert order.
    expect(newestPage.body.data.events.map((event: AgentEventEnvelope) => event.sequence)).to.deep.equal([2, 3]);
  });

  it('should omit ephemeral sequence gaps from durable history', async () => {
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
  });

  it('should persist custom ingest as a durable activity, WS job, and history envelope', async () => {
    await linkWebChat();
    const wsQueue = testServer.getService(WebSocketsQueueService);
    const addStub = sinon.stub(wsQueue, 'add');

    const createRes = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Custom data thread',
    });
    expect(createRes.status).to.equal(201);
    const conversation = await waitForConversation(createRes.body.data.identifier);

    addStub.resetHistory();

    const customEnvelope: AgentEventEnvelope = {
      ...messageEnvelope(conversation._id, 'msg-unused'),
      runId: 'run-custom',
      sequence: 1,
      event: {
        type: 'custom',
        name: 'order-progress',
        data: { pct: 70 },
      },
    };

    const ingestRes = await ctx.session.testAgent.post('/v1/agents/events/ingest').send({ events: [customEnvelope] });
    expect(ingestRes.status).to.equal(200);

    const customJobs = addStub
      .getCalls()
      .map((call) => call.args[0])
      .filter(
        (job) =>
          job?.data?.event === WebSocketEventEnum.AGENT_EVENT &&
          (job.data.payload as AgentEventEnvelope)?.event?.type === 'custom'
      );
    expect(customJobs).to.have.length(1);

    const liveEnvelope = customJobs[0].data.payload as AgentEventEnvelope;
    expect(liveEnvelope.runId).to.equal('run-custom');
    expect(liveEnvelope.event).to.deep.equal({
      type: 'custom',
      name: 'order-progress',
      data: { pct: 70 },
    });

    const customActivity = await pollFor(() =>
      activityRepository.findOne(
        {
          _conversationId: conversation._id,
          _environmentId: ctx.session.environment._id,
          type: ConversationActivityTypeEnum.CUSTOM,
        },
        '*'
      )
    );
    expect(customActivity.identifier).to.equal('custom:run-custom:1');
    expect(customActivity.sequence).to.equal(liveEnvelope.sequence);
    expect(customActivity.richContent).to.deep.include({
      custom: { name: 'order-progress', data: { pct: 70 } },
    });

    const historyRes = await getEvents(createRes.body.data.identifier);
    expect(historyRes.status).to.equal(200);
    const historyCustom = historyRes.body.data.events.filter(
      (envelope: AgentEventEnvelope) => envelope.event.type === 'custom'
    );
    expect(historyCustom).to.have.length(1);
    expect(historyCustom[0].runId).to.equal('run-custom');
    expect(historyCustom[0].event).to.deep.equal(liveEnvelope.event);
    expect(historyCustom[0].sequence).to.equal(liveEnvelope.sequence);

    const transcript = await activityRepository.listForView({
      view: 'llm_transcript',
      environmentId: ctx.session.environment._id,
      organizationId: ctx.session.organization._id,
      conversationId: conversation._id,
      limit: 50,
    });
    expect(transcript.data.some((activity) => activity.type === ConversationActivityTypeEnum.CUSTOM)).to.equal(false);

    const timeline = await activityRepository.listForView({
      view: 'operator_timeline',
      environmentId: ctx.session.environment._id,
      organizationId: ctx.session.organization._id,
      conversationId: conversation._id,
      limit: 50,
    });
    expect(timeline.data.some((activity) => activity.type === ConversationActivityTypeEnum.CUSTOM)).to.equal(true);
  });

  it('should skip oversized custom data in a mixed ingest batch and still persist the sibling message', async () => {
    await linkWebChat();
    const wsQueue = testServer.getService(WebSocketsQueueService);
    const addStub = sinon.stub(wsQueue, 'add');

    const createRes = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Oversized custom thread',
    });
    expect(createRes.status).to.equal(201);
    const conversation = await waitForConversation(createRes.body.data.identifier);
    const messageId = `msg-oversized-sibling-${Date.now()}`;

    addStub.resetHistory();

    const ingestRes = await ctx.session.testAgent.post('/v1/agents/events/ingest').send({
      events: [
        {
          ...messageEnvelope(conversation._id, 'msg-unused'),
          event: {
            type: 'custom',
            name: 'order-progress',
            data: 'x'.repeat(65535),
          },
        },
        messageEnvelope(conversation._id, messageId),
      ],
    });
    expect(ingestRes.status).to.equal(200);

    const customActivity = await activityRepository.findOne(
      {
        _conversationId: conversation._id,
        _environmentId: ctx.session.environment._id,
        type: ConversationActivityTypeEnum.CUSTOM,
      },
      '*'
    );
    expect(customActivity).to.equal(null);

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
    expect(messageActivity).to.exist;

    const customJobs = addStub
      .getCalls()
      .map((call) => call.args[0])
      .filter(
        (job) =>
          job?.data?.event === WebSocketEventEnum.AGENT_EVENT &&
          (job.data.payload as AgentEventEnvelope)?.event?.type === 'custom'
      );
    expect(customJobs).to.have.length(0);

    const historyRes = await getEvents(createRes.body.data.identifier);
    expect(historyRes.status).to.equal(200);
    expect(
      historyRes.body.data.events.some((envelope: AgentEventEnvelope) => envelope.event.type === 'custom')
    ).to.equal(false);
    expect(
      historyRes.body.data.events.some(
        (envelope: AgentEventEnvelope) => envelope.event.type === 'message' && envelope.event.messageId === messageId
      )
    ).to.equal(true);
  });

  it('should persist two same-name custom emits as two history envelopes', async () => {
    await linkWebChat();

    const createRes = await createConversation({
      agentId: ctx.agentIdentifier,
      text: 'Duplicate custom name thread',
    });
    expect(createRes.status).to.equal(201);
    const conversation = await waitForConversation(createRes.body.data.identifier);

    const ingestRes = await ctx.session.testAgent.post('/v1/agents/events/ingest').send({
      events: [
        {
          ...messageEnvelope(conversation._id, 'msg-unused'),
          sequence: 1,
          event: { type: 'custom', name: 'order-progress', data: { pct: 40 } },
        },
        {
          ...messageEnvelope(conversation._id, 'msg-unused'),
          sequence: 2,
          event: { type: 'custom', name: 'order-progress', data: { pct: 70 } },
        },
      ],
    });
    expect(ingestRes.status).to.equal(200);

    const historyRes = await getEvents(createRes.body.data.identifier);
    expect(historyRes.status).to.equal(200);
    const historyCustom = historyRes.body.data.events.filter(
      (envelope: AgentEventEnvelope) => envelope.event.type === 'custom'
    );
    expect(historyCustom).to.have.length(2);
    expect(historyCustom.map((envelope: AgentEventEnvelope) => envelope.event)).to.deep.equal([
      { type: 'custom', name: 'order-progress', data: { pct: 40 } },
      { type: 'custom', name: 'order-progress', data: { pct: 70 } },
    ]);
    expect(historyCustom[0].sequence).to.be.lessThan(historyCustom[1].sequence);
  });
});
