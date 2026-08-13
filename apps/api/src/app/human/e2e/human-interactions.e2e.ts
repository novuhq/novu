import { encryptCredentials } from '@novu/application-generic';
import {
  AgentIntegrationRepository,
  ChannelEndpointRepository,
  HumanInteractionRepository,
  IntegrationRepository,
} from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum, ENDPOINT_TYPES, HumanInteractionStatusEnum } from '@novu/shared';
import { testServer, UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { AgentConfigResolver } from '../../agents/channels/agent-config-resolver.service';
import type { ResolvedAgentConfig } from '../../agents/channels/agent-config-resolver.service';
import { ChatInstanceRegistry } from '../../agents/conversation-runtime/ingress/chat-instance.registry';
import { AgentInboundHandler } from '../../agents/conversation-runtime/ingress/inbound-turn.handler';
import { startTelegramApiStub, type TelegramApiStub } from '../../agents/e2e/helpers/telegram-api-stub';
import { AgentEventEnum } from '../../agents/shared/enums/agent-event.enum';

const integrationRepository = new IntegrationRepository();
const agentIntegrationRepository = new AgentIntegrationRepository();
const channelEndpointRepository = new ChannelEndpointRepository();
const humanInteractionRepository = new HumanInteractionRepository();

const TELEGRAM_CHAT_ID = '777001';

describe('Human interactions (create → deliver → resolve) #novu-v2', () => {
  let session: UserSession;
  let telegramApiStub: TelegramApiStub;
  let subscriberId: string;
  let integrationIdentifier: string;
  let relayAgentId: string;
  let relayAgentIdentifier: string;

  before(async () => {
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
    telegramApiStub = await startTelegramApiStub();
  });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    telegramApiStub.reset();

    subscriberId = `human-e2e-${Date.now()}`;

    const setupRes = await session.testAgent.post('/v1/human/setup').send({ subscriberId });
    expect(setupRes.status).to.equal(200, JSON.stringify(setupRes.body));
    relayAgentId = setupRes.body.data.agentId as string;
    relayAgentIdentifier = setupRes.body.data.agentIdentifier as string;

    const integration = await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      providerId: ChatProviderIdEnum.Telegram,
      channel: ChannelTypeEnum.CHAT,
      credentials: encryptCredentials({
        apiToken: '12345678:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        token: 'e2e-human-telegram-secret',
      }),
      active: true,
      identifier: `telegram-human-e2e-${Date.now()}`,
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
      identifier: `ce-human-e2e-${Date.now()}`,
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
    delete process.env.HUMAN_PENDING_CAP;
  });

  async function createInteraction(body: Record<string, unknown>) {
    return session.testAgent.post('/v1/human/interactions').send({
      to: subscriberId,
      via: 'telegram',
      agentIdentifier: relayAgentIdentifier,
      ...body,
    });
  }

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

  function makeMessage(text: string, raw: Record<string, unknown> = {}) {
    return {
      id: `msg-${Math.random().toString(36).slice(2)}`,
      threadId: `telegram:${TELEGRAM_CHAT_ID}`,
      text,
      author: { userId: TELEGRAM_CHAT_ID, fullName: 'Human E2E', userName: 'humane2e', isBot: false },
      raw: { message: { chat: { id: Number(TELEGRAM_CHAT_ID) } }, ...raw },
      attachments: [],
    };
  }

  async function resolveConfig(): Promise<ResolvedAgentConfig> {
    const configResolver = testServer.getService(AgentConfigResolver);

    return configResolver.resolve(relayAgentId, integrationIdentifier, { source: 'webhook_message' });
  }

  async function clickAction(actionId: string, fromChatId: string = TELEGRAM_CHAT_ID) {
    const inboundHandler = testServer.getService(AgentInboundHandler);
    const config = await resolveConfig();
    await inboundHandler.handleAction(relayAgentId, config, makeTelegramThread() as any, { id: actionId }, fromChatId);
  }

  async function sendMessageToRelay(text: string, raw: Record<string, unknown> = {}) {
    const inboundHandler = testServer.getService(AgentInboundHandler);
    const config = await resolveConfig();
    await inboundHandler.handle(
      relayAgentId,
      config,
      makeTelegramThread() as any,
      makeMessage(text, raw) as any,
      AgentEventEnum.ON_MESSAGE
    );
  }

  describe('setup', () => {
    it('is idempotent and hides the relay agent from the agents list', async () => {
      const secondSetup = await session.testAgent.post('/v1/human/setup').send({ subscriberId });
      expect(secondSetup.status).to.equal(200);
      expect(secondSetup.body.data.agentId).to.equal(relayAgentId);

      const agentsList = await session.testAgent.get('/v1/agents');
      const identifiers = (agentsList.body.data ?? []).map((agent: { identifier: string }) => agent.identifier);
      expect(identifiers).to.not.include(relayAgentIdentifier);
    });

    it('rejects reusing a regular agent identifier as the relay', async () => {
      await session.testAgent.post('/v1/agents').send({ name: 'Regular', identifier: 'regular-agent-e2e' });
      const res = await session.testAgent
        .post('/v1/human/setup')
        .send({ subscriberId, agentIdentifier: 'regular-agent-e2e' });
      expect(res.status).to.equal(409);
    });
  });

  describe('approve', () => {
    it('delivers a card, resolves on approve click, and edits the delivered message', async () => {
      const createRes = await createInteraction({ kind: 'approve', prompt: 'Deploy to production?', from: 'deploy-bot' });
      expect(createRes.status).to.equal(201, JSON.stringify(createRes.body));

      const interaction = createRes.body.data;
      expect(interaction.status).to.equal(HumanInteractionStatusEnum.PENDING);
      expect(interaction.id).to.match(/^hi_/);

      const sends = telegramApiStub.calls.filter((call) => call.method === 'sendMessage');
      expect(sends.length).to.be.greaterThan(0);
      const sentPayload = JSON.stringify(sends[sends.length - 1].payload);
      expect(sentPayload).to.include('Deploy to production?');
      // Telegram MarkdownV2 escapes the hyphen in the attribution label.
      expect(sentPayload).to.include('deploy\\\\-bot');
      // Short action ids fit Telegram's 64-byte callback_data limit and are
      // delivered raw by design (tokenization only kicks in past the limit).
      expect(sentPayload).to.include(`human:${interaction.id}:approve`);
      expect(sentPayload).to.include(`human:${interaction.id}:deny`);
      // Human-relay traffic is utility messaging to yourself — never branded.
      expect(sentPayload).to.not.include('Powered by');

      const row = await humanInteractionRepository.findByIdentifier(session.environment._id, interaction.id);
      expect(row!.platformMessageId).to.be.a('string');

      await clickAction(`human:${interaction.id}:approve`);

      const getRes = await session.testAgent.get(`/v1/human/interactions/${interaction.id}`);
      expect(getRes.body.data.status).to.equal(HumanInteractionStatusEnum.APPROVED);
      expect(getRes.body.data.response.optionId).to.equal('approve');

      const edits = telegramApiStub.calls.filter((call) => call.method === 'editMessageText');
      expect(edits.length).to.be.greaterThan(0);
      const editedText = edits[edits.length - 1].payload.text as string;
      expect(editedText).to.include('Approved');
      // The subtitle and status line must be visually separated, not crammed together.
      expect(editedText).to.match(/\n\s*\n/);
    });

    it('ignores clicks from anyone other than the addressed human', async () => {
      const foreignChatId = '777002';
      await channelEndpointRepository.create({
        identifier: `ce-human-e2e-foreign-${Date.now()}`,
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        integrationIdentifier,
        providerId: ChatProviderIdEnum.Telegram,
        channel: ChannelTypeEnum.CHAT,
        subscriberId: `${subscriberId}-bystander`,
        contextKeys: [],
        type: ENDPOINT_TYPES.TELEGRAM_CHAT,
        endpoint: { chatId: foreignChatId },
      });

      const createRes = await createInteraction({ kind: 'approve', prompt: 'Deploy to production?' });
      const interaction = createRes.body.data;

      await clickAction(`human:${interaction.id}:approve`, foreignChatId);

      const getRes = await session.testAgent.get(`/v1/human/interactions/${interaction.id}`);
      expect(getRes.body.data.status).to.equal(HumanInteractionStatusEnum.PENDING);

      // The addressed human can still answer it afterwards.
      await clickAction(`human:${interaction.id}:approve`);

      const afterRes = await session.testAgent.get(`/v1/human/interactions/${interaction.id}`);
      expect(afterRes.body.data.status).to.equal(HumanInteractionStatusEnum.APPROVED);
    });

    it('resolves deny clicks to denied', async () => {
      const createRes = await createInteraction({ kind: 'approve', prompt: 'Drop the database?' });
      const interaction = createRes.body.data;

      await clickAction(`human:${interaction.id}:deny`);

      const getRes = await session.testAgent.get(`/v1/human/interactions/${interaction.id}`);
      expect(getRes.body.data.status).to.equal(HumanInteractionStatusEnum.DENIED);
    });

    it('get returns pending until a click resolves it', async () => {
      const createRes = await createInteraction({ kind: 'approve', prompt: 'Ship it?' });
      const interaction = createRes.body.data;

      const pendingRes = await session.testAgent.get(`/v1/human/interactions/${interaction.id}`);
      expect(pendingRes.body.data.status).to.equal(HumanInteractionStatusEnum.PENDING);

      await clickAction(`human:${interaction.id}:approve`);

      const resolvedRes = await session.testAgent.get(`/v1/human/interactions/${interaction.id}`);
      expect(resolvedRes.body.data.status).to.equal(HumanInteractionStatusEnum.APPROVED);
    });
  });

  describe('choose', () => {
    it('resolves an option click to answered with the picked option', async () => {
      const createRes = await createInteraction({
        kind: 'choose',
        prompt: 'Release strategy?',
        options: ['Canary', 'Blue-green'],
      });
      expect(createRes.status).to.equal(201, JSON.stringify(createRes.body));
      const interaction = createRes.body.data;
      expect(interaction.options).to.have.length(2);

      // Full option text goes in the message body; buttons are just letters —
      // Telegram (and most chat UIs) render long button labels badly.
      const sends = telegramApiStub.calls.filter((call) => call.method === 'sendMessage');
      const sentPayload = JSON.stringify(sends[sends.length - 1].payload);
      expect(sentPayload).to.include('Canary');
      // MarkdownV2-escapes the hyphen (and JSON.stringify escapes that escape again),
      // so check the words rather than the literal "Blue-green" substring.
      expect(sentPayload).to.include('Blue');
      expect(sentPayload).to.include('green');
      const markup = sends[sends.length - 1].payload.reply_markup as { inline_keyboard: Array<Array<{ text: string }>> };
      expect(markup.inline_keyboard[0].map((btn) => btn.text)).to.deep.equal(['A', 'B']);

      await clickAction(`human:${interaction.id}:opt:${interaction.options[1].id}`);

      const getRes = await session.testAgent.get(`/v1/human/interactions/${interaction.id}`);
      expect(getRes.body.data.status).to.equal(HumanInteractionStatusEnum.ANSWERED);
      expect(getRes.body.data.response.optionId).to.equal(interaction.options[1].id);
    });

    it('rejects choose without options', async () => {
      const createRes = await createInteraction({ kind: 'choose', prompt: 'Pick one' });
      expect(createRes.status).to.equal(400);
    });
  });

  describe('ask correlation', () => {
    it('a bare reply settles the single pending ask', async () => {
      const createRes = await createInteraction({ kind: 'ask', prompt: 'Which region should I use?' });
      const interaction = createRes.body.data;

      // ASK delivers as a structured card (bold title, italic reply hint), not a plain markdown blob.
      const sends = telegramApiStub.calls.filter((call) => call.method === 'sendMessage');
      const sentPayload = JSON.stringify(sends[sends.length - 1].payload);
      expect(sentPayload).to.include('Which region should I use');
      expect(sentPayload).to.include('Reply to this message to answer');

      await sendMessageToRelay('eu-west-1');

      const getRes = await session.testAgent.get(`/v1/human/interactions/${interaction.id}`);
      expect(getRes.body.data.status).to.equal(HumanInteractionStatusEnum.ANSWERED);
      expect(getRes.body.data.response.text).to.equal('eu-west-1');
    });

    it('a reply-to settles exactly the replied-to ask when several are pending', async () => {
      const first = (await createInteraction({ kind: 'ask', prompt: 'First question?' })).body.data;
      const second = (await createInteraction({ kind: 'ask', prompt: 'Second question?' })).body.data;

      const firstRow = await humanInteractionRepository.findByIdentifier(session.environment._id, first.id);
      // The stored id is the adapter's `chatId:messageId` composite; the webhook's
      // reply_to_message carries only the bare Telegram message id.
      const bareMessageId = Number(firstRow!.platformMessageId!.split(':').pop());

      await sendMessageToRelay('answer to the first', {
        reply_to_message: { message_id: bareMessageId },
      });

      const firstRes = await session.testAgent.get(`/v1/human/interactions/${first.id}`);
      const secondRes = await session.testAgent.get(`/v1/human/interactions/${second.id}`);
      expect(firstRes.body.data.status).to.equal(HumanInteractionStatusEnum.ANSWERED);
      expect(firstRes.body.data.response.text).to.equal('answer to the first');
      expect(secondRes.body.data.status).to.equal(HumanInteractionStatusEnum.PENDING);
    });

    it('a bare reply with several pending asks triggers disambiguation, and a pick settles it', async () => {
      const first = (await createInteraction({ kind: 'ask', prompt: 'First question?' })).body.data;
      const second = (await createInteraction({ kind: 'ask', prompt: 'Second question?' })).body.data;

      await sendMessageToRelay('ambiguous answer');

      let firstStatus = (await session.testAgent.get(`/v1/human/interactions/${first.id}`)).body.data.status;
      let secondStatus = (await session.testAgent.get(`/v1/human/interactions/${second.id}`)).body.data.status;
      expect(firstStatus).to.equal(HumanInteractionStatusEnum.PENDING);
      expect(secondStatus).to.equal(HumanInteractionStatusEnum.PENDING);

      await clickAction(`human:pick:${second.id}`);

      firstStatus = (await session.testAgent.get(`/v1/human/interactions/${first.id}`)).body.data.status;
      secondStatus = (await session.testAgent.get(`/v1/human/interactions/${second.id}`)).body.data.status;
      expect(secondStatus).to.equal(HumanInteractionStatusEnum.ANSWERED);
      expect(firstStatus).to.equal(HumanInteractionStatusEnum.PENDING);

      const secondRes = await session.testAgent.get(`/v1/human/interactions/${second.id}`);
      expect(secondRes.body.data.response.text).to.equal('ambiguous answer');
    });
  });

  describe('expiry and cancel', () => {
    it('lazy-expires an overdue interaction on read and ignores late clicks', async () => {
      const createRes = await createInteraction({ kind: 'approve', prompt: 'Old request?' });
      const interaction = createRes.body.data;

      const row = await humanInteractionRepository.findByIdentifier(session.environment._id, interaction.id);
      await humanInteractionRepository.update(
        { _id: row!._id, _environmentId: session.environment._id },
        { $set: { expiresAt: new Date(Date.now() - 1000).toISOString() } }
      );

      const getRes = await session.testAgent.get(`/v1/human/interactions/${interaction.id}`);
      expect(getRes.body.data.status).to.equal(HumanInteractionStatusEnum.EXPIRED);

      await clickAction(`human:${interaction.id}:approve`);

      const afterClick = await session.testAgent.get(`/v1/human/interactions/${interaction.id}`);
      expect(afterClick.body.data.status).to.equal(HumanInteractionStatusEnum.EXPIRED);
    });

    it('cancel settles a pending interaction and is idempotent', async () => {
      const createRes = await createInteraction({ kind: 'approve', prompt: 'Cancel me?' });
      const interaction = createRes.body.data;

      const cancelRes = await session.testAgent.post(`/v1/human/interactions/${interaction.id}/cancel`);
      expect(cancelRes.body.data.status).to.equal(HumanInteractionStatusEnum.CANCELED);

      const again = await session.testAgent.post(`/v1/human/interactions/${interaction.id}/cancel`);
      expect(again.body.data.status).to.equal(HumanInteractionStatusEnum.CANCELED);
    });

    it('cancel of an overdue pending interaction expires instead of canceling', async () => {
      const createRes = await createInteraction({ kind: 'approve', prompt: 'Already late?' });
      const interaction = createRes.body.data;

      const row = await humanInteractionRepository.findByIdentifier(session.environment._id, interaction.id);
      await humanInteractionRepository.update(
        { _id: row!._id, _environmentId: session.environment._id },
        { $set: { expiresAt: new Date(Date.now() - 1000).toISOString() } }
      );

      const cancelRes = await session.testAgent.post(`/v1/human/interactions/${interaction.id}/cancel`);
      expect(cancelRes.body.data.status).to.equal(HumanInteractionStatusEnum.EXPIRED);
    });
  });

  describe('email channel', () => {
    it('setup stamps the subscriber email and updates it on re-run', async () => {
      const withEmail = await session.testAgent
        .post('/v1/human/setup')
        .send({ subscriberId, email: 'Human@Example.com' });
      expect(withEmail.status).to.equal(200);

      const { SubscriberRepository } = await import('@novu/dal');
      const subscriberRepository = new SubscriberRepository();
      let subscriber = await subscriberRepository.findOne({
        _environmentId: session.environment._id,
        subscriberId,
      });
      expect(subscriber?.email).to.equal('human@example.com');

      await session.testAgent.post('/v1/human/setup').send({ subscriberId, email: 'other@example.com' });
      subscriber = await subscriberRepository.findOne({ _environmentId: session.environment._id, subscriberId });
      expect(subscriber?.email).to.equal('other@example.com');
    });

    it('rejects email-channel interactions when the human has no email on file', async () => {
      const emailIntegration = await integrationRepository.create({
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        providerId: 'novu-email' as never,
        channel: ChannelTypeEnum.EMAIL,
        credentials: {},
        active: true,
        identifier: `email-human-e2e-${Date.now()}`,
        priority: 1,
        primary: false,
        deleted: false,
      });
      await agentIntegrationRepository.create({
        _agentId: relayAgentId,
        _integrationId: emailIntegration._id,
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
      });

      const res = await session.testAgent.post('/v1/human/interactions').send({
        kind: 'tell',
        prompt: 'hello',
        to: subscriberId,
        via: 'email',
        agentIdentifier: relayAgentIdentifier,
      });

      expect(res.status).to.equal(404);
      expect(res.body.message).to.match(/no email address on file/i);
    });
  });

  describe('tell and caps', () => {
    it('tell resolves to delivered immediately and renders as a card with no buttons', async () => {
      const createRes = await createInteraction({ kind: 'tell', prompt: 'Build finished.' });
      expect(createRes.status).to.equal(201);
      expect(createRes.body.data.status).to.equal(HumanInteractionStatusEnum.DELIVERED);

      const sends = telegramApiStub.calls.filter((call) => call.method === 'sendMessage');
      const sent = sends[sends.length - 1].payload;
      expect(JSON.stringify(sent)).to.include('Build finished');
      expect(sent.reply_markup).to.equal(undefined);
    });

    it('rejects new interactions once the pending cap is reached', async () => {
      process.env.HUMAN_PENDING_CAP = '2';

      expect((await createInteraction({ kind: 'approve', prompt: 'One?' })).status).to.equal(201);
      expect((await createInteraction({ kind: 'approve', prompt: 'Two?' })).status).to.equal(201);

      const third = await createInteraction({ kind: 'approve', prompt: 'Three?' });
      expect(third.status).to.equal(429);

      // `tell` is exempt from the pending cap.
      expect((await createInteraction({ kind: 'tell', prompt: 'Still works.' })).status).to.equal(201);
    });

    it('lists interactions', async () => {
      await createInteraction({ kind: 'approve', prompt: 'List me?' });
      const listRes = await session.testAgent.get('/v1/human/interactions?status=pending');
      expect(listRes.status).to.equal(200);
      expect(listRes.body.data.length).to.be.greaterThan(0);
    });
  });
});
