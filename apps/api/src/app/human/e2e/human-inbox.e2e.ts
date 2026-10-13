import { encryptCredentials } from '@novu/application-generic';
import {
  AgentIntegrationRepository,
  ChannelEndpointRepository,
  ConversationActivityRepository,
  ConversationActivitySenderTypeEnum,
  ConversationActivityTypeEnum,
  ConversationParticipantTypeEnum,
  ConversationRepository,
  ConversationStatusEnum,
  HumanInteractionRepository,
  IntegrationRepository,
} from '@novu/dal';
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
const conversationRepository = new ConversationRepository();
const conversationActivityRepository = new ConversationActivityRepository();
const humanInteractionRepository = new HumanInteractionRepository();

const TELEGRAM_CHAT_ID = '777101';
const STRANGER_CHAT_ID = '888202';

describe('Human inbox (list → show → send → resolve) #novu-v2', () => {
  let session: UserSession;
  let telegramApiStub: TelegramApiStub;
  let subscriberId: string;
  let integrationIdentifier: string;
  let integrationId: string;
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
    integrationId = integration._id;

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
    const activityBefore = (await listInbox()).data[0].lastActivityAt;

    const tellRes = await session.testAgent
      .post('/v1/human/interactions')
      .send({ kind: 'tell', card: { title: 'Build finished' }, to: subscriberId });
    expect(tellRes.status).to.equal(201, JSON.stringify(tellRes.body));
    expect(tellRes.body.data.threads).to.deep.equal([{ id: threadId, unreadBefore: 1 }]);

    expect((await listInbox({ filter: 'unread' })).data).to.have.length(0);
    expect((await listInbox()).data.map((thread) => thread.id)).to.deep.equal([threadId]);
    // The send counts as activity, so the thread moves to the top of the list.
    expect(new Date((await listInbox()).data[0].lastActivityAt).getTime()).to.be.greaterThan(
      new Date(activityBefore).getTime()
    );
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

  it('shows a question once when the thread is read one message per page', async () => {
    await sendMessageToRelay('need a decision');
    const threadId = await soleThreadId();
    const askRes = await session.testAgent
      .post('/v1/human/interactions')
      .send({ kind: 'ask', card: { title: 'Which environment?' }, thread: threadId });
    expect(askRes.status).to.equal(201, JSON.stringify(askRes.body));

    const texts: string[] = [];
    let before: string | undefined;

    for (let page = 0; page < 10; page += 1) {
      const res = await session.testAgent.get(`/v1/human/inbox/${threadId}`).query({ limit: 1, before });
      const messages = res.body.data.messages as Array<{ id: string; text: string }>;
      texts.push(...messages.map((message) => message.text));

      if (!res.body.data.hasMore || messages.length === 0) {
        break;
      }

      before = messages[0].id;
    }

    expect(texts.filter((text) => text.includes('Which environment?'))).to.have.length(1);
    expect(texts).to.include('need a decision');
  });

  it('refuses a question in a direct-message thread addressed to a contact who is not in it', async () => {
    await sendMessageToRelay('need a decision');
    const threadId = await soleThreadId();
    const other = `other-${Date.now()}`;
    const setupRes = await session.testAgent.post('/v1/human/setup').send({ subscriberId: other });
    expect(setupRes.status).to.equal(200, JSON.stringify(setupRes.body));

    const res = await session.testAgent
      .post('/v1/human/interactions')
      .send({ kind: 'ask', card: { title: 'Which environment?' }, thread: threadId, to: other });

    expect(res.status).to.equal(400, JSON.stringify(res.body));
    expect(res.body.message).to.contain('not in this thread');
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

  it('asks a stranger which question they answered when two are open to anyone', async () => {
    await sendMessageToRelay('can I get access?', STRANGER_CHAT_ID);
    const { data } = await listInbox({ senders: 'all' });

    for (const title of ['Which project?', 'Which region?']) {
      const res = await session.testAgent
        .post('/v1/human/interactions')
        .send({ kind: 'ask', card: { title }, thread: data[0].id, anyoneMayAnswer: true });
      expect(res.status).to.equal(201, JSON.stringify(res.body));
    }

    const thread = await sendMessageToRelay('the billing one', STRANGER_CHAT_ID);

    expect(thread.post.calledOnce).to.equal(true, 'expected the picker to be posted in the thread');
    const picker = JSON.stringify(thread.post.firstCall.args[0]);
    expect(picker).to.include('Which project?');
    expect(picker).to.include('Which region?');
  });

  describe('the inbox page: search, filters, counts, states and cards', () => {
    async function addContact(firstName: string, chatId: string): Promise<string> {
      const contactId = `inbox-e2e-${firstName.toLowerCase()}-${Date.now()}`;
      const setupRes = await session.testAgent.post('/v1/human/setup').send({ subscriberId: contactId, firstName });
      expect(setupRes.status).to.equal(200, JSON.stringify(setupRes.body));

      await channelEndpointRepository.create({
        identifier: `ce-inbox-e2e-${firstName.toLowerCase()}-${Date.now()}`,
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        integrationIdentifier,
        providerId: ChatProviderIdEnum.Telegram,
        channel: ChannelTypeEnum.CHAT,
        subscriberId: contactId,
        contextKeys: [],
        type: ENDPOINT_TYPES.TELEGRAM_CHAT,
        endpoint: { chatId },
      });

      return contactId;
    }

    /** A thread on Slack with the operator, stored directly: the suite only has a Telegram channel to write through. */
    async function seedSlackThread(title: string) {
      return conversationRepository.create({
        identifier: `conv_slack_${Math.random().toString(36).slice(2)}`,
        _agentId: relayAgentId,
        participants: [
          { type: ConversationParticipantTypeEnum.SUBSCRIBER, id: subscriberId },
          { type: ConversationParticipantTypeEnum.AGENT, id: relayAgentId },
        ],
        channels: [{ platform: 'slack', _integrationId: integrationId, platformThreadId: `slack:C1:${Date.now()}` }],
        status: ConversationStatusEnum.ACTIVE,
        title,
        metadata: {},
        isDirectMessage: true,
        lastActivityAt: new Date().toISOString(),
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
      });
    }

    async function threadOf(contactId: string): Promise<Record<string, any>> {
      const { data } = await listInbox({ tab: 'all', limit: 100 });
      const thread = data.find((candidate) =>
        candidate.people.some((person: { id: string }) => person.id === contactId)
      );
      expect(thread, `no thread with ${contactId}`).to.not.equal(undefined);

      return thread as Record<string, any>;
    }

    async function sendIntoThread(threadId: string, kind: string, card: Record<string, unknown>) {
      const res = await session.testAgent.post('/v1/human/interactions').send({ kind, card, thread: threadId });
      expect(res.status).to.equal(201, JSON.stringify(res.body));

      return res.body.data as { id: string; content: { cardChrome: { options?: Array<{ id: string }> } } };
    }

    async function clickAction(actionId: string, chatId = TELEGRAM_CHAT_ID) {
      const config = await testServer
        .getService(AgentConfigResolver)
        .resolve(relayAgentId, integrationIdentifier, { source: 'webhook_message' });

      await testServer
        .getService(AgentInboundHandler)
        .handleAction(relayAgentId, config, makeTelegramThread(chatId) as any, { id: actionId }, chatId);
    }

    async function showThread(threadId: string, query: Record<string, unknown> = {}) {
      const res = await session.testAgent.get(`/v1/human/inbox/${threadId}`).query({ limit: 100, ...query });
      expect(res.status).to.equal(200, JSON.stringify(res.body));

      return res.body.data as {
        thread: Record<string, any>;
        messages: Array<Record<string, any>>;
        details: Record<string, any>;
      };
    }

    async function getCounts(query: Record<string, unknown> = {}) {
      const res = await session.testAgent.get('/v1/human/inbox/counts').query(query);
      expect(res.status).to.equal(200, JSON.stringify(res.body));

      return res.body.data as {
        tabs: Record<string, number>;
        channels: Record<string, number>;
        capped: boolean;
      };
    }

    function cardOf(messages: Array<Record<string, any>>, interactionId: string): Record<string, any> {
      const rows = messages.filter((message) => message.card?.id === interactionId);
      expect(rows, `card ${interactionId} should be in the thread once`).to.have.length(1);

      return rows[0].card;
    }

    it('searches threads by message text, subject and person name', async () => {
      await sendMessageToRelay('The deploy failed on staging');
      const adaThreadId = await soleThreadId();
      const slackThread = await seedSlackThread('Invoice question');
      const mayaId = await addContact('Maya', '777102');
      await sendMessageToRelay('lunch?', '777102');
      const mayaThreadId = (await threadOf(mayaId)).id;

      const byMessage = await listInbox({ search: 'STAGING' });
      expect(byMessage.data.map((thread) => thread.id)).to.deep.equal([adaThreadId]);

      const bySubject = await listInbox({ search: 'invoice' });
      expect(bySubject.data.map((thread) => thread.id)).to.deep.equal([slackThread.identifier]);

      const byName = await listInbox({ search: 'maya' });
      expect(byName.data.map((thread) => thread.id)).to.deep.equal([mayaThreadId]);

      expect((await listInbox({ search: 'nothing-says-this' })).data).to.deep.equal([]);
      // A search is text, never a pattern.
      expect((await listInbox({ search: '.*' })).data).to.deep.equal([]);

      const counts = await getCounts({ search: 'staging' });
      expect(counts.tabs.all).to.equal(1);
      expect(counts.channels).to.include({ all: 1, telegram: 1, slack: 0 });
    });

    it('pages through what a search found, within the chosen channel', async () => {
      await sendMessageToRelay('Where is my invoice?');
      const telegramThreadId = await soleThreadId();
      const slackThreadIds = [
        (await seedSlackThread('Invoice one')).identifier,
        (await seedSlackThread('Invoice two')).identifier,
        (await seedSlackThread('Invoice three')).identifier,
      ];
      await seedSlackThread('Lunch plans');

      const firstPage = await listInbox({ search: 'invoice', limit: 2 });
      expect(firstPage.data).to.have.length(2);
      expect(firstPage.next).to.equal(firstPage.data[1].id);

      const secondPage = await listInbox({ search: 'invoice', limit: 2, after: firstPage.next });
      expect(secondPage.next).to.equal(null);
      expect([...firstPage.data, ...secondPage.data].map((thread) => thread.id)).to.have.members([
        telegramThreadId,
        ...slackThreadIds,
      ]);

      const onSlack = await listInbox({ search: 'invoice', channel: 'slack', limit: 2 });
      const restOnSlack = await listInbox({ search: 'invoice', channel: 'slack', limit: 2, after: onSlack.next });
      expect([...onSlack.data, ...restOnSlack.data].map((thread) => thread.id)).to.have.members(slackThreadIds);
      expect(restOnSlack.next).to.equal(null);

      expect((await listInbox({ search: 'invoice', tab: 'resolved' })).data).to.deep.equal([]);
      expect((await listInbox({ search: 'invoice', after: 'conv_not_a_thread' })).data).to.deep.equal([]);
    });

    it('goes by what a thread shows now: edits, deletes, card subtitles and posted cards', async () => {
      // The first message names the thread, so the one that gets edited comes second.
      await sendMessageToRelay('Morning');
      const threadId = await soleThreadId();
      await sendMessageToRelay('The deploy failed on staging');
      const conversation = await conversationRepository.findOne(
        { _environmentId: session.environment._id, identifier: threadId },
        '*'
      );
      const conversationId = conversation?._id as string;

      async function addRevision(type: ConversationActivityTypeEnum, text: string, content: string) {
        const [message] = await conversationActivityRepository.find(
          { _environmentId: session.environment._id, _conversationId: conversationId, content: text },
          '*'
        );
        expect(message?.platformMessageId, `no stored message "${text}"`).to.be.a('string');

        await conversationActivityRepository.createUserActivity({
          identifier: `act_${Math.random().toString(36).slice(2)}`,
          conversationId,
          platform: 'telegram',
          integrationId,
          platformThreadId: `telegram:${TELEGRAM_CHAT_ID}`,
          senderType: ConversationActivitySenderTypeEnum.SUBSCRIBER,
          senderId: subscriberId,
          content,
          platformMessageId: message.platformMessageId,
          type,
          environmentId: session.environment._id,
          organizationId: session.organization._id,
        });
      }

      // An edited message is found by its new text only.
      await addRevision(
        ConversationActivityTypeEnum.EDIT,
        'The deploy failed on staging',
        'The deploy failed on production'
      );
      expect((await listInbox({ search: 'production' })).data.map((thread) => thread.id)).to.deep.equal([threadId]);
      expect((await listInbox({ search: 'staging' })).data).to.deep.equal([]);

      // A card is found by its subtitle too.
      await sendIntoThread(threadId, 'tell', { title: 'Heads up', subtitle: 'Canary rollout' });
      expect((await listInbox({ search: 'canary' })).data.map((thread) => thread.id)).to.deep.equal([threadId]);
      expect((await listInbox({ search: 'canary' })).data.map((thread) => thread.id)).to.deep.equal([threadId]);

      // The agent spoke last. A message that came after and was deleted does not make the thread wait on the agent.
      await sendMessageToRelay('oops wrong chat');
      expect((await listInbox({ search: 'wrong chat' })).data).to.have.length(1);
      await addRevision(ConversationActivityTypeEnum.DELETE, 'oops wrong chat', '');
      expect((await listInbox({ search: 'wrong chat' })).data).to.deep.equal([]);
      expect((await listInbox({ tab: 'all' })).data[0].state).to.equal('open');
      expect((await getCounts()).tabs.waiting).to.equal(0);

      // A card posted as an element keeps its options in its buttons. The endpoint here only takes
      // card fields, so the stored card is swapped for the element form an agent runtime posts.
      const posted = await sendIntoThread(threadId, 'choose', { title: 'Which region?', options: ['One', 'Two'] });
      await humanInteractionRepository.update(
        { _environmentId: session.environment._id, identifier: posted.id },
        {
          $set: {
            content: {
              card: {
                type: 'card',
                title: 'Which region?',
                children: [
                  {
                    type: 'actions',
                    children: [
                      { type: 'button', id: 'eu', label: 'Europe' },
                      { type: 'button', id: 'us', label: 'United States' },
                    ],
                  },
                ],
              },
            },
          },
        }
      );
      const approval = await sendIntoThread(threadId, 'approve', { title: 'Ship it?' });
      await humanInteractionRepository.update(
        { _environmentId: session.environment._id, identifier: approval.id },
        {
          $set: {
            content: {
              card: {
                type: 'card',
                title: 'Ship it?',
                children: [
                  {
                    type: 'actions',
                    children: [
                      { type: 'button', id: 'approve', label: 'Ship' },
                      { type: 'button', id: 'deny', label: 'Hold' },
                      { type: 'button', id: 'escalate', label: 'Escalate' },
                    ],
                  },
                ],
              },
            },
          },
        }
      );
      const { messages, details } = await showThread(threadId);
      expect(cardOf(messages, approval.id).buttons).to.deep.equal([
        { id: 'deny', label: 'Hold' },
        { id: 'approve', label: 'Ship' },
        { id: 'escalate', label: 'Escalate' },
      ]);
      expect(cardOf(messages, posted.id).options).to.deep.equal([
        { id: 'eu', label: 'Europe' },
        { id: 'us', label: 'United States' },
      ]);

      // A response whose request row was never stored is shown, so it is counted.
      await conversationActivityRepository.createUserActivity({
        identifier: 'human:hi_without_request:response',
        conversationId,
        platform: 'telegram',
        integrationId,
        platformThreadId: `telegram:${TELEGRAM_CHAT_ID}`,
        senderType: ConversationActivitySenderTypeEnum.SUBSCRIBER,
        senderId: subscriberId,
        content: 'Approved',
        type: ConversationActivityTypeEnum.HUMAN_INTERACTION_RESPONSE,
        environmentId: session.environment._id,
        organizationId: session.organization._id,
      });
      const after = await showThread(threadId);
      expect(after.messages).to.have.length(messages.length + 1);
      expect(after.details.messageCount).to.equal(details.messageCount + 1);
      expect(after.details.messageCount).to.equal(after.messages.length);
    });

    it('filters by channel and counts the threads on each channel', async () => {
      await sendMessageToRelay('on telegram');
      const slackThread = await seedSlackThread('On slack');
      const telegramThreadId = (await listInbox({ channel: 'telegram' })).data[0].id;

      const onTelegram = await listInbox({ channel: 'telegram' });
      expect(onTelegram.data.map((thread) => thread.id)).to.deep.equal([telegramThreadId]);
      expect(onTelegram.data[0].channel).to.equal('telegram');

      const onSlack = await listInbox({ channel: 'slack' });
      expect(onSlack.data.map((thread) => thread.id)).to.deep.equal([slackThread.identifier]);
      expect(onSlack.data[0].channel).to.equal('slack');

      expect((await listInbox({ channel: 'email' })).data).to.deep.equal([]);

      const counts = await getCounts();
      expect(counts.channels).to.deep.equal({ all: 2, telegram: 1, slack: 1, email: 0 });
      expect(counts.capped).to.equal(false);

      // A channel is counted within the chosen tab, and a tab within the chosen channel.
      expect((await getCounts({ tab: 'unread' })).channels).to.deep.equal({ all: 1, telegram: 1, slack: 0, email: 0 });
      expect((await getCounts({ channel: 'slack' })).tabs).to.deep.equal({
        all: 1,
        unread: 0,
        waiting: 0,
        resolved: 0,
      });
    });

    it('gives every thread one state, and the tabs list and count by it', async () => {
      const mayaId = await addContact('Maya', '777102');
      const omerId = await addContact('Omer', '777103');
      const linId = await addContact('Lin', '777104');
      const noaId = await addContact('Noa', '777105');

      // Unread: Ada wrote and the agent has not attended to it.
      await sendMessageToRelay('Can you check the deploy?');

      // Waiting on a person: the agent asked Maya and she has not answered.
      await sendMessageToRelay('ready when you are', '777102');
      await sendIntoThread((await threadOf(mayaId)).id, 'ask', { title: 'Which environment?' });

      // Waiting on you: the agent read what Omer wrote and has not sent anything since.
      await sendMessageToRelay('rollback please', '777103');
      await session.testAgent.post(`/v1/human/inbox/${(await threadOf(omerId)).id}/read`);

      // Open: the agent had the last word and asked nothing.
      await sendMessageToRelay('status?', '777104');
      await sendIntoThread((await threadOf(linId)).id, 'tell', { title: 'All green' });

      // Resolved.
      await sendMessageToRelay('thanks, done', '777105');
      await session.testAgent.post(`/v1/human/inbox/${(await threadOf(noaId)).id}/resolve`);

      const states = Object.fromEntries(
        await Promise.all(
          [subscriberId, mayaId, omerId, linId, noaId].map(async (contactId) => {
            const thread = await threadOf(contactId);

            return [contactId, thread.state];
          })
        )
      );
      expect(states).to.deep.equal({
        [subscriberId]: 'unread',
        [mayaId]: 'waiting_on_person',
        [omerId]: 'waiting_on_you',
        [linId]: 'open',
        [noaId]: 'resolved',
      });

      const mayaThread = await threadOf(mayaId);
      expect(mayaThread.waitingOn).to.deep.equal([{ id: mayaId, name: 'Maya', kind: 'contact' }]);
      expect(mayaThread).to.include({ from: 'Maya', status: 'open', channel: 'telegram' });
      expect(mayaThread.subject).to.equal('ready when you are');
      expect(mayaThread.preview).to.equal('Which environment?');
      expect(mayaThread.openedAt).to.be.a('string');
      expect((await threadOf(noaId)).status).to.equal('resolved');

      expect((await getCounts()).tabs).to.deep.equal({ all: 5, unread: 1, waiting: 2, resolved: 1 });

      const idsIn = async (tab: string) =>
        (await listInbox({ tab, limit: 100 })).data.map((thread) => thread.id).sort();
      const idOf = async (contactId: string) => (await threadOf(contactId)).id as string;

      expect(await idsIn('all')).to.have.length(5);
      expect(await idsIn('unread')).to.deep.equal([await idOf(subscriberId)]);
      expect(await idsIn('waiting')).to.deep.equal([await idOf(mayaId), await idOf(omerId)].sort());
      expect(await idsIn('resolved')).to.deep.equal([await idOf(noaId)]);

      // Maya answers: nobody is waited on any more, and she did the last thing in the thread.
      await sendMessageToRelay('staging', '777102');
      const answered = await threadOf(mayaId);
      expect(answered.state).to.equal('waiting_on_you');
      expect(answered.waitingOn).to.equal(undefined);
    });

    it('rejects a tab together with the filters it stands for', async () => {
      const res = await session.testAgent.get('/v1/human/inbox').query({ tab: 'unread', filter: 'read' });

      expect(res.status).to.equal(400, JSON.stringify(res.body));
    });

    it('shows a tell, an ask, an approve and a choose in full, each once, with its state', async () => {
      await sendMessageToRelay('need a few decisions');
      const threadId = await soleThreadId();

      const tell = await sendIntoThread(threadId, 'tell', { title: 'Deploy started' });
      const richTell = await sendIntoThread(threadId, 'tell', { title: 'Deploy report', body: '3 services updated' });
      const ask = await sendIntoThread(threadId, 'ask', { title: 'Which environment?', body: 'Reply with a name.' });
      const approve = await sendIntoThread(threadId, 'approve', {
        title: 'Ship it?',
        body: 'Rolls out v2 to everyone.',
        approveLabel: 'Ship',
      });
      const choose = await sendIntoThread(threadId, 'choose', {
        title: 'Release strategy?',
        options: ['Canary', 'Blue-green'],
      });
      const pickedOption = (choose.content.cardChrome.options ?? [])[1];

      const pending = await showThread(threadId);

      expect(cardOf(pending.messages, tell.id)).to.deep.include({
        kind: 'tell',
        title: 'Deploy started',
        presentation: { channel: 'telegram', style: 'text', label: 'Telegram message' },
      });
      expect(cardOf(pending.messages, tell.id).state).to.deep.equal({ status: 'delivered', label: 'no reply needed' });
      expect(cardOf(pending.messages, richTell.id)).to.deep.include({
        body: '3 services updated',
        presentation: { channel: 'telegram', style: 'card', label: 'Telegram card' },
      });

      const pendingAsk = cardOf(pending.messages, ask.id);
      expect(pendingAsk).to.deep.include({
        kind: 'ask',
        title: 'Which environment?',
        body: 'Reply with a name.',
        presentation: { channel: 'telegram', style: 'reply', label: 'Telegram reply' },
      });
      expect(pendingAsk.state).to.deep.equal({
        status: 'pending',
        label: 'waiting for Ada',
        waitingOn: [{ id: subscriberId, name: 'Ada', kind: 'contact' }],
      });

      const pendingApprove = cardOf(pending.messages, approve.id);
      expect(pendingApprove).to.deep.include({
        kind: 'approve',
        title: 'Ship it?',
        body: 'Rolls out v2 to everyone.',
        presentation: { channel: 'telegram', style: 'buttons', label: 'Telegram buttons' },
      });
      expect(pendingApprove.buttons).to.deep.equal([
        { id: 'deny', label: 'Deny' },
        { id: 'approve', label: 'Ship' },
      ]);
      expect(pendingApprove.state.label).to.equal('waiting for Ada');

      const pendingChoose = cardOf(pending.messages, choose.id);
      expect(pendingChoose.options.map((option: { label: string }) => option.label)).to.deep.equal([
        'Canary',
        'Blue-green',
      ]);
      expect(pendingChoose.presentation.label).to.equal('Telegram buttons');
      expect(pendingChoose.state.status).to.equal('pending');

      await clickAction(`human:${approve.id}:approve`);
      await clickAction(`human:${choose.id}:opt:${pickedOption.id}`);
      await sendMessageToRelay('staging');

      const settled = await showThread(threadId);

      const approved = cardOf(settled.messages, approve.id).state;
      expect(approved.status).to.equal('approved');
      expect(approved.respondedBy.id).to.equal(subscriberId);
      expect(approved.label).to.equal(`Approved by ${approved.respondedBy.name} in Telegram`);
      expect(approved.respondedAt).to.be.a('string');

      const chosen = cardOf(settled.messages, choose.id).state;
      expect(chosen).to.include({ status: 'answered', optionId: pickedOption.id, optionLabel: 'Blue-green' });
      expect(chosen.label).to.equal(`${chosen.respondedBy.name} picked Blue-green`);

      const answeredAsk = cardOf(settled.messages, ask.id).state;
      expect(answeredAsk).to.include({ status: 'answered', text: 'staging' });
      expect(answeredAsk.label).to.equal(`Answered by ${answeredAsk.respondedBy.name} in Telegram`);

      // Every message says which way it went, who sent it and on which channel.
      const first = settled.messages[0];
      expect(first).to.include({ direction: 'in', channel: 'telegram', text: 'need a few decisions' });
      expect(first.sender).to.deep.equal({ id: subscriberId, name: 'Ada', kind: 'contact' });
      const cardRow = settled.messages.find((message) => message.card?.id === approve.id) as Record<string, any>;
      expect(cardRow).to.include({ direction: 'out', from: 'agent', channel: 'telegram' });
      expect(cardRow.sender.kind).to.equal('agent');
      expect(cardRow.sender.name).to.equal(settled.details.agent.name);
      // Five cards and the two things Ada wrote; nothing is listed twice.
      expect(settled.messages).to.have.length(7);

      expect(settled.details).to.deep.include({
        threadId,
        channel: 'telegram',
        contact: { id: subscriberId, name: 'Ada', kind: 'contact', verified: true },
        status: 'waiting_on_you',
        messageCount: 7,
      });
      expect(settled.details.openedAt).to.equal(settled.thread.openedAt);
      expect(settled.details.lastReadAt).to.equal(settled.thread.lastReadAt);
      expect(settled.details.lastReadAt).to.be.a('string');
      expect(settled.details.agent.identifier).to.be.a('string');
    });

    it('shows a canceled and an overdue card as such, and stops waiting on them', async () => {
      await sendMessageToRelay('two more');
      const threadId = await soleThreadId();
      const canceled = await sendIntoThread(threadId, 'approve', { title: 'Cancel me?' });
      const cancelRes = await session.testAgent.post(`/v1/human/interactions/${canceled.id}/cancel`);
      expect(cancelRes.status).to.equal(200, JSON.stringify(cancelRes.body));
      const overdue = await sendIntoThread(threadId, 'ask', { title: 'Too late?' });
      expect((await showThread(threadId)).thread.state).to.equal('waiting_on_person');

      // Expiry is lazy: the row still says pending after its time has passed.
      await humanInteractionRepository.update(
        { _environmentId: session.environment._id, identifier: overdue.id },
        { $set: { expiresAt: new Date(Date.now() - 60_000).toISOString() } }
      );

      const { messages, thread } = await showThread(threadId);

      expect(cardOf(messages, canceled.id).state).to.deep.equal({ status: 'canceled', label: 'canceled by the agent' });
      expect(cardOf(messages, overdue.id).state).to.deep.equal({
        status: 'expired',
        label: 'expired, nobody answered',
      });
      // Nothing is open any more, and the agent had the last word.
      expect(thread.state).to.equal('open');
    });

    it('marks a stranger as not verified in the details', async () => {
      await sendMessageToRelay('hi, who is this?', STRANGER_CHAT_ID);
      const { data } = await listInbox({ senders: 'all' });

      const { details } = await showThread(data[0].id);

      expect(details.contact).to.include({ kind: 'stranger', verified: false });
    });

    it('returns attachments with their name and size', async () => {
      await sendMessageToRelay('see the file');
      const thread = await threadOf(subscriberId);
      const conversation = await conversationRepository.findOne(
        { _environmentId: session.environment._id, identifier: thread.id },
        '*'
      );
      await conversationActivityRepository.createUserActivity({
        identifier: `act_${Math.random().toString(36).slice(2)}`,
        conversationId: conversation?._id as string,
        platform: 'telegram',
        integrationId,
        platformThreadId: `telegram:${TELEGRAM_CHAT_ID}`,
        senderType: ConversationActivitySenderTypeEnum.SUBSCRIBER,
        senderId: subscriberId,
        content: 'report attached',
        richContent: {
          attachments: [
            { type: 'file', name: 'report.pdf', mimeType: 'application/pdf', size: 48_213, storageKey: 'secret/key' },
          ],
        },
        environmentId: session.environment._id,
        organizationId: session.organization._id,
      });

      const { messages } = await showThread(thread.id);
      const withFile = messages.find((message) => message.text === 'report attached') as Record<string, any>;

      expect(withFile.attachments).to.deep.equal([
        { type: 'file', name: 'report.pdf', mimeType: 'application/pdf', size: 48_213 },
      ]);
    });

    it('adds the system lines of a thread only when asked', async () => {
      await sendMessageToRelay('all done');
      const threadId = await soleThreadId();
      await session.testAgent.post(`/v1/human/inbox/${threadId}/resolve`);

      const plain = await showThread(threadId);
      expect(plain.messages.filter((message) => message.from === 'system')).to.have.length(0);

      const withSystem = await showThread(threadId, { include: 'system' });
      const systemLines = withSystem.messages.filter((message) => message.from === 'system');
      expect(systemLines.length).to.be.greaterThan(0);
      expect(systemLines[0].direction).to.equal(undefined);
      expect(systemLines[0].text).to.be.a('string').and.not.equal('');
      // System lines are not messages.
      expect(withSystem.details.messageCount).to.equal(1);
    });

    it('never marks a thread read when the page lists, counts, searches or opens it', async () => {
      await sendMessageToRelay('first');
      await sendMessageToRelay('second');
      const threadId = await soleThreadId();

      await listInbox({ tab: 'all' });
      await listInbox({ tab: 'unread', channel: 'telegram', search: 'second' });
      await getCounts({ search: 'first' });
      const shown = await showThread(threadId, { include: 'system' });

      expect(shown.thread).to.include({ unreadCount: 2, state: 'unread', lastReadAt: null });
      expect(shown.details.lastReadAt).to.equal(null);

      const { data } = await listInbox({ filter: 'unread' });
      expect(data).to.have.length(1);
      expect(data[0]).to.include({ id: threadId, unreadCount: 2, lastReadAt: null });
      expect((await getCounts()).tabs).to.deep.equal({ all: 1, unread: 1, waiting: 0, resolved: 0 });
    });
  });

  it('404s on a thread that is not the relay agent’s', async () => {
    const res = await session.testAgent.get('/v1/human/inbox/conv_doesnotexist');

    expect(res.status).to.equal(404);
  });
});
