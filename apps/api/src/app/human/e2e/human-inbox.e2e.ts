import { encryptCredentials } from '@novu/application-generic';
import { AgentIntegrationRepository, ChannelEndpointRepository, IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum, ENDPOINT_TYPES, HumanInteractionStatusEnum } from '@novu/shared';
import { testServer, UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { AgentConfigResolver } from '../../agents/channels/agent-config-resolver.service';
import { ChatInstanceRegistry } from '../../agents/conversation-runtime/ingress/chat-instance.registry';
import { AgentInboundHandler } from '../../agents/conversation-runtime/ingress/inbound-turn.handler';
import { startTelegramApiStub, type TelegramApiStub } from '../../agents/e2e/helpers/telegram-api-stub';
import { AgentEventEnum } from '../../agents/shared/enums/agent-event.enum';

const integrationRepository = new IntegrationRepository();
const agentIntegrationRepository = new AgentIntegrationRepository();
const channelEndpointRepository = new ChannelEndpointRepository();

const TELEGRAM_CHAT_ID = '777101';

describe('Human inbox (list → show → reply → resolve) #novu-v2', () => {
  let session: UserSession;
  let telegramApiStub: TelegramApiStub;
  let subscriberId: string;
  let integrationIdentifier: string;
  let relayAgentId: string;

  before(async () => {
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
    telegramApiStub = await startTelegramApiStub();
  });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    telegramApiStub.reset();

    subscriberId = `inbox-e2e-${Date.now()}`;

    const setupRes = await session.testAgent.post('/v1/human/setup').send({ subscriberId, firstName: 'Ada' });
    expect(setupRes.status).to.equal(200, JSON.stringify(setupRes.body));
    relayAgentId = setupRes.body.data.agentId as string;

    const integration = await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      providerId: ChatProviderIdEnum.Telegram,
      channel: ChannelTypeEnum.CHAT,
      credentials: encryptCredentials({
        apiToken: '12345678:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        token: 'e2e-inbox-telegram-secret',
      }),
      active: true,
      identifier: `telegram-inbox-e2e-${Date.now()}`,
      priority: 1,
      primary: false,
      deleted: false,
    });
    integrationIdentifier = integration.identifier;

    await agentIntegrationRepository.create({
      _agentId: relayAgentId,
      _integrationId: integration._id,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    await channelEndpointRepository.create({
      identifier: `ce-inbox-e2e-${Date.now()}`,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      integrationIdentifier,
      providerId: ChatProviderIdEnum.Telegram,
      channel: ChannelTypeEnum.CHAT,
      subscriberId,
      contextKeys: [],
      type: ENDPOINT_TYPES.TELEGRAM_CHAT,
      endpoint: { chatId: TELEGRAM_CHAT_ID },
    });
  });

  afterEach(async () => {
    const registry = testServer.getService(ChatInstanceRegistry);
    await registry.onModuleDestroy();
  });

  function makeTelegramThread() {
    return {
      id: `telegram:${TELEGRAM_CHAT_ID}`,
      channelId: TELEGRAM_CHAT_ID,
      isDM: true,
      toJSON: () => ({ id: `telegram:${TELEGRAM_CHAT_ID}`, channelId: TELEGRAM_CHAT_ID, isDM: true }),
      startTyping: async () => {},
      post: sinon.stub().resolves({ id: 'reply-1', threadId: `telegram:${TELEGRAM_CHAT_ID}` }),
    };
  }

  async function sendMessageToRelay(text: string) {
    const config = await testServer
      .getService(AgentConfigResolver)
      .resolve(relayAgentId, integrationIdentifier, { source: 'webhook_message' });
    const thread = makeTelegramThread();

    await testServer.getService(AgentInboundHandler).handle(
      relayAgentId,
      config,
      thread as any,
      {
        id: `msg-${Math.random().toString(36).slice(2)}`,
        threadId: `telegram:${TELEGRAM_CHAT_ID}`,
        text,
        author: { userId: TELEGRAM_CHAT_ID, fullName: 'Ada Human', userName: 'ada', isBot: false },
        raw: { message: { chat: { id: Number(TELEGRAM_CHAT_ID) } } },
        attachments: [],
      } as any,
      AgentEventEnum.ON_MESSAGE
    );

    return thread;
  }

  async function listInbox(query: Record<string, unknown> = {}) {
    const res = await session.testAgent.get('/v1/human/inbox').query(query);
    expect(res.status).to.equal(200, JSON.stringify(res.body));

    return res.body as { data: Array<Record<string, any>>; next: string | null };
  }

  async function soleThreadId(): Promise<string> {
    const { data } = await listInbox();
    expect(data).to.have.length(1);

    return data[0].id as string;
  }

  it('surfaces free text to the relay as an unread thread and stays silent on the channel', async () => {
    const thread = await sendMessageToRelay('Can you check the deploy?');

    expect(thread.post.called).to.equal(false);

    const { data } = await listInbox({ unread: true });
    expect(data).to.have.length(1);
    expect(data[0]).to.include({ channel: 'telegram', status: 'active', unreadCount: 1, isDirectMessage: true });
    expect(data[0].from).to.deep.equal({ subscriberId, name: 'Ada' });
    expect(data[0].lastMessage).to.include({ text: 'Can you check the deploy?', from: 'human' });
  });

  it('shows the thread history and marks it read', async () => {
    await sendMessageToRelay('first');
    await sendMessageToRelay('second');
    const threadId = await soleThreadId();

    const showRes = await session.testAgent.get(`/v1/human/inbox/${threadId}`);
    expect(showRes.status).to.equal(200, JSON.stringify(showRes.body));
    const { thread, messages } = showRes.body.data;
    expect(messages.map((message: { text: string }) => message.text)).to.deep.equal(['first', 'second']);
    expect(messages[0].from).to.equal('human');
    expect(thread.unreadCount).to.equal(0);

    expect((await listInbox({ unread: true })).data).to.have.length(0);

    await sendMessageToRelay('third');
    const unread = await listInbox({ unread: true });
    expect(unread.data).to.have.length(1);
    expect(unread.data[0].unreadCount).to.equal(1);
  });

  it('replies on the channel the thread came from and records the agent message', async () => {
    await sendMessageToRelay('ping');
    const threadId = await soleThreadId();

    const replyRes = await session.testAgent
      .post(`/v1/human/inbox/${threadId}/reply`)
      .send({ text: 'pong from agent' });
    expect(replyRes.status).to.equal(200, JSON.stringify(replyRes.body));
    expect(replyRes.body.data.thread.unreadCount).to.equal(0);

    const sends = telegramApiStub.calls.filter((call) => call.method === 'sendMessage');
    expect(sends.length).to.be.greaterThan(0);
    expect(JSON.stringify(sends[sends.length - 1].payload)).to.include('pong from agent');
    expect(String(sends[sends.length - 1].payload.chat_id)).to.equal(TELEGRAM_CHAT_ID);

    const showRes = await session.testAgent.get(`/v1/human/inbox/${threadId}`);
    const last = showRes.body.data.messages.at(-1);
    expect(last).to.include({ from: 'agent', text: 'pong from agent' });
  });

  it('holds a --wait request until a message arrives', async () => {
    const started = Date.now();
    const pending = session.testAgent.get('/v1/human/inbox').query({ unread: true, wait: 10 });

    await new Promise((resolve) => setTimeout(resolve, 500));
    await sendMessageToRelay('arrived while waiting');

    const res = await pending;
    expect(res.status).to.equal(200, JSON.stringify(res.body));
    expect(res.body.data).to.have.length(1);
    expect(Date.now() - started).to.be.lessThan(10_000);
  });

  it('returns an empty page when --wait runs out', async () => {
    const res = await session.testAgent.get('/v1/human/inbox').query({ unread: true, wait: 2 });

    expect(res.status).to.equal(200);
    expect(res.body.data).to.deep.equal([]);
  });

  it('asks in the thread, and the answer settles it without leaving the thread unread', async () => {
    await sendMessageToRelay('need a decision');
    const threadId = await soleThreadId();

    const askRes = await session.testAgent
      .post(`/v1/human/inbox/${threadId}/interactions`)
      .send({ kind: 'ask', card: { title: 'Which environment?' } });
    expect(askRes.status).to.equal(201, JSON.stringify(askRes.body));
    const interactionId = askRes.body.data.id as string;
    expect(askRes.body.data.status).to.equal(HumanInteractionStatusEnum.PENDING);

    const sends = telegramApiStub.calls.filter((call) => call.method === 'sendMessage');
    expect(JSON.stringify(sends[sends.length - 1].payload)).to.include('Which environment?');

    await sendMessageToRelay('staging');

    const getRes = await session.testAgent.get(`/v1/human/interactions/${interactionId}`);
    expect(getRes.body.data.status).to.equal(HumanInteractionStatusEnum.ANSWERED);
    expect(getRes.body.data.response.text).to.equal('staging');

    expect((await listInbox({ unread: true })).data).to.have.length(0);

    const showRes = await session.testAgent.get(`/v1/human/inbox/${threadId}`);
    const texts = showRes.body.data.messages.map((message: { text: string }) => message.text);
    expect(texts).to.include('staging');
    expect(
      showRes.body.data.messages.some(
        (message: { interaction?: { id: string } }) => message.interaction?.id === interactionId
      )
    ).to.equal(true);
  });

  it('resolves a thread, hides it by default, and reopens it on a new message', async () => {
    await sendMessageToRelay('done soon');
    const threadId = await soleThreadId();

    const resolveRes = await session.testAgent.post(`/v1/human/inbox/${threadId}/resolve`);
    expect(resolveRes.status).to.equal(200, JSON.stringify(resolveRes.body));
    expect(resolveRes.body.data.status).to.equal('resolved');

    expect((await listInbox()).data).to.have.length(0);
    const all = await listInbox({ all: true });
    expect(all.data.map((thread) => thread.id)).to.deep.equal([threadId]);

    await sendMessageToRelay('one more thing');
    const reopened = await listInbox({ unread: true });
    expect(reopened.data).to.have.length(1);
    expect(reopened.data[0]).to.include({ id: threadId, status: 'active', unreadCount: 1 });
  });

  it('marks a thread read without replying', async () => {
    await sendMessageToRelay('fyi');
    const threadId = await soleThreadId();

    const readRes = await session.testAgent.post(`/v1/human/inbox/${threadId}/read`);
    expect(readRes.status).to.equal(200, JSON.stringify(readRes.body));
    expect(readRes.body.data.unreadCount).to.equal(0);
    expect((await listInbox({ unread: true })).data).to.have.length(0);
  });

  it('404s on a thread that is not the relay agent’s', async () => {
    const res = await session.testAgent.get('/v1/human/inbox/conv_doesnotexist');

    expect(res.status).to.equal(404);
  });
});
