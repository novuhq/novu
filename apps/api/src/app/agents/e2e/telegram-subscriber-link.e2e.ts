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
import { AgentInboundHandler } from '../conversation-runtime/ingress/inbound-turn.handler';
import { AgentEventEnum } from '../shared/enums/agent-event.enum';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';

const integrationRepository = new IntegrationRepository();
const agentIntegrationRepository = new AgentIntegrationRepository();
const subscriberRepository = new SubscriberRepository();
const channelEndpointRepository = new ChannelEndpointRepository();

describe('Telegram subscriber start link (cache + inbound) #novu-v2', () => {
  let session: UserSession;
  let agentId: string;
  let agentIdentifier: string;
  let integrationId: string;
  let integrationIdentifier: string;
  let subscriberId: string;

  before(() => {
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
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
        token: 'e2e-telegram-secret-token',
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
      agentIdentifier,
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
});
