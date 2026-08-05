import { encryptCredentials } from '@novu/application-generic';
import { ChannelEndpointRepository, IntegrationRepository, SubscriberRepository } from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum, ENDPOINT_TYPES } from '@novu/shared';
import { testServer, UserSession } from '@novu/testing';
import { expect } from 'chai';
import { startTelegramApiStub, type TelegramApiStub } from '../../agents/e2e/helpers/telegram-api-stub';
import { integrationTelegramLinkScope } from '../../telegram-linking/telegram-link-scope';
import { TelegramStartCodeService } from '../../telegram-linking/telegram-start-code.service';

const integrationRepository = new IntegrationRepository();
const subscriberRepository = new SubscriberRepository();
const channelEndpointRepository = new ChannelEndpointRepository();

const TELEGRAM_WEBHOOK_SECRET = 'e2e-integration-telegram-secret';

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

describe('Telegram integration-only subscriber link #novu-v2', () => {
  let session: UserSession;
  let integrationId: string;
  let integrationIdentifier: string;
  let subscriberId: string;
  let telegramApiStub: TelegramApiStub;

  before(async () => {
    telegramApiStub = await startTelegramApiStub();
  });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

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
      identifier: `telegram-integration-only-${Date.now()}`,
      priority: 1,
      primary: false,
      deleted: false,
    });
    integrationId = String(integration._id);
    integrationIdentifier = integration.identifier;

    const subscriber = await subscriberRepository.create({
      subscriberId: `sub-tg-integration-${Date.now()}`,
      firstName: 'TG',
      lastName: 'Integration',
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });
    subscriberId = subscriber.subscriberId;
  });

  function buildStartUpdate(text: string) {
    return {
      update_id: Date.now(),
      message: {
        message_id: Math.floor(Math.random() * 1_000_000) + 1,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 888_001, type: 'private', first_name: 'TG' },
        from: { id: 888_001, is_bot: false, first_name: 'TG', username: 'tguser' },
        text,
        entities: [{ type: 'bot_command', offset: 0, length: '/start'.length }],
      },
    };
  }

  async function postIntegrationTelegramWebhook(update: Record<string, unknown>) {
    const res = await session.testAgent
      .post(`/v1/integrations/${integrationIdentifier}/${session.environment._id}/webhook`)
      .set('x-telegram-bot-api-secret-token', TELEGRAM_WEBHOOK_SECRET)
      .set('content-type', 'application/json')
      .send(update);

    expect(res.status).to.equal(200);
  }

  it('issues a subscriber link without an agent and links the chat via the integration webhook', async () => {
    const startCodeService = testServer.getService(TelegramStartCodeService);
    const { code } = await startCodeService.issue({
      environmentId: session.environment._id,
      organizationId: session.organization._id,
      linkScope: integrationTelegramLinkScope(),
      integrationId,
      subscriberId,
    });

    await postIntegrationTelegramWebhook(buildStartUpdate(`/start ${code}`));

    const created = await pollFor(() =>
      channelEndpointRepository.findByPlatformIdentity({
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        integrationIdentifier,
        type: ENDPOINT_TYPES.TELEGRAM_CHAT,
        endpointField: 'chatId',
        endpointValue: '888001',
      })
    );

    expect(created.subscriberId).to.equal(subscriberId);

    const confirmation = await pollFor(async () =>
      telegramApiStub.calls.find((call) => call.method === 'sendMessage' && String(call.payload.chat_id) === '888001')
    );

    expect(String(confirmation.payload.text)).to.match(/connected/i);
  });

  it('exposes linkChannelEndpoint for Telegram integrations without agents', async () => {
    const response = await session.testAgent.post('/v1/integrations/channel-endpoints/link').send({
      integrationIdentifier,
      subscriberId,
    });

    expect(response.status).to.equal(200);
    expect(response.body.data.url).to.match(/^https:\/\/t\.me\//);
    expect(response.body.data.providerMetadata.botUsername).to.equal('novu_e2e_bot');
  });
});
