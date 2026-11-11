import { encryptCredentials } from '@novu/application-generic';
import {
  AgentIntegrationRepository,
  ChannelEndpointRepository,
  HumanInteractionRepository,
  IntegrationRepository,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  ChatProviderIdEnum,
  ENDPOINT_TYPES,
  HumanInteractionKindEnum,
  HumanInteractionStatusEnum,
} from '@novu/shared';
import { testServer, UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { AgentConfigResolver } from '../../agents/channels/agent-config-resolver.service';
import { ChatInstanceRegistry } from '../../agents/conversation-runtime/ingress/chat-instance.registry';
import { AgentInboundHandler } from '../../agents/conversation-runtime/ingress/inbound-turn.handler';
import { AgentEventEnum } from '../../agents/shared/enums/agent-event.enum';
import { AGENT_INBOX_DASHBOARD_SECRET_HEADER } from '../guards/human-dashboard-secret.guard';

const integrationRepository = new IntegrationRepository();
const agentIntegrationRepository = new AgentIntegrationRepository();
const channelEndpointRepository = new ChannelEndpointRepository();
const humanInteractionRepository = new HumanInteractionRepository();

const DASHBOARD_SECRET = 'e2e-whatsapp-inbound-dashboard-secret';
const PHONE_NUMBER_ID = '1234';
const ADA_WA_ID = '15550100201';
const STRANGER_WA_ID = '15550100999';

/**
 * What comes back on WhatsApp: a contact's answer and button tap settle what was asked, matched by the number they
 * proved with a wa.me code, and a stranger is kept out, or shown by their number, as the agent's reach says.
 */
describe('Agent Inbox WhatsApp inbound #novu-v2', () => {
  const original = {
    flag: process.env.IS_AGENT_INBOX_WHATSAPP_ENABLED,
    secret: process.env.AGENT_INBOX_DASHBOARD_API_SECRET,
  };
  let session: UserSession;
  let operatorId: string;
  let relayAgentId: string;
  let whatsAppIdentifier: string;

  before(() => {
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
  });

  beforeEach(async () => {
    process.env.IS_AGENT_INBOX_WHATSAPP_ENABLED = 'true';
    process.env.AGENT_INBOX_DASHBOARD_API_SECRET = DASHBOARD_SECRET;
    session = new UserSession();
    await session.initialize();

    operatorId = `whatsapp-inbound-e2e-${Date.now()}`;
    const setupRes = await session.testAgent
      .post('/v1/human/setup')
      .send({ subscriberId: operatorId, operator: true, firstName: 'Ada' });
    expect(setupRes.status).to.equal(200, JSON.stringify(setupRes.body));
    relayAgentId = setupRes.body.data.agentId as string;

    const integration = await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      providerId: ChatProviderIdEnum.WhatsAppBusiness,
      channel: ChannelTypeEnum.CHAT,
      credentials: encryptCredentials({
        apiToken: 'EAAG-e2e-token',
        phoneNumberIdentification: PHONE_NUMBER_ID,
        businessAccountId: 'waba-1',
        from: '+1 555-010-0199',
        token: 'e2e-verify-token',
      } as never),
      active: true,
      identifier: `whatsapp-inbound-e2e-${Date.now()}`,
      priority: 1,
      primary: false,
      deleted: false,
    });
    whatsAppIdentifier = integration.identifier;
    await agentIntegrationRepository.create({
      _agentId: relayAgentId,
      _integrationId: integration._id,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    // Ada proved her number with a code.
    await channelEndpointRepository.create({
      identifier: `ce-whatsapp-inbound-e2e-${Date.now()}`,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      integrationIdentifier: whatsAppIdentifier,
      providerId: ChatProviderIdEnum.WhatsAppBusiness,
      channel: ChannelTypeEnum.CHAT,
      subscriberId: operatorId,
      contextKeys: [],
      type: ENDPOINT_TYPES.PHONE,
      endpoint: { phoneNumber: `+${ADA_WA_ID}`, provedAt: new Date().toISOString() },
    });
  });

  afterEach(async () => {
    for (const [key, value] of [
      ['IS_AGENT_INBOX_WHATSAPP_ENABLED', original.flag],
      ['AGENT_INBOX_DASHBOARD_API_SECRET', original.secret],
    ] as const) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    await testServer.getService(ChatInstanceRegistry).onModuleDestroy();
  });

  function asDashboard(method: 'get' | 'patch', path: string) {
    return session.testAgent[method](path)
      .set('Authorization', `ApiKey ${session.apiKey}`)
      .set(AGENT_INBOX_DASHBOARD_SECRET_HEADER, DASHBOARD_SECRET);
  }

  async function setReach(reach: 'anyone' | 'contacts') {
    const res = await asDashboard('patch', '/v1/human/agent').send({ reach });
    expect(res.status).to.equal(200, JSON.stringify(res.body));
  }

  async function operatorInbox() {
    const res = await asDashboard('get', '/v1/human/inbox').query({ senders: 'all' });
    expect(res.status).to.equal(200, JSON.stringify(res.body));

    return res.body.data as Array<Record<string, any>>;
  }

  async function relayConfig() {
    return testServer
      .getService(AgentConfigResolver)
      .resolve(relayAgentId, whatsAppIdentifier, { source: 'webhook_message' });
  }

  function whatsAppThread(waId: string) {
    const id = `whatsapp:${PHONE_NUMBER_ID}:${waId}`;

    return {
      id,
      channelId: `whatsapp:${PHONE_NUMBER_ID}`,
      isDM: true,
      toJSON: () => ({ id, channelId: `whatsapp:${PHONE_NUMBER_ID}`, isDM: true }),
      startTyping: async () => {},
      post: sinon.stub().resolves({ id: 'wamid.reply', threadId: id }),
    };
  }

  /** A WhatsApp message from `waId`, as the adapter hands it over; `quoting` is the message it swipe-replies to. */
  async function sendWhatsApp(text: string, waId: string, quoting?: string) {
    const thread = whatsAppThread(waId);
    const id = `wamid.${Math.random().toString(36).slice(2)}`;

    await testServer.getService(AgentInboundHandler).handle(
      relayAgentId,
      await relayConfig(),
      thread as any,
      {
        id,
        threadId: thread.id,
        text,
        author: { userId: waId, fullName: 'Someone', userName: waId, isBot: false },
        raw: { message: { id, from: waId, ...(quoting ? { context: { id: quoting } } : {}) }, userId: waId },
        attachments: [],
      } as any,
      AgentEventEnum.ON_MESSAGE
    );

    return thread;
  }

  async function pendingInteraction(kind: HumanInteractionKindEnum, platformMessageId: string) {
    return humanInteractionRepository.create({
      identifier: `hi_wa_${Math.random().toString(36).slice(2, 10)}`,
      kind,
      status: HumanInteractionStatusEnum.PENDING,
      content: { cardChrome: { title: kind === HumanInteractionKindEnum.ASK ? 'Which region?' : 'Deploy?' } },
      subscriberIds: [operatorId],
      _agentId: relayAgentId,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      deliveries: [
        {
          subscriberId: operatorId,
          integrationIdentifier: whatsAppIdentifier,
          platform: 'whatsapp',
          platformMessageId,
          platformThreadId: `whatsapp:${PHONE_NUMBER_ID}:${ADA_WA_ID}`,
        },
      ],
    } as never);
  }

  async function statusOf(identifier: string) {
    return (
      await humanInteractionRepository.findOne(
        { _environmentId: session.environment._id, identifier } as never,
        ['status', 'response'] as never
      )
    )?.status;
  }

  it('with contacts only, keeps a stranger out and lets in the contact who proved their number', async () => {
    await setReach('contacts');

    await sendWhatsApp('hi, who is this?', STRANGER_WA_ID);
    expect(await operatorInbox()).to.have.length(0);

    await sendWhatsApp('hello from Ada', ADA_WA_ID);
    const inbox = await operatorInbox();
    expect(inbox).to.have.length(1);
    expect(inbox[0].channel).to.equal('whatsapp');
  });

  it('with anyone, shows a stranger by their number', async () => {
    await setReach('anyone');

    await sendWhatsApp('hi, who is this?', STRANGER_WA_ID);

    const [thread] = await operatorInbox();
    expect(thread.channel).to.equal('whatsapp');
    expect(thread.from).to.equal(`+${STRANGER_WA_ID}`);
  });

  it('settles a question with the answer that swipe-replies to it', async () => {
    const ask = await pendingInteraction(HumanInteractionKindEnum.ASK, 'wamid.question');

    await sendWhatsApp('eu-west', ADA_WA_ID, 'wamid.question');

    expect(await statusOf(ask.identifier)).to.equal(HumanInteractionStatusEnum.ANSWERED);
  });

  it('settles an approve with a tap on its button', async () => {
    await setReach('contacts');
    const approve = await pendingInteraction(HumanInteractionKindEnum.APPROVE, 'wamid.approve');
    const thread = whatsAppThread(ADA_WA_ID);

    await testServer
      .getService(AgentInboundHandler)
      .handleAction(
        relayAgentId,
        await relayConfig(),
        thread as any,
        { id: `human:${approve.identifier}:approve`, sourceMessageId: 'wamid.approve' },
        ADA_WA_ID,
        { id: 'wamid.tap', from: ADA_WA_ID }
      );

    expect(await statusOf(approve.identifier)).to.equal(HumanInteractionStatusEnum.APPROVED);
  });
});
