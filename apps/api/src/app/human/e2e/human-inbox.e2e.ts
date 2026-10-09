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
const STRANGER_CHAT_ID = '888202';

describe('Human inbox (list → show → send → resolve) #novu-v2', () => {
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

  function makeTelegramThread(chatId: string) {
    return {
      id: `telegram:${chatId}`,
      channelId: chatId,
      isDM: true,
      toJSON: () => ({ id: `telegram:${chatId}`, channelId: chatId, isDM: true }),
      startTyping: async () => {},
      post: sinon.stub().resolves({ id: 'reply-1', threadId: `telegram:${chatId}` }),
    };
  }

  async function sendMessageToRelay(text: string, chatId = TELEGRAM_CHAT_ID) {
    const config = await testServer
      .getService(AgentConfigResolver)
      .resolve(relayAgentId, integrationIdentifier, { source: 'webhook_message' });
    const thread = makeTelegramThread(chatId);

    await testServer.getService(AgentInboundHandler).handle(
      relayAgentId,
      config,
      thread as any,
      {
        id: `msg-${Math.random().toString(36).slice(2)}`,
        threadId: `telegram:${chatId}`,
        text,
        author: { userId: chatId, fullName: 'Ada Human', userName: 'ada', isBot: false },
        raw: { message: { chat: { id: Number(chatId) } } },
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

  function lastTelegramSend() {
    const sends = telegramApiStub.calls.filter((call) => call.method === 'sendMessage');
    expect(sends.length).to.be.greaterThan(0);

    return sends[sends.length - 1];
  }

  it('surfaces free text to the relay as an unread thread and stays silent on the channel', async () => {
    const thread = await sendMessageToRelay('Can you check the deploy?');

    expect(thread.post.called).to.equal(false);

    const { data } = await listInbox({ filter: 'unread' });
    expect(data).to.have.length(1);
    expect(data[0]).to.include({
      channel: 'telegram',
      kind: 'contact',
      status: 'open',
      unreadCount: 1,
      isDirectMessage: true,
    });
    expect(data[0].people).to.deep.equal([{ id: subscriberId, name: 'Ada', kind: 'contact' }]);
    expect(data[0].lastMessage).to.include({ text: 'Can you check the deploy?', from: 'human' });
    expect((await listInbox({ filter: 'read' })).data).to.have.length(0);
  });

  it('shows the thread history without marking it read', async () => {
    await sendMessageToRelay('first');
    await sendMessageToRelay('second');
    const threadId = await soleThreadId();

    const showRes = await session.testAgent.get(`/v1/human/inbox/${threadId}`);
    expect(showRes.status).to.equal(200, JSON.stringify(showRes.body));
    const { thread, messages } = showRes.body.data;
    expect(messages.map((message: { text: string }) => message.text)).to.deep.equal(['first', 'second']);
    expect(messages[0]).to.include({ from: 'human', senderKind: 'contact' });
    expect(thread.unreadCount).to.equal(2);

    expect((await listInbox({ filter: 'unread' })).data).to.have.length(1);
  });

  it('tells into the thread as plain text, marks it read and says what was unread', async () => {
    await sendMessageToRelay('ping');
    const threadId = await soleThreadId();

    const tellRes = await session.testAgent
      .post('/v1/human/interactions')
      .send({ kind: 'tell', card: { title: 'pong from agent' }, thread: threadId });
    expect(tellRes.status).to.equal(201, JSON.stringify(tellRes.body));
    expect(tellRes.body.data.threads).to.deep.equal([{ id: threadId, unreadBefore: 1 }]);

    const send = lastTelegramSend();
    expect(send.payload.text).to.equal('pong from agent');
    expect(send.payload.reply_markup).to.equal(undefined);
    expect(String(send.payload.chat_id)).to.equal(TELEGRAM_CHAT_ID);

    expect((await listInbox({ filter: 'unread' })).data).to.have.length(0);

    const showRes = await session.testAgent.get(`/v1/human/inbox/${threadId}`);
    const fromAgent = showRes.body.data.messages.filter((message: { from: string }) => message.from === 'agent');
    expect(fromAgent).to.have.length(1);
    expect(fromAgent[0].text).to.include('pong from agent');
  });

  it('files a send to a contact under the thread they already have on Telegram', async () => {
    await sendMessageToRelay('are you there?');
    const threadId = await soleThreadId();

    const tellRes = await session.testAgent
      .post('/v1/human/interactions')
      .send({ kind: 'tell', card: { title: 'Build finished' }, to: subscriberId });
    expect(tellRes.status).to.equal(201, JSON.stringify(tellRes.body));
    expect(tellRes.body.data.threads).to.deep.equal([{ id: threadId, unreadBefore: 1 }]);

    expect((await listInbox({ filter: 'unread' })).data).to.have.length(0);
    expect((await listInbox()).data.map((thread) => thread.id)).to.deep.equal([threadId]);
  });

  it('starts a thread when the agent writes to a contact first', async () => {
    expect((await listInbox()).data).to.have.length(0);

    const tellRes = await session.testAgent
      .post('/v1/human/interactions')
      .send({ kind: 'tell', card: { title: 'Good morning' }, to: subscriberId });
    expect(tellRes.status).to.equal(201, JSON.stringify(tellRes.body));
    expect(tellRes.body.data.threads).to.have.length(1);
    expect(tellRes.body.data.threads[0].unreadBefore).to.equal(0);

    const { data } = await listInbox();
    expect(data.map((thread) => thread.id)).to.deep.equal([tellRes.body.data.threads[0].id]);
    expect(data[0].unreadCount).to.equal(0);
  });

  it('rejects `via` together with `thread`, and a send with neither `to` nor `thread`', async () => {
    await sendMessageToRelay('hello');
    const threadId = await soleThreadId();

    const viaRes = await session.testAgent
      .post('/v1/human/interactions')
      .send({ kind: 'tell', card: { title: 'x' }, thread: threadId, via: 'telegram' });
    expect(viaRes.status).to.equal(400, JSON.stringify(viaRes.body));

    const noneRes = await session.testAgent.post('/v1/human/interactions').send({ kind: 'tell', card: { title: 'x' } });
    expect(noneRes.status).to.equal(400, JSON.stringify(noneRes.body));
  });

  it('holds a --wait request until a message arrives', async () => {
    const started = Date.now();
    const pending = session.testAgent.get('/v1/human/inbox').query({ filter: 'unread', wait: 10 });

    await new Promise((resolve) => setTimeout(resolve, 500));
    await sendMessageToRelay('arrived while waiting');

    const res = await pending;
    expect(res.status).to.equal(200, JSON.stringify(res.body));
    expect(res.body.data).to.have.length(1);
    expect(Date.now() - started).to.be.lessThan(10_000);
  });

  it('returns an empty page when --wait runs out', async () => {
    const res = await session.testAgent.get('/v1/human/inbox').query({ filter: 'unread', wait: 2 });

    expect(res.status).to.equal(200);
    expect(res.body.data).to.deep.equal([]);
  });

  it('asks in the thread, and the answer settles it without leaving the thread unread', async () => {
    await sendMessageToRelay('need a decision');
    const threadId = await soleThreadId();

    const askRes = await session.testAgent
      .post('/v1/human/interactions')
      .send({ kind: 'ask', card: { title: 'Which environment?' }, thread: threadId });
    expect(askRes.status).to.equal(201, JSON.stringify(askRes.body));
    const interactionId = askRes.body.data.id as string;
    expect(askRes.body.data.status).to.equal(HumanInteractionStatusEnum.PENDING);
    expect(askRes.body.data.to).to.deep.equal([subscriberId]);
    expect(JSON.stringify(lastTelegramSend().payload)).to.include('Which environment?');

    await sendMessageToRelay('staging');

    const getRes = await session.testAgent.get(`/v1/human/interactions/${interactionId}`);
    expect(getRes.body.data.status).to.equal(HumanInteractionStatusEnum.ANSWERED);
    expect(getRes.body.data.response.text).to.equal('staging');

    expect((await listInbox({ filter: 'unread' })).data).to.have.length(0);

    const showRes = await session.testAgent.get(`/v1/human/inbox/${threadId}`);
    const messages = showRes.body.data.messages as Array<{ text: string; interaction?: { id: string } }>;
    expect(messages.map((message) => message.text)).to.include('staging');
    // The question is one row, not the card plus a copy of it.
    expect(messages.filter((message) => message.text.includes('Which environment?'))).to.have.length(1);
    expect(messages.some((message) => message.interaction?.id === interactionId)).to.equal(true);
  });

  it('resolves a thread, hides it by default, and reopens it on a new message', async () => {
    await sendMessageToRelay('done soon');
    const threadId = await soleThreadId();

    const resolveRes = await session.testAgent.post(`/v1/human/inbox/${threadId}/resolve`);
    expect(resolveRes.status).to.equal(200, JSON.stringify(resolveRes.body));
    expect(resolveRes.body.data.status).to.equal('resolved');

    expect((await listInbox()).data).to.have.length(0);
    expect((await listInbox({ status: 'resolved' })).data.map((thread) => thread.id)).to.deep.equal([threadId]);
    expect((await listInbox({ status: 'all' })).data.map((thread) => thread.id)).to.deep.equal([threadId]);

    await sendMessageToRelay('one more thing');
    const reopened = await listInbox({ filter: 'unread' });
    expect(reopened.data).to.have.length(1);
    expect(reopened.data[0]).to.include({ id: threadId, status: 'open', unreadCount: 1 });
  });

  it('opens a resolved thread again when the agent sends into it', async () => {
    await sendMessageToRelay('thanks');
    const threadId = await soleThreadId();
    await session.testAgent.post(`/v1/human/inbox/${threadId}/resolve`);

    const tellRes = await session.testAgent
      .post('/v1/human/interactions')
      .send({ kind: 'tell', card: { title: 'One more update' }, thread: threadId });
    expect(tellRes.status).to.equal(201, JSON.stringify(tellRes.body));

    const { data } = await listInbox();
    expect(data).to.have.length(1);
    expect(data[0]).to.include({ id: threadId, status: 'open' });
  });

  it('marks a thread read without replying', async () => {
    await sendMessageToRelay('fyi');
    const threadId = await soleThreadId();

    const readRes = await session.testAgent.post(`/v1/human/inbox/${threadId}/read`);
    expect(readRes.status).to.equal(200, JSON.stringify(readRes.body));
    expect(readRes.body.data.unreadCount).to.equal(0);
    expect((await listInbox({ filter: 'unread' })).data).to.have.length(0);
    expect((await listInbox({ filter: 'read' })).data).to.have.length(1);
  });

  it('keeps threads from strangers out of the default list and lets the agent reply in them', async () => {
    await sendMessageToRelay('hi, who is this?', STRANGER_CHAT_ID);

    expect((await listInbox()).data).to.have.length(0);

    const { data } = await listInbox({ senders: 'all' });
    expect(data).to.have.length(1);
    expect(data[0]).to.include({ kind: 'stranger', unreadCount: 1 });
    expect(data[0].people).to.deep.equal([{ id: `telegram:${STRANGER_CHAT_ID}`, kind: 'stranger' }]);

    const showRes = await session.testAgent.get(`/v1/human/inbox/${data[0].id}`);
    expect(showRes.body.data.messages[0]).to.include({ from: 'human', senderKind: 'stranger' });

    const coldRes = await session.testAgent
      .post('/v1/human/interactions')
      .send({ kind: 'tell', card: { title: 'hello' }, to: data[0].people[0].id });
    expect(coldRes.status).to.be.within(400, 499, JSON.stringify(coldRes.body));

    const replyRes = await session.testAgent
      .post('/v1/human/interactions')
      .send({ kind: 'tell', card: { title: 'This is the deploy bot.' }, thread: data[0].id });
    expect(replyRes.status).to.equal(201, JSON.stringify(replyRes.body));
    expect(String(lastTelegramSend().payload.chat_id)).to.equal(STRANGER_CHAT_ID);
    expect((await listInbox({ senders: 'all', filter: 'unread' })).data).to.have.length(0);
  });

  it('lets a stranger answer a question sent into their thread only when anyone may answer', async () => {
    await sendMessageToRelay('can I get access?', STRANGER_CHAT_ID);
    const { data } = await listInbox({ senders: 'all' });

    const closedRes = await session.testAgent
      .post('/v1/human/interactions')
      .send({ kind: 'ask', card: { title: 'Which project?' }, thread: data[0].id });
    expect(closedRes.status).to.equal(400, JSON.stringify(closedRes.body));
    expect(closedRes.body.message).to.contain('--anyone');

    const askRes = await session.testAgent
      .post('/v1/human/interactions')
      .send({ kind: 'ask', card: { title: 'Which project?' }, thread: data[0].id, anyoneMayAnswer: true });
    expect(askRes.status).to.equal(201, JSON.stringify(askRes.body));

    await sendMessageToRelay('the billing one', STRANGER_CHAT_ID);

    const getRes = await session.testAgent.get(`/v1/human/interactions/${askRes.body.data.id}`);
    expect(getRes.body.data.status).to.equal(HumanInteractionStatusEnum.ANSWERED);
    expect(getRes.body.data.response.text).to.equal('the billing one');
    expect((await listInbox({ senders: 'all', filter: 'unread' })).data).to.have.length(0);
  });

  it('404s on a thread that is not the relay agent’s', async () => {
    const res = await session.testAgent.get('/v1/human/inbox/conv_doesnotexist');

    expect(res.status).to.equal(404);
  });
});
