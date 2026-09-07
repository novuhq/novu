import { encryptCredentials } from '@novu/application-generic';
import {
  AgentIntegrationRepository,
  ChannelEndpointRepository,
  IntegrationRepository,
  SubscriberRepository,
} from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum, ENDPOINT_TYPES } from '@novu/shared';
import { testServer, UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { TelegramStartCodeService } from '../../telegram-linking/telegram-start-code.service';
import { AgentConfigResolver } from '../channels/agent-config-resolver.service';
import { ChatInstanceRegistry } from '../conversation-runtime/ingress/chat-instance.registry';
import { AgentInboundHandler } from '../conversation-runtime/ingress/inbound-turn.handler';
import { AgentEventEnum } from '../shared/enums/agent-event.enum';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';
import { startTelegramApiStub, type TelegramApiStub } from './helpers/telegram-api-stub';

const integrationRepository = new IntegrationRepository();
const agentIntegrationRepository = new AgentIntegrationRepository();
const subscriberRepository = new SubscriberRepository();
const channelEndpointRepository = new ChannelEndpointRepository();

const TELEGRAM_WEBHOOK_SECRET = 'e2e-telegram-secret-token';

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

describe('Telegram subscriber start link (cache + inbound) #novu-v2', () => {
  let session: UserSession;
  let agentId: string;
  let agentIdentifier: string;
  let integrationId: string;
  let integrationIdentifier: string;
  let subscriberId: string;
  let telegramApiStub: TelegramApiStub;

  before(async () => {
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
    telegramApiStub = await startTelegramApiStub();
  });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    agentIdentifier = `e2e-tg-sub-${Date.now()}`;
    const createRes = await session.testAgent.post('/v1/agents').send({
      name: 'Telegram Subscriber E2E',
      identifier: agentIdentifier,
    });
    agentId = createRes.body.data._id as string;

    const integration = await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      providerId: ChatProviderIdEnum.Telegram,
      channel: ChannelTypeEnum.CHAT,
      credentials: encryptCredentials({
        apiToken: '12345678:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        token: TELEGRAM_WEBHOOK_SECRET,
      }),
      active: true,
      identifier: `telegram-sub-e2e-${Date.now()}`,
      priority: 1,
      primary: false,
      deleted: false,
    });
    integrationId = String(integration._id);
    integrationIdentifier = integration.identifier;

    await agentIntegrationRepository.create({
      _agentId: agentId,
      _integrationId: integration._id,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    const subscriber = await subscriberRepository.create({
      subscriberId: `sub-tg-e2e-${Date.now()}`,
      firstName: 'TG',
      lastName: 'E2E',
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });
    subscriberId = subscriber.subscriberId;
  });

  function makeTelegramThread() {
    return {
      id: 'telegram:777001',
      channelId: '777001',
      isDM: true,
      toJSON: () => ({ id: 'telegram:777001', channelId: '777001', isDM: true }),
      startTyping: async () => {},
      post: sinon.stub().resolves({ id: 'reply-1', threadId: 'telegram:777001' }),
    };
  }

  function makeStartMessage(text: string) {
    return {
      id: 'msg-1',
      threadId: 'telegram:777001',
      text,
      author: { userId: '777001', fullName: 'TG User', userName: 'tguser', isBot: false },
      raw: { message: { chat: { id: 777001 } } },
      attachments: [],
    };
  }

  it('consumes a start code on first /start, creates telegram_chat endpoint, second /start is idempotent', async () => {
    const startCodeService = testServer.getService(TelegramStartCodeService);
    const { code } = await startCodeService.issue({
      environmentId: session.environment._id,
      organizationId: session.organization._id,
      linkScope: { mode: 'agent', agentIdentifier },
      integrationId,
      subscriberId,
    });

    const inboundHandler = testServer.getService(AgentInboundHandler);
    const configResolver = testServer.getService(AgentConfigResolver);
    const config = await configResolver.resolve(agentId, integrationIdentifier, { source: 'webhook_message' });

    expect(config.platform).to.equal(AgentPlatformEnum.TELEGRAM);

    const thread = makeTelegramThread();
    const message = makeStartMessage(`/start ${code}`);

    await inboundHandler.handle(agentId, config, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

    const created = await channelEndpointRepository.findByPlatformIdentity({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      integrationIdentifier,
      type: ENDPOINT_TYPES.TELEGRAM_CHAT,
      endpointField: 'chatId',
      endpointValue: '777001',
    });

    expect(created).to.exist;
    expect(created!.subscriberId).to.equal(subscriberId);

    await inboundHandler.handle(agentId, config, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

    const allForChat = await channelEndpointRepository.find({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      integrationIdentifier,
      type: ENDPOINT_TYPES.TELEGRAM_CHAT,
      'endpoint.chatId': '777001',
    });

    expect(allForChat.length).to.equal(1);
  });

  it('replies with expired-style message when code is unknown and chat has no endpoint', async () => {
    const inboundHandler = testServer.getService(AgentInboundHandler);
    const configResolver = testServer.getService(AgentConfigResolver);
    const config = await configResolver.resolve(agentId, integrationIdentifier, { source: 'webhook_message' });

    const thread = makeTelegramThread();
    const message = makeStartMessage('/start boguscodeboguscodeboguscodebogus');

    await inboundHandler.handle(agentId, config, thread as any, message as any, AgentEventEnum.ON_MESSAGE);

    expect((thread.post as sinon.SinonStub).calledOnce).to.equal(true);
    expect(String((thread.post as sinon.SinonStub).firstCall.args[0])).to.match(/expired|valid/i);
  });

  describe('inbound webhook /start delivery (full chat SDK path)', () => {
    const TELEGRAM_CHAT_ID = 777_042;

    afterEach(async () => {
      // Drop cached Chat instances so each test builds a fresh Telegram adapter
      // (and re-reads TELEGRAM_API_BASE_URL) for its own integration.
      const registry = testServer.getService(ChatInstanceRegistry);
      await registry.onModuleDestroy();
      telegramApiStub.reset();
    });

    function buildStartUpdate(text: string) {
      return {
        update_id: Date.now(),
        message: {
          message_id: Math.floor(Math.random() * 1_000_000) + 1,
          date: Math.floor(Date.now() / 1000),
          chat: { id: TELEGRAM_CHAT_ID, type: 'private', first_name: 'TG' },
          from: { id: TELEGRAM_CHAT_ID, is_bot: false, first_name: 'TG', username: 'tguser' },
          text,
          entities: [{ type: 'bot_command', offset: 0, length: '/start'.length }],
        },
      };
    }

    async function postTelegramWebhook(update: Record<string, unknown>) {
      const res = await session.testAgent
        .post(`/v1/agents/${agentId}/webhook/${integrationIdentifier}`)
        .set('x-telegram-bot-api-secret-token', TELEGRAM_WEBHOOK_SECRET)
        .set('content-type', 'application/json')
        .send(update);

      expect(res.status).to.equal(200);
    }

    it('creates the telegram_chat endpoint when /start <code> arrives as a real Telegram webhook update', async () => {
      // Regression: chat SDK >= 4.31 routes Telegram bot commands to
      // slash-command handlers instead of the message pipeline, which used to
      // silently drop `/start <code>` so no channel endpoint was ever created.
      const startCodeService = testServer.getService(TelegramStartCodeService);
      const { code } = await startCodeService.issue({
        environmentId: session.environment._id,
        organizationId: session.organization._id,
        linkScope: { mode: 'agent', agentIdentifier },
        integrationId,
        subscriberId,
      });

      await postTelegramWebhook(buildStartUpdate(`/start ${code}`));

      const created = await pollFor(() =>
        channelEndpointRepository.findByPlatformIdentity({
          _environmentId: session.environment._id,
          _organizationId: session.organization._id,
          integrationIdentifier,
          type: ENDPOINT_TYPES.TELEGRAM_CHAT,
          endpointField: 'chatId',
          endpointValue: String(TELEGRAM_CHAT_ID),
        })
      );

      expect(created.subscriberId).to.equal(subscriberId);

      const confirmation = await pollFor(async () =>
        telegramApiStub.calls.find(
          (call) => call.method === 'sendMessage' && String(call.payload.chat_id) === String(TELEGRAM_CHAT_ID)
        )
      );

      expect(String(confirmation.payload.text)).to.match(/connected/i);
    });

    it('replies with an expired-style message when the /start code is unknown', async () => {
      await postTelegramWebhook(buildStartUpdate('/start boguscodeboguscodeboguscodebogus'));

      const reply = await pollFor(async () =>
        telegramApiStub.calls.find(
          (call) => call.method === 'sendMessage' && String(call.payload.chat_id) === String(TELEGRAM_CHAT_ID)
        )
      );

      expect(String(reply.payload.text)).to.match(/expired|valid/i);
    });
  });
});
