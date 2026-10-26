import { encryptCredentials } from '@novu/application-generic';
import {
  AgentIntegrationRepository,
  AgentRepository,
  ChannelEndpointRepository,
  ConversationActivity,
  ConversationActivityRepository,
  ConversationActivitySenderTypeEnum,
  ConversationActivityTypeEnum,
  ConversationRepository,
  HumanContactRepository,
  IntegrationRepository,
  SubscriberRepository,
} from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum, ENDPOINT_TYPES } from '@novu/shared';
import { testServer, UserSession } from '@novu/testing';
import { expect } from 'chai';
import { Types } from 'mongoose';
import sinon from 'sinon';
import { AgentConfigResolver } from '../../agents/channels/agent-config-resolver.service';
import { ChatInstanceRegistry } from '../../agents/conversation-runtime/ingress/chat-instance.registry';
import { AgentInboundHandler } from '../../agents/conversation-runtime/ingress/inbound-turn.handler';
import { startTelegramApiStub, type TelegramApiStub } from '../../agents/e2e/helpers/telegram-api-stub';
import { AgentEventEnum } from '../../agents/shared/enums/agent-event.enum';
import { AGENT_PAUSED } from '../guards/human-agent-paused.guard';
import { AGENT_INBOX_DASHBOARD_SECRET_HEADER, DASHBOARD_ONLY } from '../guards/human-dashboard-secret.guard';
import { AGENT_INBOX_HOST_HEADER, AGENT_INBOX_VIA_HEADER } from '../services/human-host-status.service';
import { LISTEN_NEEDS_ACCOUNT, LISTENING_ELSEWHERE, NOT_LISTENING } from '../services/human-listen-lease.service';
import { LISTEN_SETTLE_MS } from '../services/human-listen-messages.service';
import { encodeListenCursor, INVALID_LISTEN_CURSOR } from '../services/listen-cursor';
import {
  CONTACT_IS_OPERATOR,
  CONTACT_IS_STRANGER,
} from '../usecases/set-contact-listen-to/set-contact-listen-to.usecase';

const agentRepository = new AgentRepository();
const integrationRepository = new IntegrationRepository();
const agentIntegrationRepository = new AgentIntegrationRepository();
const channelEndpointRepository = new ChannelEndpointRepository();
const conversationRepository = new ConversationRepository();
const conversationActivityRepository = new ConversationActivityRepository();
const humanContactRepository = new HumanContactRepository();
const subscriberRepository = new SubscriberRepository();

const OPERATOR_CHAT_ID = '777501';
const BOB_CHAT_ID = '777502';
const CAROL_CHAT_ID = '777503';
const PHANTOM_CHAT_ID = '777504';
const STRANGER_CHAT_ID = '888505';
const DASHBOARD_SECRET = 'e2e-listen-dashboard-secret';

const MACBOOK = {
  computerId: 'macbook-e2e-0123456789',
  computerName: 'MacBook',
  host: 'claude-code',
  project: '~/projects/app',
};
const STUDIO = { computerId: 'studio-e2e-0123456789', computerName: 'Studio', host: 'codex' };

/** Long enough for everything stored before it to be read: the wait reads only what has settled. */
const SETTLE = LISTEN_SETTLE_MS + 600;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Listen: one computer keeps the agent listening by a lease it renews, and only that computer waits for the messages
 * that may start a host, which come only from the operator and the contacts the agent listens to. The CLI calls with
 * the account's key; the operator's dashboard with the same key and its own secret.
 */
