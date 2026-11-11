import { encryptCredentials } from '@novu/application-generic';
import { AgentIntegrationRepository, ChannelEndpointRepository, IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum, ENDPOINT_TYPES } from '@novu/shared';
import { testServer, UserSession } from '@novu/testing';
import { expect } from 'chai';
import { ChatInstanceRegistry } from '../../agents/conversation-runtime/ingress/chat-instance.registry';
import { startTelegramApiStub, type TelegramApiStub } from '../../agents/e2e/helpers/telegram-api-stub';

const integrationRepository = new IntegrationRepository();
const agentIntegrationRepository = new AgentIntegrationRepository();
const channelEndpointRepository = new ChannelEndpointRepository();

const CONTACT_CHAT_ID = '777003';

/**
 * Sending to a person on WhatsApp, which only takes free-form messages within 24 hours of their last one and shows
 * at most three buttons. A send it can't carry is refused before it reaches Meta, with a typed reason and the
 * person's other channels; a send that didn't ask for WhatsApp goes to one of those instead.
 */
describe('Agent Inbox WhatsApp delivery #novu-v2', () => {
  const originalFlag = process.env.IS_AGENT_INBOX_WHATSAPP_ENABLED;
  let session: UserSession;
  let telegramApiStub: TelegramApiStub;
  let contactId: string;
  let relayAgentId: string;

  before(async () => {
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
    telegramApiStub = await startTelegramApiStub();
  });

  beforeEach(async () => {
    process.env.IS_AGENT_INBOX_WHATSAPP_ENABLED = 'true';
    session = new UserSession();
    await session.initialize();
    telegramApiStub.reset();

    contactId = `whatsapp-delivery-e2e-${Date.now()}`;
    const setupRes = await session.testAgent
      .post('/v1/human/setup')
      .send({ subscriberId: contactId, operator: true, firstName: 'Ada' });
    expect(setupRes.status).to.equal(200, JSON.stringify(setupRes.body));
    relayAgentId = setupRes.body.data.agentId as string;
  });

  afterEach(async () => {
    if (originalFlag === undefined) {
      delete process.env.IS_AGENT_INBOX_WHATSAPP_ENABLED;
    } else {
      process.env.IS_AGENT_INBOX_WHATSAPP_ENABLED = originalFlag;
    }

    await testServer.getService(ChatInstanceRegistry).onModuleDestroy();
  });

  async function linkChannel(providerId: ChatProviderIdEnum, credentials: Record<string, unknown>) {
    const integration = await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      providerId,
      channel: ChannelTypeEnum.CHAT,
      credentials: encryptCredentials(credentials as never),
      active: true,
      identifier: `${providerId}-delivery-e2e-${Date.now()}`,
      priority: 1,
      primary: false,
      deleted: false,
    });
    await agentIntegrationRepository.create({
      _agentId: relayAgentId,
      _integrationId: integration._id,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    return integration.identifier;
  }

  async function addEndpoint(
    integrationIdentifier: string,
    providerId: ChatProviderIdEnum,
    type: (typeof ENDPOINT_TYPES)[keyof typeof ENDPOINT_TYPES],
    endpoint: Record<string, unknown>
  ) {
    await channelEndpointRepository.create({
      identifier: `ce-delivery-e2e-${type}-${Date.now()}`,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      integrationIdentifier,
      providerId,
      channel: ChannelTypeEnum.CHAT,
      subscriberId: contactId,
      contextKeys: [],
      type,
      endpoint,
    });
  }

  /**
   * Ada on WhatsApp, proved two days ago and silent since, so her window is shut. Proved first, so WhatsApp is
   * the channel she'd be reached on when nothing else says; with `telegram`, she is on Telegram too.
   */
  async function adaOnWhatsApp({ telegram = true } = {}) {
    const whatsApp = await linkChannel(ChatProviderIdEnum.WhatsAppBusiness, {
      apiToken: 'EAAG-e2e-token',
      phoneNumberIdentification: '1234',
      businessAccountId: 'waba-1',
      from: '+1 555-010-0199',
    });
    await addEndpoint(whatsApp, ChatProviderIdEnum.WhatsAppBusiness, ENDPOINT_TYPES.PHONE, {
      phoneNumber: '+15550100201',
      provedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    });

    if (telegram) {
      const telegramIdentifier = await linkChannel(ChatProviderIdEnum.Telegram, {
        apiToken: '12345678:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        token: 'e2e-delivery-telegram-secret',
      });
      await addEndpoint(telegramIdentifier, ChatProviderIdEnum.Telegram, ENDPOINT_TYPES.TELEGRAM_CHAT, {
        chatId: CONTACT_CHAT_ID,
      });
    }
  }

  function send(body: Record<string, unknown>) {
    return session.testAgent
      .post('/v1/human/interactions')
      .send({ kind: 'approve', to: contactId, card: { title: 'Ship it?' }, ...body });
  }

  it('refuses WhatsApp once the window is shut, naming the channel that still works', async () => {
    await adaOnWhatsApp();

    const res = await send({ via: 'whatsapp' });

    expect(res.status).to.equal(422, JSON.stringify(res.body));
    expect(res.body.code).to.equal('whatsapp_window_closed');
    expect(res.body.availableChannels).to.deep.equal(['telegram']);
    expect(res.body.windowClosedAt).to.be.a('string');
    expect(res.body.message).to.contain('--via telegram');
  });

  it('sends on their next channel when no channel was asked for', async () => {
    await adaOnWhatsApp();

    const res = await send({});

    expect(res.status).to.equal(201, JSON.stringify(res.body));
    expect(telegramApiStub.calls.some(({ method }) => method === 'sendMessage')).to.equal(true);
  });

  it('refuses even without a channel asked for when WhatsApp is all they have', async () => {
    await adaOnWhatsApp({ telegram: false });

    const res = await send({});

    expect(res.status).to.equal(422, JSON.stringify(res.body));
    expect(res.body.code).to.equal('whatsapp_window_closed');
    expect(res.body.availableChannels).to.deep.equal([]);
  });

  it('refuses a choice with more options than WhatsApp has buttons, instead of losing one', async () => {
    await adaOnWhatsApp();

    const res = await send({
      kind: 'choose',
      via: 'whatsapp',
      card: { title: 'Which region?', options: ['eu', 'us', 'ap', 'sa'] },
    });

    expect(res.status).to.equal(422, JSON.stringify(res.body));
    expect(res.body).to.include({ code: 'whatsapp_too_many_buttons', maxButtons: 3, buttons: 4 });
  });

  it('says on the contact list that WhatsApp can’t be written to right now', async () => {
    await adaOnWhatsApp();

    const res = await session.testAgent.get('/v1/human/contacts');

    expect(res.status).to.equal(200, JSON.stringify(res.body));
    const ada = (res.body.data as Array<{ id: string; channels: Array<Record<string, any>> }>).find(
      (contact) => contact.id === contactId
    );
    const whatsApp = ada?.channels.find((channel) => channel.via === 'whatsapp');
    expect(whatsApp?.window).to.include({ open: false });
    expect(whatsApp?.window.closesAt).to.be.a('string');
  });
});
