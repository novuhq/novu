import { encryptCredentials } from '@novu/application-generic';
import { AgentIntegrationRepository, ConversationStatusEnum, IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum } from '@novu/shared';
import { testServer, UserSession } from '@novu/testing';
import { expect } from 'chai';
import { ChatInstanceRegistry } from '../conversation-runtime/ingress/chat-instance.registry';
import { activityRepository, conversationRepository } from './helpers/agent-test-setup';
import { startTelegramApiStub, type TelegramApiStub } from './helpers/telegram-api-stub';

const TELEGRAM_MESSAGE_LIMIT = 4096;
const TELEGRAM_CHAT_ID = 777_050;

describe('Agent Reply - long Telegram reply #novu-v2', () => {
  let session: UserSession;
  let agentIdentifier: string;
  let integrationIdentifier: string;
  let conversationId: string;
  let telegramApiStub: TelegramApiStub;

  before(async () => {
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
    telegramApiStub = await startTelegramApiStub();
  });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    agentIdentifier = `e2e-tg-long-${Date.now()}`;
    const createRes = await session.testAgent.post('/v1/agents').send({
      name: 'Telegram Long Reply E2E',
      identifier: agentIdentifier,
    });
    const agentId = createRes.body.data._id as string;

    const integration = await new IntegrationRepository().create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      providerId: ChatProviderIdEnum.Telegram,
      channel: ChannelTypeEnum.CHAT,
      credentials: encryptCredentials({ apiToken: '12345678:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', token: 'secret' }),
      active: true,
      identifier: `telegram-long-e2e-${Date.now()}`,
      priority: 1,
      primary: false,
      deleted: false,
    });
    integrationIdentifier = integration.identifier;

    await new AgentIntegrationRepository().create({
      _agentId: agentId,
      _integrationId: integration._id,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    const conversation = await conversationRepository.create({
      identifier: `conv-tg-long-${Date.now()}`,
      _agentId: agentId,
      participants: [
        { type: 'agent' as const, id: agentId },
        { type: 'platform_user' as const, id: `telegram:${TELEGRAM_CHAT_ID}` },
      ],
      channels: [
        {
          platform: 'telegram',
          _integrationId: integration._id,
          platformThreadId: `telegram:${TELEGRAM_CHAT_ID}`,
        },
      ],
      status: ConversationStatusEnum.ACTIVE,
      title: 'Telegram long reply',
      metadata: {},
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      lastActivityAt: new Date().toISOString(),
    });
    conversationId = conversation._id;
  });

  afterEach(async () => {
    await testServer.getService(ChatInstanceRegistry).onModuleDestroy();
    telegramApiStub.reset();
  });

  it('delivers a reply over the Telegram limit in full, as consecutive messages', async () => {
    const paragraphs = Array.from(
      { length: 60 },
      (_, i) => `Paragraph ${String(i + 1).padStart(2, '0')}: ${'notification copy that keeps going '.repeat(3)}`
    );
    const markdown = paragraphs.join('\n\n');
    expect(markdown.length).to.be.greaterThan(TELEGRAM_MESSAGE_LIMIT);

    const res = await session.testAgent.post(`/v1/agents/${agentIdentifier}/reply`).send({
      conversationId,
      integrationIdentifier,
      reply: { markdown },
    });

    expect(res.status, JSON.stringify(res.body)).to.equal(200);

    const sent = telegramApiStub.calls
      .filter((call) => call.method === 'sendMessage' && String(call.payload.chat_id) === String(TELEGRAM_CHAT_ID))
      .map((call) => String(call.payload.text));

    expect(sent.length).to.be.greaterThan(1);
    for (const text of sent) {
      expect(text.length).to.be.at.most(TELEGRAM_MESSAGE_LIMIT);
    }

    const delivered = sent.join('\n');
    const positions = paragraphs.map((p) => delivered.indexOf(p.slice(0, 'Paragraph 00'.length)));
    expect(positions).to.not.include(-1);
    expect(positions).to.deep.equal([...positions].sort((a, b) => a - b));

    const activities = await activityRepository.findByConversation(session.environment._id, conversationId);
    const agentMessage = activities.find((a) => a.senderType === 'agent' && a.type === 'message');
    expect(agentMessage?.content).to.equal(markdown);
  });
});