describe('Agent Inbox listen (the lease, the messages wait, whom it listens to) #novu-v2', () => {
  const originalSecret = process.env.AGENT_INBOX_DASHBOARD_API_SECRET;
  let session: UserSession;
  let telegramApiStub: TelegramApiStub;
  let operatorId: string;
  let integrationIdentifier: string;
  let relayAgentId: string;

  before(async () => {
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
    telegramApiStub = await startTelegramApiStub();
  });

  beforeEach(async () => {
    process.env.AGENT_INBOX_DASHBOARD_API_SECRET = DASHBOARD_SECRET;
    session = new UserSession();
    await session.initialize();
    telegramApiStub.reset();

    operatorId = `listen-e2e-${Date.now()}`;
    const setupRes = await session.testAgent
      .post('/v1/human/setup')
      .send({ subscriberId: operatorId, operator: true, firstName: 'Ada' });
    expect(setupRes.status).to.equal(200, JSON.stringify(setupRes.body));
    relayAgentId = setupRes.body.data.agentId as string;

    const integration = await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      providerId: ChatProviderIdEnum.Telegram,
      channel: ChannelTypeEnum.CHAT,
      credentials: encryptCredentials({
        apiToken: '12345678:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        token: 'e2e-listen-telegram-secret',
      }),
      active: true,
      identifier: `telegram-listen-e2e-${Date.now()}`,
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
    await linkTelegram(operatorId, OPERATOR_CHAT_ID);
  });

  afterEach(async () => {
    if (originalSecret === undefined) {
      delete process.env.AGENT_INBOX_DASHBOARD_API_SECRET;
    } else {
      process.env.AGENT_INBOX_DASHBOARD_API_SECRET = originalSecret;
    }

    await testServer.getService(ChatInstanceRegistry).onModuleDestroy();
  });

  /** As the listener calls: the account's key, through the CLI, for the host it starts. */
  function asHost(method: 'get' | 'post' | 'patch', path: string, host = 'claude-code', user = session) {
    return user.testAgent[method](path)
      .set('Authorization', `ApiKey ${user.apiKey}`)
      .set(AGENT_INBOX_VIA_HEADER, 'cli')
      .set(AGENT_INBOX_HOST_HEADER, host);
  }

  /** As the operator's dashboard calls: the same key, and the dashboard's secret. */
  function asDashboard(method: 'get' | 'patch', path: string) {
    return session.testAgent[method](path)
      .set('Authorization', `ApiKey ${session.apiKey}`)
      .set(AGENT_INBOX_DASHBOARD_SECRET_HEADER, DASHBOARD_SECRET);
  }

  function takeLease(body: Record<string, unknown>, user = session) {
    return asHost('post', '/v1/human/listen/lease', 'claude-code', user).send(body);
  }

  async function holdLease(computer: Record<string, unknown> = MACBOOK, user = session) {
    const res = await takeLease(computer, user);
    expect(res.status).to.equal(200, JSON.stringify(res.body));

    return res.body.data.listening as Record<string, any>;
  }

  /** The listener's wait, for MacBook's Claude Code unless `query` names another holder. */
  function waitFor(query: Record<string, unknown>, host?: string, user = session) {
    const request = asHost('get', '/v1/human/listen/messages', host, user).query({
      computerId: MACBOOK.computerId,
      host: MACBOOK.host,
      ...query,
    });

    return host === undefined ? request.unset(AGENT_INBOX_HOST_HEADER) : request;
  }

  /** A cursor to read on from: the answer to a wait that held for nothing. */
  async function startCursor(user = session): Promise<string> {
    const res = await waitFor({}, 'claude-code', user);
    expect(res.status).to.equal(200, JSON.stringify(res.body));
    expect(res.body.data).to.deep.equal([]);

    return res.body.next as string;
  }

  /** Everything that settled since the cursor, at once. */
  async function readAfter(after: string, query: Record<string, unknown> = {}) {
    await sleep(SETTLE);
    const res = await waitFor({ after, ...query }, 'claude-code');
    expect(res.status).to.equal(200, JSON.stringify(res.body));

    return res.body as { data: Array<Record<string, any>>; next: string };
  }

  async function linkTelegram(subscriberId: string, chatId: string) {
    await channelEndpointRepository.create({
      identifier: `ce-listen-e2e-${subscriberId}-${Date.now()}`,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      integrationIdentifier,
      providerId: ChatProviderIdEnum.Telegram,
      channel: ChannelTypeEnum.CHAT,
      subscriberId,
      contextKeys: [],
      type: ENDPOINT_TYPES.TELEGRAM_CHAT,
      endpoint: { chatId },
    });
  }

  async function addContact(firstName: string, chatId: string): Promise<string> {
    const contactId = `listen-e2e-${firstName.toLowerCase()}-${Date.now()}`;
    const setupRes = await session.testAgent.post('/v1/human/setup').send({ subscriberId: contactId, firstName });
    expect(setupRes.status).to.equal(200, JSON.stringify(setupRes.body));
    await linkTelegram(contactId, chatId);

    return contactId;
  }

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

  /** Someone writes to the agent on Telegram, through the same path a real message takes. */
  async function write(
    text: string,
    chatId = OPERATOR_CHAT_ID,
    messageId = `msg-${Math.random().toString(36).slice(2)}`
  ) {
    const config = await testServer
      .getService(AgentConfigResolver)
      .resolve(relayAgentId, integrationIdentifier, { source: 'webhook_message' });

    await testServer.getService(AgentInboundHandler).handle(
      relayAgentId,
      config,
      makeTelegramThread(chatId) as any,
      {
        id: messageId,
        threadId: `telegram:${chatId}`,
        text,
        author: { userId: chatId, fullName: 'Someone on Telegram', userName: 'someone', isBot: false },
        raw: { message: { chat: { id: Number(chatId) } } },
        attachments: [],
      } as any,
      AgentEventEnum.ON_MESSAGE
    );
  }

  /** Someone presses a button of a card on Telegram. */
  async function press(actionId: string, chatId = OPERATOR_CHAT_ID) {
    const config = await testServer
      .getService(AgentConfigResolver)
      .resolve(relayAgentId, integrationIdentifier, { source: 'webhook_message' });

    await testServer
      .getService(AgentInboundHandler)
      .handleAction(relayAgentId, config, makeTelegramThread(chatId) as any, { id: actionId }, chatId);
  }

  async function threadWith(subscriberId: string): Promise<string> {
    const res = await session.testAgent.get('/v1/human/inbox').query({ senders: 'all', limit: 100 });
    expect(res.status).to.equal(200, JSON.stringify(res.body));
    const thread = (res.body.data as Array<Record<string, any>>).find((candidate) =>
      candidate.people.some((person: { id: string }) => person.id === subscriberId)
    );
    expect(thread, `no thread with ${subscriberId}`).to.not.equal(undefined);

    return thread?.id as string;
  }

  async function sendCard(threadId: string, kind: string, card: Record<string, unknown>) {
    const res = await session.testAgent.post('/v1/human/interactions').send({ kind, card, thread: threadId });
    expect(res.status).to.equal(201, JSON.stringify(res.body));

    return res.body.data as { id: string; content: { cardChrome: { options?: Array<{ id: string; label: string }> } } };
  }

  function setListenTo(contactId: string, listenTo: boolean) {
    return asDashboard('patch', `/v1/human/contacts/${contactId}`).send({ listenTo });
  }

  async function hostStatus(): Promise<Record<string, any>> {
    const res = await asDashboard('get', '/v1/human/agent/hosts');
    expect(res.status).to.equal(200, JSON.stringify(res.body));

    return res.body.data;
  }

  function expectRefused(res: { status: number; body: Record<string, any> }, status: number, code: string) {
    expect(res.status).to.equal(status, JSON.stringify(res.body));
    expect(res.body.code).to.equal(code, JSON.stringify(res.body));
  }

  async function lapseLease() {
    await agentRepository.update(
      { _id: relayAgentId, _environmentId: session.environment._id, _organizationId: session.organization._id },
      { $set: { 'listening.expiresAt': new Date(Date.now() - 1000).toISOString() } },
      { timestamps: false }
    );
  }

  describe('the lease', () => {
    it('keeps the agent listening on one computer, renewed by it, and says where on the dashboard', async () => {
      const res = await takeLease(MACBOOK);

      expect(res.status).to.equal(200, JSON.stringify(res.body));
      expect(res.body.data.renewInSeconds).to.equal(60);
      const { listening } = res.body.data;
      expect(listening).to.include({ ...MACBOOK, since: listening.renewedAt });
      expect(Date.parse(listening.expiresAt) - Date.parse(listening.renewedAt)).to.equal(180_000);

      const status = await asHost('get', '/v1/human/listen/lease');
      expect(status.status).to.equal(200, JSON.stringify(status.body));
      expect(status.body.data).to.deep.equal({ listening, paused: false });
      expect((await hostStatus()).listening).to.deep.equal(listening);

      // Renewing keeps when it was taken; what it starts may change.
      await sleep(20);
      const renewed = await holdLease({ ...MACBOOK, project: '~/projects/api' });
      expect(renewed).to.include({ since: listening.since, project: '~/projects/api' });
      expect(renewed.renewedAt > listening.renewedAt).to.equal(true);
    });

    it('refuses another computer with listening_elsewhere, and hands over when asked to take over', async () => {
      const macbook = await holdLease(MACBOOK);

      const refused = await takeLease(STUDIO);
      expectRefused(refused, 409, LISTENING_ELSEWHERE);
      expect(refused.body.listening).to.deep.equal(macbook);

      const takenRes = await takeLease({ ...STUDIO, takeOver: true });
      expect(takenRes.status).to.equal(200, JSON.stringify(takenRes.body));
      const studio = takenRes.body.data.listening;
      expect(studio).to.include({ computerId: STUDIO.computerId, host: 'codex' });
      expect(studio).to.not.have.property('project');
      expect(studio.since > macbook.since).to.equal(true);

      // The computer it was taken from learns at its next call, and stops.
      const renew = await takeLease(MACBOOK);
      expectRefused(renew, 409, LISTENING_ELSEWHERE);
      expect(renew.body.listening).to.deep.equal(studio);
      const wait = await waitFor({});
      expectRefused(wait, 409, NOT_LISTENING);
      expect(wait.body.listening).to.deep.equal(studio);
      expect((await hostStatus()).listening).to.deep.equal(studio);
    });

    it('counts the same computer waking another host as another holder', async () => {
      const claudeCode = await holdLease(MACBOOK);

      const codexHere = { ...MACBOOK, host: 'codex' };
      const refused = await takeLease(codexHere);
      expectRefused(refused, 409, LISTENING_ELSEWHERE);
      expect(refused.body.listening).to.deep.equal(claudeCode);
      expectRefused(await waitFor({ host: 'codex' }), 409, NOT_LISTENING);

      const taken = await takeLease({ ...codexHere, takeOver: true });
      expect(taken.status).to.equal(200, JSON.stringify(taken.body));
      expect(taken.body.data.listening).to.include({ computerId: MACBOOK.computerId, host: 'codex' });
      expectRefused(await waitFor({}), 409, NOT_LISTENING);
    });

    it('counts a lapsed lease as none: nothing shows, the old holder may not wait, and any computer takes it', async () => {
      await holdLease(MACBOOK);
      await lapseLease();

      expect((await asHost('get', '/v1/human/listen/lease')).body.data).to.deep.equal({
        listening: null,
        paused: false,
      });
      expect((await hostStatus()).listening).to.equal(null);
      const wait = await waitFor({});
      expectRefused(wait, 409, NOT_LISTENING);
      expect(wait.body.listening).to.equal(null);

      expect((await holdLease(STUDIO)).computerId).to.equal(STUDIO.computerId);
    });

    it('lets go only of its own lease', async () => {
      const macbook = await holdLease(MACBOOK);

      const other = await asHost('post', '/v1/human/listen/lease/release').send({
        computerId: STUDIO.computerId,
        host: STUDIO.host,
      });
      expect(other.status).to.equal(200, JSON.stringify(other.body));
      expect(other.body.data).to.deep.equal({ released: false });
      expect((await asHost('get', '/v1/human/listen/lease')).body.data.listening).to.deep.equal(macbook);

      // The same computer lets go only of the lease it holds for that host.
      const otherHost = await asHost('post', '/v1/human/listen/lease/release').send({
        computerId: MACBOOK.computerId,
        host: 'codex',
      });
      expect(otherHost.body.data).to.deep.equal({ released: false });
      expect(
        (await asHost('post', '/v1/human/listen/lease/release').send({ computerId: MACBOOK.computerId })).status
      ).to.equal(422);

      const own = await asHost('post', '/v1/human/listen/lease/release').send({
        computerId: MACBOOK.computerId,
        host: MACBOOK.host,
      });
      expect(own.body.data).to.deep.equal({ released: true });
      expect((await asHost('get', '/v1/human/listen/lease')).body.data).to.deep.equal({
        listening: null,
        paused: false,
      });

      const again = await asHost('post', '/v1/human/listen/lease/release').send({
        computerId: MACBOOK.computerId,
        host: MACBOOK.host,
      });
      expect(again.body.data).to.deep.equal({ released: false });
    });

    it('only starts hosts that run on a computer, and checks what the computer sends', async () => {
      for (const body of [
        { ...MACBOOK, host: 'chatgpt' },
        { ...MACBOOK, host: 'general' },
        { ...MACBOOK, host: 'windsurf' },
        { ...MACBOOK, computerId: 'short' },
        { ...MACBOOK, computerId: 'has spaces in it 0123' },
        { ...MACBOOK, computerName: '   ' },
        { ...MACBOOK, computerName: 'x'.repeat(65) },
        { ...MACBOOK, project: 'p'.repeat(201) },
        { ...MACBOOK, takeOver: 'yes' },
      ]) {
        const res = await takeLease(body);
        expect(res.status, JSON.stringify(body)).to.equal(422);
      }

      expect((await asHost('get', '/v1/human/listen/lease')).body.data).to.deep.equal({
        listening: null,
        paused: false,
      });
    });

    it('needs an account: a keyless setup can’t keep the agent listening', async () => {
      const original = process.env.KEYLESS_ORGANIZATION_ID;
      process.env.KEYLESS_ORGANIZATION_ID = session.organization._id;

      try {
        expectRefused(await takeLease(MACBOOK), 403, LISTEN_NEEDS_ACCOUNT);
      } finally {
        if (original === undefined) {
          delete process.env.KEYLESS_ORGANIZATION_ID;
        } else {
          process.env.KEYLESS_ORGANIZATION_ID = original;
        }
      }

      expect((await asHost('get', '/v1/human/listen/lease')).body.data).to.deep.equal({
        listening: null,
        paused: false,
      });
    });

    it('keeps another account’s agent apart', async () => {
      await holdLease(MACBOOK);
      const other = new UserSession();
      await other.initialize();
      const setupRes = await other.testAgent
        .post('/v1/human/setup')
        .send({ subscriberId: `listen-e2e-other-${Date.now()}`, operator: true, firstName: 'Grace' });
      expect(setupRes.status).to.equal(200, JSON.stringify(setupRes.body));

      // Its agent is asleep, the same computer id is free there, and it never sees this account's lease.
      expect((await asHost('get', '/v1/human/listen/lease', 'claude-code', other)).body.data).to.deep.equal({
        listening: null,
        paused: false,
      });
      expect((await holdLease(MACBOOK, other)).computerId).to.equal(MACBOOK.computerId);
      expect((await hostStatus()).listening.computerId).to.equal(MACBOOK.computerId);

      // What this account's operator writes never reaches the other account's wait.
      const otherCursor = await startCursor(other);
      await write('only for my agent');
      await sleep(SETTLE);
      const otherWait = await waitFor({ after: otherCursor }, 'claude-code', other);
      expect(otherWait.status).to.equal(200, JSON.stringify(otherWait.body));
      expect(otherWait.body.data).to.deep.equal([]);
    });

    it('keeps the lease and the wait from a paused agent’s hosts, and still lets them look and let go', async () => {
      const macbook = await holdLease(MACBOOK);
      const cursor = await startCursor();

      // `then` sends the request now: the wait is under way while the agent is paused.
      const pausing = waitFor({ after: cursor, wait: 10 }).then((res) => res);
      await sleep(500);
      const pause = await asDashboard('patch', '/v1/human/agent').send({ paused: true });
      expect(pause.status).to.equal(200, JSON.stringify(pause.body));
      const started = Date.now();
      expectRefused(await pausing, 403, AGENT_PAUSED);
      expect(Date.now() - started).to.be.lessThan(5000);

      expectRefused(await takeLease(MACBOOK), 403, AGENT_PAUSED);
      expectRefused(await waitFor({ after: cursor }), 403, AGENT_PAUSED);

      // `listen status` and `listen stop` still work: where it is listening, that it is paused, and letting go.
      const status = await asHost('get', '/v1/human/listen/lease');
      expect(status.status).to.equal(200, JSON.stringify(status.body));
      expect(status.body.data).to.deep.equal({ listening: macbook, paused: true });
      const release = await asHost('post', '/v1/human/listen/lease/release').send({
        computerId: MACBOOK.computerId,
        host: MACBOOK.host,
      });
      expect(release.status).to.equal(200, JSON.stringify(release.body));
      expect(release.body.data).to.deep.equal({ released: true });
      expect((await asHost('get', '/v1/human/listen/lease')).body.data).to.deep.equal({
        listening: null,
        paused: true,
      });

      const resume = await asDashboard('patch', '/v1/human/agent').send({ paused: false });
      expect(resume.status).to.equal(200, JSON.stringify(resume.body));
      expect((await asHost('get', '/v1/human/listen/lease')).body.data).to.deep.equal({
        listening: null,
        paused: false,
      });
      expect((await takeLease(MACBOOK)).status).to.equal(200);
    });
  });

  describe('waiting for messages', () => {
    it('gives only what the operator and the contacts it listens to wrote, oldest first', async () => {
      const bobId = await addContact('Bob', BOB_CHAT_ID);
      const carolId = await addContact('Carol', CAROL_CHAT_ID);
      expect((await setListenTo(bobId, true)).status).to.equal(200);
      await holdLease(MACBOOK);
      const cursor = await startCursor();

      await write('deploy the fix please');
      await write('hello, who is this?', STRANGER_CHAT_ID);
      await write('carol here', CAROL_CHAT_ID);
      await write('bob here', BOB_CHAT_ID);
      // The agent's own message, and a system line, never count.
      const tell = await session.testAgent
        .post('/v1/human/interactions')
        .send({ kind: 'tell', card: { title: 'On it.' }, thread: await threadWith(operatorId) });
      expect(tell.status).to.equal(201, JSON.stringify(tell.body));
      const operatorThread = await conversationRepository.findByAgentAndIdentifier(
        session.environment._id,
        session.organization._id,
        relayAgentId,
        await threadWith(operatorId)
      );
      await conversationActivityRepository.createUserActivity({
        identifier: `act_system_${Date.now()}`,
        conversationId: operatorThread?._id as string,
        platform: 'telegram',
        integrationId: operatorThread?.channels[0]._integrationId as string,
        platformThreadId: operatorThread?.channels[0].platformThreadId as string,
        senderType: ConversationActivitySenderTypeEnum.SYSTEM,
        senderId: 'system',
        content: 'The agent was resumed.',
        environmentId: session.environment._id,
        organizationId: session.organization._id,
      });

      const page = await readAfter(cursor);

      expect(page.data.map((message) => message.text)).to.deep.equal(['deploy the fix please', 'bob here']);
      const [fromAda, fromBob] = page.data;
      expect(fromAda).to.deep.include({
        conversationId: await threadWith(operatorId),
        channel: 'telegram',
        from: { id: operatorId, name: 'Ada', isOperator: true },
      });
      expect(fromAda.id).to.match(/^act_/);
      expect(fromAda).to.include({ round: 0, isDirectMessage: true });
      expect(fromAda).to.not.have.property('answersMessageId');
      expect(fromAda).to.not.have.property('answer');
      expect(fromBob).to.deep.include({
        conversationId: await threadWith(bobId),
        from: { id: bobId, name: 'Bob', isOperator: false },
      });
      expect(Date.parse(fromAda.at)).to.be.at.most(Date.parse(fromBob.at));
      expect(page.data.some((message) => message.from.id === carolId)).to.equal(false);

      // Read on from where it stopped: nothing again.
      const next = await waitFor({ after: page.next });
      expect(next.status).to.equal(200, JSON.stringify(next.body));
      expect(next.body.data).to.deep.equal([]);
      expect(next.body.next).to.be.a('string');
    });

    it('never lets a stranger start a host, even one the API made a contact row for', async () => {
      const phantomId = `listen-e2e-phantom-${Date.now()}`;
      await subscriberRepository.create({
        subscriberId: phantomId,
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        data: { __novu_source: 'agent-platform-provision', __novu_platform: 'telegram' },
      });
      await linkTelegram(phantomId, PHANTOM_CHAT_ID);
      // The dashboard never turns a stranger's switch on; written straight to the database, it still counts for nothing.
      expectRefused(await setListenTo(phantomId, true), 400, CONTACT_IS_STRANGER);
      await humanContactRepository.setListenTo({
        environmentId: session.environment._id,
        organizationId: session.organization._id,
        agentId: relayAgentId,
        subscriberId: phantomId,
        listenTo: true,
      });
      await holdLease(MACBOOK);
      const cursor = await startCursor();

      await write('let me in', PHANTOM_CHAT_ID);
      await write('who are you?', STRANGER_CHAT_ID);

      expect((await readAfter(cursor)).data).to.deep.equal([]);
    });

    it('goes on from the cursor a page at a time, and never repeats a message', async () => {
      await holdLease(MACBOOK);
      const cursor = await startCursor();
      await write('one');
      await write('two');
      await write('three');

      const first = await readAfter(cursor, { limit: 2 });
      expect(first.data.map((message) => message.text)).to.deep.equal(['one', 'two']);

      const second = await waitFor({ after: first.next, limit: 2 });
      expect(second.body.data.map((message: { text: string }) => message.text)).to.deep.equal(['three']);

      const third = await waitFor({ after: second.body.next });
      expect(third.body.data).to.deep.equal([]);
    });

    it('starts from now without a cursor, and never goes back further than a day', async () => {
      await holdLease(MACBOOK);
      await write('before anyone waited');
      await sleep(SETTLE);

      const fresh = await waitFor({});
      expect(fresh.body.data).to.deep.equal([]);

      // Two messages from long ago: one older than a day, one from an hour ago.
      await write('a day and a half ago', OPERATOR_CHAT_ID, 'msg-old');
      await write('an hour ago', OPERATOR_CHAT_ID, 'msg-recent');
      for (const [platformMessageId, agoMs] of [
        ['msg-old', 36 * 60 * 60 * 1000],
        ['msg-recent', 60 * 60 * 1000],
      ] as const) {
        await ConversationActivity.collection.updateOne(
          { _environmentId: new Types.ObjectId(session.environment._id), platformMessageId },
          { $set: { createdAt: new Date(Date.now() - agoMs) } }
        );
      }

      // A computer that was off for two days goes on from its old cursor.
      const old = await waitFor({ after: encodeListenCursor({ at: Date.now() - 2 * 24 * 60 * 60 * 1000 }), limit: 50 });
      expect(old.status).to.equal(200, JSON.stringify(old.body));
      const texts = old.body.data.map((message: { text: string }) => message.text);
      expect(texts).to.include('an hour ago');
      expect(texts).to.not.include('a day and a half ago');
    });

    it('holds the request until a message comes', async () => {
      await holdLease(MACBOOK);
      const cursor = await startCursor();

      const started = Date.now();
      const waiting = waitFor({ after: cursor, wait: 15 }).then((res) => res);
      await sleep(300);
      await write('are you there?');
      const res = await waiting;

      expect(res.status).to.equal(200, JSON.stringify(res.body));
      expect(res.body.data.map((message: { text: string }) => message.text)).to.deep.equal(['are you there?']);
      expect(Date.now() - started).to.be.lessThan(10_000);
    });

    it('returns empty-handed with a cursor when the wait runs out', async () => {
      await holdLease(MACBOOK);
      const cursor = await startCursor();

      const started = Date.now();
      const res = await waitFor({ after: cursor, wait: 2 });

      expect(res.status).to.equal(200, JSON.stringify(res.body));
      expect(res.body.data).to.deep.equal([]);
      expect(res.body.next).to.be.a('string');
      expect(Date.now() - started).to.be.within(1000, 4000);
    });

    it('marks a reply that answers a question, and gives a pressed button as the answer to its card', async () => {
      await write('I need a few decisions');
      const threadId = await threadWith(operatorId);
      await holdLease(MACBOOK);
      const cursor = await startCursor();

      const ask = await sendCard(threadId, 'ask', { title: 'Which environment?' });
      const approve = await sendCard(threadId, 'approve', { title: 'Ship it?' });
      const choose = await sendCard(threadId, 'choose', {
        title: 'Release strategy?',
        options: ['Canary', 'Blue-green'],
      });
      await write('staging');
      await press(`human:${approve.id}:approve`);
      await press(`human:${choose.id}:opt:${choose.content.cardChrome.options?.[1].id}`);
      await write('thanks');

      const page = await readAfter(cursor);

      const pickedId = choose.content.cardChrome.options?.[1].id;
      expect(page.data.map(({ text, answersMessageId, answer }) => ({ text, answersMessageId, answer }))).to.deep.equal(
        [
          { text: 'staging', answersMessageId: ask.id, answer: { status: 'answered', text: 'staging' } },
          { text: 'Approved', answersMessageId: approve.id, answer: { status: 'approved', optionId: 'approve' } },
          { text: 'Blue-green', answersMessageId: choose.id, answer: { status: 'answered', optionId: pickedId } },
          { text: 'thanks', answersMessageId: undefined, answer: undefined },
        ]
      );
      for (const message of page.data) {
        expect(message.from).to.deep.equal({ id: operatorId, name: 'Ada', isOperator: true });
        expect(message.conversationId).to.equal(threadId);
      }
      // Each is its own message, never the same one twice.
      expect(new Set(page.data.map((message) => message.id)).size).to.equal(4);
    });

    it('leaves out a message deleted before it was read', async () => {
      await holdLease(MACBOOK);
      const cursor = await startCursor();
      await write('oops, wrong chat', OPERATOR_CHAT_ID, 'msg-deleted');
      await write('this one counts');
      const conversation = await conversationRepository.findByAgentAndIdentifier(
        session.environment._id,
        session.organization._id,
        relayAgentId,
        await threadWith(operatorId)
      );
      await conversationActivityRepository.createUserActivity({
        identifier: `inbound-delete:${conversation?._id}:msg-deleted`,
        conversationId: conversation?._id as string,
        platform: 'telegram',
        integrationId: conversation?.channels[0]._integrationId as string,
        platformThreadId: conversation?.channels[0].platformThreadId as string,
        senderType: ConversationActivitySenderTypeEnum.SUBSCRIBER,
        senderId: operatorId,
        content: '',
        platformMessageId: 'msg-deleted',
        type: ConversationActivityTypeEnum.DELETE,
        environmentId: session.environment._id,
        organizationId: session.organization._id,
      });

      expect((await readAfter(cursor)).data.map((message) => message.text)).to.deep.equal(['this one counts']);
    });

    it('says how many times the conversation was resolved before each message', async () => {
      await holdLease(MACBOOK);
      const cursor = await startCursor();
      await write('first matter');
      const threadId = await threadWith(operatorId);

      const resolved = await session.testAgent.post(`/v1/human/inbox/${threadId}/resolve`);
      expect(resolved.status).to.equal(200, JSON.stringify(resolved.body));
      await write('a new matter');
      expect((await session.testAgent.post(`/v1/human/inbox/${threadId}/resolve`)).status).to.equal(200);
      await write('and another');

      const page = await readAfter(cursor);

      expect(page.data.map(({ text, round, conversationId }) => ({ text, round, conversationId }))).to.deep.equal([
        { text: 'first matter', round: 0, conversationId: threadId },
        { text: 'a new matter', round: 1, conversationId: threadId },
        { text: 'and another', round: 2, conversationId: threadId },
      ]);
    });

    it('goes by the contact’s switch as it is when it reads', async () => {
      const bobId = await addContact('Bob', BOB_CHAT_ID);
      await holdLease(MACBOOK);
      const cursor = await startCursor();

      await write('before the switch', BOB_CHAT_ID);
      const before = await readAfter(cursor);
      expect(before.data).to.deep.equal([]);

      expect((await setListenTo(bobId, true)).body.data).to.deep.equal({ id: bobId, listenTo: true });
      await write('after the switch', BOB_CHAT_ID);
      const on = await readAfter(before.next);
      expect(on.data.map((message) => message.text)).to.deep.equal(['after the switch']);

      expect((await setListenTo(bobId, false)).body.data).to.deep.equal({ id: bobId, listenTo: false });
      await write('switched off again', BOB_CHAT_ID);
      expect((await readAfter(on.next)).data).to.deep.equal([]);
    });

    it('counts each wait as a last check of the host it is for', async () => {
      await holdLease(STUDIO);

      const named = await waitFor({ computerId: STUDIO.computerId, host: STUDIO.host }, 'opencode');
      expect(named.status).to.equal(200, JSON.stringify(named.body));
      // A wait that doesn't say which host it is for is the lease's host.
      const unnamed = await waitFor({ computerId: STUDIO.computerId, host: STUDIO.host });
      expect(unnamed.status).to.equal(200, JSON.stringify(unnamed.body));

      const hosts = (await hostStatus()).hosts as Array<{ id: string; via: string; lastCheckedAt: string | null }>;
      expect(hosts.map((host) => host.id).sort()).to.deep.equal(['codex', 'opencode']);
      for (const host of hosts) {
        expect(host.via).to.equal('cli');
        expect(host.lastCheckedAt).to.be.a('string');
      }
    });

    it('leaves the first look at the inbox to a real one, which keeps the message that was waiting', async () => {
      await holdLease(MACBOOK);
      await write('are you there?');

      const wait = await waitFor({}, 'claude-code');
      expect(wait.status).to.equal(200, JSON.stringify(wait.body));
      const afterWait = await hostStatus();
      expect(afterWait.firstCheckedAt).to.equal(null);
      expect(afterWait.waitingMessage).to.equal(null);

      // The host then lists its inbox: that is its first look, and the message it found waiting is kept.
      const list = await asHost('get', '/v1/human/inbox');
      expect(list.status).to.equal(200, JSON.stringify(list.body));
      const afterList = await hostStatus();
      expect(afterList.firstCheckedAt).to.be.a('string');
      expect(afterList.waitingMessage).to.deep.include({ conversationId: await threadWith(operatorId) });
    });

    it('refuses a cursor it did not hand out, and a computer that does not hold the lease', async () => {
      await holdLease(MACBOOK);

      expectRefused(await waitFor({ after: 'not-a-cursor' }), 400, INVALID_LISTEN_CURSOR);
      expectRefused(await waitFor({ computerId: STUDIO.computerId, host: STUDIO.host }), 409, NOT_LISTENING);
      // The same computer waiting for another host doesn't hold it either, and a wait must say which host.
      expectRefused(await waitFor({ host: 'codex' }), 409, NOT_LISTENING);
      expect((await waitFor({ host: undefined })).status).to.equal(422);
      expect((await waitFor({ host: 'chatgpt' })).status).to.equal(422);
      expect((await waitFor({ wait: 26 })).status).to.equal(422);
      expect((await waitFor({ limit: 51 })).status).to.equal(422);
    });
  });

  describe('a permission question', () => {
    it('can be withdrawn by the listener that sent it, with the account’s key', async () => {
      const sent = await asHost('post', '/v1/human/interactions').send({
        kind: 'approve',
        card: { title: 'Run `rm -rf build`?' },
        to: operatorId,
      });
      expect(sent.status).to.equal(201, JSON.stringify(sent.body));

      const withdrawn = await asHost('post', `/v1/human/interactions/${sent.body.data.id}/cancel`);

      expect(withdrawn.status).to.equal(200, JSON.stringify(withdrawn.body));
      expect(withdrawn.body.data.status).to.equal('canceled');
    });
  });

  describe('typing while a host works', () => {
    function showTyping(body: Record<string, unknown>) {
      return asHost('post', '/v1/human/listen/typing').send({
        computerId: MACBOOK.computerId,
        host: MACBOOK.host,
        ...body,
      });
    }

    it('shows typing in the chat of its agent’s conversation, for the computer holding the lease', async () => {
      await holdLease(MACBOOK);
      await write('what files are in this folder?');
      const thread = await threadWith(operatorId);
      telegramApiStub.reset();

      const res = await showTyping({ conversationId: thread });

      expect(res.status).to.equal(200, JSON.stringify(res.body));
      expect(res.body.data).to.deep.equal({ typing: true });
      const typing = telegramApiStub.calls.filter((call) => call.method === 'sendChatAction');
      expect(typing.map((call) => [String(call.payload.chat_id), call.payload.action])).to.deep.equal([
        [OPERATOR_CHAT_ID, 'typing'],
      ]);
    });

    it('refuses a computer without the lease, a conversation that isn’t its agent’s, and a paused agent', async () => {
      await holdLease(MACBOOK);
      await write('hello');
      const thread = await threadWith(operatorId);

      expectRefused(
        await showTyping({ computerId: STUDIO.computerId, host: STUDIO.host, conversationId: thread }),
        409,
        NOT_LISTENING
      );
      expect((await showTyping({ conversationId: 'conv_not_there' })).status).to.equal(404);
      expect((await showTyping({ conversationId: '' })).status).to.equal(422);

      const pause = await asDashboard('patch', '/v1/human/agent').send({ paused: true });
      expect(pause.status).to.equal(200, JSON.stringify(pause.body));
      expectRefused(await showTyping({ conversationId: thread }), 403, AGENT_PAUSED);
    });
  });

  describe('whom it listens to: the contact switch', () => {
    async function listContacts(): Promise<Map<string, Record<string, any>>> {
      const res = await asDashboard('get', '/v1/human/contacts');
      expect(res.status).to.equal(200, JSON.stringify(res.body));

      return new Map((res.body.data as Array<Record<string, any>>).map((contact) => [contact.id as string, contact]));
    }

    it('is off for a contact until the operator turns it on, and always on for the operator', async () => {
      const bobId = await addContact('Bob', BOB_CHAT_ID);
      const carolId = await addContact('Carol', CAROL_CHAT_ID);

      const before = await listContacts();
      expect(before.get(operatorId)).to.include({ isOperator: true, listenTo: true });
      expect(before.get(bobId)).to.include({ listenTo: false });
      expect(before.get(carolId)).to.include({ listenTo: false });

      const res = await setListenTo(bobId, true);
      expect(res.status).to.equal(200, JSON.stringify(res.body));
      expect(res.body.data).to.deep.equal({ id: bobId, listenTo: true });

      const after = await listContacts();
      expect(after.get(bobId)).to.include({ listenTo: true });
      expect(after.get(carolId)).to.include({ listenTo: false });

      // The CLI's single-contact read says so too.
      const bob = await asHost('get', `/v1/human/contacts/${bobId}`);
      expect(bob.status).to.equal(200, JSON.stringify(bob.body));
      expect(bob.body.data.listenTo).to.equal(true);
      expect((await asHost('get', `/v1/human/contacts/${operatorId}`)).body.data.listenTo).to.equal(true);
      expect((await asHost('get', `/v1/human/contacts/${carolId}`)).body.data.listenTo).to.equal(false);
    });

    it('can only be set by the operator, on the dashboard', async () => {
      const bobId = await addContact('Bob', BOB_CHAT_ID);

      const byHost = await asHost('patch', `/v1/human/contacts/${bobId}`).send({ listenTo: true });
      expectRefused(byHost, 403, DASHBOARD_ONLY);
      expect(byHost.body.message).to.contain('whom the agent listens to');
      const wrongSecret = await session.testAgent
        .patch(`/v1/human/contacts/${bobId}`)
        .set('Authorization', `ApiKey ${session.apiKey}`)
        .set(AGENT_INBOX_DASHBOARD_SECRET_HEADER, 'guess')
        .send({ listenTo: true });
      expectRefused(wrongSecret, 403, DASHBOARD_ONLY);

      expect((await listContacts()).get(bobId)).to.include({ listenTo: false });
    });

    it('has no switch for the operator, nor for someone who isn’t a contact', async () => {
      expectRefused(await setListenTo(operatorId, false), 400, CONTACT_IS_OPERATOR);
      expect((await setListenTo('nobody-here', true)).status).to.equal(404);
      expect(
        (await asDashboard('patch', `/v1/human/contacts/${operatorId}`).send({ listenTo: 'yes' })).status
      ).to.equal(422);
    });

    it('goes with the contact when they are removed', async () => {
      const bobId = await addContact('Bob', BOB_CHAT_ID);
      expect((await setListenTo(bobId, true)).status).to.equal(200);

      const remove = await session.testAgent
        .delete(`/v1/human/contacts/${bobId}`)
        .set('Authorization', `ApiKey ${session.apiKey}`);
      expect(remove.status).to.equal(200, JSON.stringify(remove.body));

      // Added again under the same id, they start with the switch off.
      const setupRes = await session.testAgent.post('/v1/human/setup').send({ subscriberId: bobId, firstName: 'Bob' });
      expect(setupRes.status).to.equal(200, JSON.stringify(setupRes.body));
      expect((await listContacts()).get(bobId)).to.include({ listenTo: false });
    });
  });
});
