import { encryptCredentials, generateAgentInboxRoutingKey } from '@novu/application-generic';
import {
  AgentIntegrationRepository,
  AgentRepository,
  ChannelEndpointRepository,
  ConversationRepository,
  IntegrationRepository,
} from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum, EmailProviderIdEnum, ENDPOINT_TYPES } from '@novu/shared';
import { testServer, UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { AgentConfigResolver } from '../../agents/channels/agent-config-resolver.service';
import { ChatInstanceRegistry } from '../../agents/conversation-runtime/ingress/chat-instance.registry';
import { AgentInboundHandler } from '../../agents/conversation-runtime/ingress/inbound-turn.handler';
import { startTelegramApiStub, type TelegramApiStub } from '../../agents/e2e/helpers/telegram-api-stub';
import { AgentEventEnum } from '../../agents/shared/enums/agent-event.enum';
import { AGENT_PAUSED } from '../guards/human-agent-paused.guard';
import { DASHBOARD_ONLY, HUMAN_DASHBOARD_SECRET_HEADER } from '../guards/human-dashboard-secret.guard';
import { AGENT_INBOX_VIA_HEADER } from '../services/human-host-status.service';
import { CONNECT_AGENT_GONE } from '../usecases/connect-host/connect-host.usecase';

const agentRepository = new AgentRepository();
const integrationRepository = new IntegrationRepository();
const agentIntegrationRepository = new AgentIntegrationRepository();
const channelEndpointRepository = new ChannelEndpointRepository();
const conversationRepository = new ConversationRepository();

const CONTACT_CHAT_ID = '777301';
const STRANGER_CHAT_ID = '888402';
const DASHBOARD_SECRET = 'e2e-agent-settings-dashboard-secret';

/**
 * The Settings block of the Configure page: who can reach the agent, pausing it, and deleting it. A host
 * calls with the account's key (the CLI, MCP); the operator's dashboard calls with the same key and its
 * own secret. Only the dashboard may change these.
 */
describe('Agent Inbox agent settings (who can reach, pause, delete) #novu-v2', () => {
  const originalSecret = process.env.HUMAN_DASHBOARD_API_SECRET;
  let session: UserSession;
  let telegramApiStub: TelegramApiStub;
  let operatorId: string;
  let integrationIdentifier: string;
  let integrationId: string;
  let relayAgentId: string;

  before(async () => {
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
    telegramApiStub = await startTelegramApiStub();
  });

  beforeEach(async () => {
    process.env.HUMAN_DASHBOARD_API_SECRET = DASHBOARD_SECRET;
    session = new UserSession();
    await session.initialize();
    telegramApiStub.reset();

    operatorId = `settings-e2e-${Date.now()}`;

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
        token: 'e2e-settings-telegram-secret',
      }),
      active: true,
      identifier: `telegram-settings-e2e-${Date.now()}`,
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
      identifier: `ce-settings-e2e-${Date.now()}`,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      integrationIdentifier,
      providerId: ChatProviderIdEnum.Telegram,
      channel: ChannelTypeEnum.CHAT,
      subscriberId: operatorId,
      contextKeys: [],
      type: ENDPOINT_TYPES.TELEGRAM_CHAT,
      endpoint: { chatId: CONTACT_CHAT_ID },
    });
  });

  afterEach(async () => {
    if (originalSecret === undefined) {
      delete process.env.HUMAN_DASHBOARD_API_SECRET;
    } else {
      process.env.HUMAN_DASHBOARD_API_SECRET = originalSecret;
    }

    await testServer.getService(ChatInstanceRegistry).onModuleDestroy();
  });

  /** As a host calls: the account's key, through the CLI. */
  function asHost(method: 'get' | 'post' | 'patch' | 'delete', path: string) {
    return session.testAgent[method](path)
      .set('Authorization', `ApiKey ${session.apiKey}`)
      .set(AGENT_INBOX_VIA_HEADER, 'cli');
  }

  /** As the operator's dashboard calls: the same key, and the dashboard's secret. */
  function asDashboard(method: 'get' | 'post' | 'patch' | 'delete', path: string) {
    return session.testAgent[method](path)
      .set('Authorization', `ApiKey ${session.apiKey}`)
      .set(HUMAN_DASHBOARD_SECRET_HEADER, DASHBOARD_SECRET);
  }

  async function updateAgent(body: Record<string, unknown>): Promise<Record<string, any>> {
    const res = await asDashboard('patch', '/v1/human/agent').send(body);
    expect(res.status).to.equal(200, JSON.stringify(res.body));

    return res.body.data;
  }

  async function sendMessageToRelay(text: string, chatId: string) {
    const config = await testServer
      .getService(AgentConfigResolver)
      .resolve(relayAgentId, integrationIdentifier, { source: 'webhook_message' });
    const thread = {
      id: `telegram:${chatId}`,
      channelId: chatId,
      isDM: true,
      toJSON: () => ({ id: `telegram:${chatId}`, channelId: chatId, isDM: true }),
      startTyping: async () => {},
      post: sinon.stub().resolves({ id: 'reply-1', threadId: `telegram:${chatId}` }),
    };

    await testServer.getService(AgentInboundHandler).handle(
      relayAgentId,
      config,
      thread as any,
      {
        id: `msg-${Math.random().toString(36).slice(2)}`,
        threadId: `telegram:${chatId}`,
        text,
        author: { userId: chatId, fullName: 'Someone', userName: 'someone', isBot: false },
        raw: { message: { chat: { id: Number(chatId) } } },
        attachments: [],
      } as any,
      AgentEventEnum.ON_MESSAGE
    );

    return thread;
  }

  /** The inbox as the operator sees it on the dashboard, strangers included. */
  async function operatorInbox(query: Record<string, string> = {}) {
    const res = await asDashboard('get', '/v1/human/inbox').query({ senders: 'all', ...query });
    expect(res.status).to.equal(200, JSON.stringify(res.body));

    return res.body as { data: Array<Record<string, any>>; next: string | null };
  }

  function relayConversations() {
    return conversationRepository.find(
      { _environmentId: session.environment._id, _organizationId: session.organization._id, _agentId: relayAgentId },
      ['_id']
    );
  }

  describe('who can reach the agent', () => {
    it('starts open to anyone and not paused', async () => {
      const res = await asHost('get', '/v1/human/agent');

      expect(res.status).to.equal(200, JSON.stringify(res.body));
      expect(res.body.data).to.include({ reach: 'anyone', paused: false });
      expect(res.body.data).to.not.have.property('pausedAt');
    });

    it('with contacts only, a stranger’s message never reaches the inbox, and a contact’s does', async () => {
      expect(await updateAgent({ reach: 'contacts' })).to.include({ reach: 'contacts' });

      const strangerThread = await sendMessageToRelay('hi, who is this?', STRANGER_CHAT_ID);

      expect((await operatorInbox()).data).to.have.length(0);
      expect(await relayConversations()).to.have.length(0);
      expect(strangerThread.post.called).to.equal(false);

      const counts = await asDashboard('get', '/v1/human/inbox/counts').query({ senders: 'all' });
      expect(counts.status).to.equal(200, JSON.stringify(counts.body));
      expect(counts.body.data.tabs.all).to.equal(0);

      await sendMessageToRelay('can you check the deploy?', CONTACT_CHAT_ID);

      const { data } = await operatorInbox();
      expect(data).to.have.length(1);
      expect(data[0]).to.include({ kind: 'contact', unreadCount: 1 });
    });

    it('lets strangers write again once anyone can reach it', async () => {
      await updateAgent({ reach: 'contacts' });
      expect(await updateAgent({ reach: 'anyone' })).to.include({ reach: 'anyone' });

      await sendMessageToRelay('hi, who is this?', STRANGER_CHAT_ID);

      const { data } = await operatorInbox();
      expect(data).to.have.length(1);
      expect(data[0]).to.include({ kind: 'stranger' });
    });

    it('refuses a reach it does not know', async () => {
      const res = await asDashboard('patch', '/v1/human/agent').send({ reach: 'friends' });

      expect(res.status).to.be.within(400, 422, JSON.stringify(res.body));
    });
  });

  describe('pause', () => {
    it('keeps hosts out with agent_paused while mail keeps arriving, and lets them back in on resume', async () => {
      const paused = await updateAgent({ paused: true });
      expect(paused).to.include({ paused: true });
      expect(Date.parse(paused.pausedAt)).to.be.closeTo(Date.now(), 60_000);

      for (const [method, path] of [
        ['get', '/v1/human/inbox'],
        ['get', '/v1/human/inbox/counts'],
        ['get', '/v1/human/interactions'],
        ['post', '/v1/human/interactions'],
      ] as const) {
        const request = asHost(method, path);
        const res = await (method === 'post' ? request.send({ kind: 'tell', card: { title: 'hi' } }) : request);

        expect(res.status).to.equal(403, `${method} ${path}: ${JSON.stringify(res.body)}`);
        expect(res.body.code).to.equal(AGENT_PAUSED);
        expect(res.body.message).to.contain('resumes it on agentinbox.md');
      }

      // A call with the key and no CLI header is a host too.
      const plainKey = await session.testAgent.get('/v1/human/inbox').set('Authorization', `ApiKey ${session.apiKey}`);
      expect(plainKey.status).to.equal(403, JSON.stringify(plainKey.body));

      await sendMessageToRelay('are you there?', CONTACT_CHAT_ID);

      // The operator still reads everything, and the host still sees that the agent is paused.
      expect((await operatorInbox({ filter: 'unread' })).data).to.have.length(1);
      const agentRes = await asHost('get', '/v1/human/agent');
      expect(agentRes.body.data).to.include({ paused: true });

      const resumed = await updateAgent({ paused: false });
      expect(resumed).to.include({ paused: false });
      expect(resumed).to.not.have.property('pausedAt');

      const inboxRes = await asHost('get', '/v1/human/inbox').query({ filter: 'unread' });
      expect(inboxRes.status).to.equal(200, JSON.stringify(inboxRes.body));
      expect(inboxRes.body.data).to.have.length(1);
    });
  });

  describe('only from the dashboard', () => {
    function expectDashboardOnly(res: { status: number; body: Record<string, any> }) {
      expect(res.status).to.equal(403, JSON.stringify(res.body));
      expect(res.body.code).to.equal(DASHBOARD_ONLY);
    }

    it('refuses a host that changes who can reach the agent or pauses it, and changes nothing', async () => {
      expectDashboardOnly(await asHost('patch', '/v1/human/agent').send({ reach: 'contacts' }));
      expectDashboardOnly(await asHost('patch', '/v1/human/agent').send({ paused: true }));
      // A rename in the same call goes nowhere either.
      expectDashboardOnly(await asHost('patch', '/v1/human/agent').send({ name: 'Renamed', paused: true }));

      const res = await asHost('get', '/v1/human/agent');
      expect(res.status).to.equal(200, JSON.stringify(res.body));
      expect(res.body.data).to.include({ reach: 'anyone', paused: false });
      expect(res.body.data.name).to.not.equal('Renamed');
    });

    it('refuses a host that resumes an agent the operator paused', async () => {
      await updateAgent({ paused: true });

      expectDashboardOnly(await asHost('patch', '/v1/human/agent').send({ paused: false }));
      expect((await asDashboard('get', '/v1/human/agent')).body.data).to.include({ paused: true });
    });

    it('refuses a host that deletes the agent', async () => {
      expectDashboardOnly(await asHost('delete', '/v1/human/agent'));

      const agent = await agentRepository.findOne({ _id: relayAgentId, _environmentId: session.environment._id }, [
        '_id',
      ]);
      expect(agent?._id).to.equal(relayAgentId);
    });

    it('refuses a call with a wrong dashboard secret', async () => {
      const res = await session.testAgent
        .delete('/v1/human/agent')
        .set('Authorization', `ApiKey ${session.apiKey}`)
        .set(HUMAN_DASHBOARD_SECRET_HEADER, 'guess');

      expectDashboardOnly(res);
    });
  });

  describe('delete', () => {
    it('removes the agent with its channels and conversations, and then there is no agent', async () => {
      await sendMessageToRelay('hello', CONTACT_CHAT_ID);
      expect(await relayConversations()).to.have.length(1);

      const res = await asDashboard('delete', '/v1/human/agent');
      expect(res.status).to.equal(204, JSON.stringify(res.body));

      const agentRes = await asHost('get', '/v1/human/agent');
      expect(agentRes.status).to.equal(404, JSON.stringify(agentRes.body));
      expect(await relayConversations()).to.have.length(0);
      const channel = await integrationRepository.findOne({
        _id: integrationId,
        _environmentId: session.environment._id,
      });
      expect(channel).to.equal(null);
      expect(
        await channelEndpointRepository.find({ _environmentId: session.environment._id, integrationIdentifier })
      ).to.have.length(0);
      expect(
        await agentIntegrationRepository.find({ _environmentId: session.environment._id, _agentId: relayAgentId }, [
          '_id',
        ])
      ).to.have.length(0);

      expect((await asDashboard('delete', '/v1/human/agent')).status).to.equal(404);
    });

    it('frees its email address for the next agent', async () => {
      const inboxRoutingKey = generateAgentInboxRoutingKey();
      const emailInbox = await integrationRepository.create({
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        providerId: EmailProviderIdEnum.AgentEmailInbox,
        channel: ChannelTypeEnum.EMAIL,
        credentials: { inboxRoutingKey },
        active: true,
        identifier: `agent-inbox-settings-e2e-${Date.now()}`,
        deleted: false,
      });
      await agentIntegrationRepository.create({
        _agentId: relayAgentId,
        _integrationId: emailInbox._id,
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
      });

      expect((await asDashboard('delete', '/v1/human/agent')).status).to.equal(204);

      // The address is unique across all agents, so this would fail while the old inbox still held it.
      const next = await integrationRepository.create({
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        providerId: EmailProviderIdEnum.AgentEmailInbox,
        channel: ChannelTypeEnum.EMAIL,
        credentials: { inboxRoutingKey },
        active: true,
        identifier: `agent-inbox-settings-e2e-next-${Date.now()}`,
        deleted: false,
      });
      expect(next._id).to.be.a('string');
    });

    it('keeps the contacts and the operator, so the next agent starts with them', async () => {
      expect((await asDashboard('delete', '/v1/human/agent')).status).to.equal(204);

      const setupRes = await asDashboard('post', '/v1/human/setup').send({ operator: true });
      expect(setupRes.status).to.equal(200, JSON.stringify(setupRes.body));
      expect(setupRes.body.data.agentId).to.not.equal(relayAgentId);
      expect(setupRes.body.data.subscriberId).to.equal(operatorId);

      const contacts = await asDashboard('get', '/v1/human/contacts');
      expect(contacts.status).to.equal(200, JSON.stringify(contacts.body));
      expect(contacts.body.data.map((contact: { id: string }) => contact.id)).to.include(operatorId);
    });

    it('stops a one-time code made for it from connecting', async () => {
      const issued = await session.testAgent
        .post('/v1/human/agent/connect-codes')
        .set('Authorization', `ApiKey ${session.apiKey}`)
        .send({ handle: `atlas-${Math.random().toString(36).slice(2, 10)}` });
      expect(issued.status).to.equal(200, JSON.stringify(issued.body));

      expect((await asDashboard('delete', '/v1/human/agent')).status).to.equal(204);

      const connect = await session.testAgent
        .post('/v1/human/connect')
        .set('Authorization', '')
        .set('X-Forwarded-For', '198.18.40.39')
        .send({ agent: issued.body.data.handle, code: issued.body.data.code });

      expect(connect.status).to.equal(404, JSON.stringify(connect.body));
      expect(connect.body.code).to.equal(CONNECT_AGENT_GONE);
    });

    it('works while the agent is paused', async () => {
      await updateAgent({ paused: true });

      expect((await asDashboard('delete', '/v1/human/agent')).status).to.equal(204);
      const agent = await agentRepository.findOne({ _id: relayAgentId, _environmentId: session.environment._id }, [
        '_id',
      ]);
      expect(agent).to.equal(null);
    });
  });
});
