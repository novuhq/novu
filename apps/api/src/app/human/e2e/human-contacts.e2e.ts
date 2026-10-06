import { encryptCredentials } from '@novu/application-generic';
import {
  AgentIntegrationRepository,
  ChannelEndpointRepository,
  HumanContactRepository,
  IntegrationRepository,
  SubscriberRepository,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  ChatProviderIdEnum,
  EmailProviderIdEnum,
  ENDPOINT_TYPES,
  HumanInteractionStatusEnum,
} from '@novu/shared';
import { testServer, UserSession } from '@novu/testing';
import axios from 'axios';
import { expect } from 'chai';
import { ChatInstanceRegistry } from '../../agents/conversation-runtime/ingress/chat-instance.registry';
import { startTelegramApiStub, type TelegramApiStub } from '../../agents/e2e/helpers/telegram-api-stub';

const subscriberRepository = new SubscriberRepository();
const integrationRepository = new IntegrationRepository();
const agentIntegrationRepository = new AgentIntegrationRepository();
const channelEndpointRepository = new ChannelEndpointRepository();
const humanContactRepository = new HumanContactRepository();

describe('Human contacts (setup names → list → remove) #novu-v2', () => {
  let session: UserSession;
  let telegramApiStub: TelegramApiStub;

  before(async () => {
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
    telegramApiStub = await startTelegramApiStub();
  });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    telegramApiStub.reset();
  });

  afterEach(async () => {
    await testServer.getService(ChatInstanceRegistry).onModuleDestroy();
  });

  async function setup(body: Record<string, unknown>) {
    const res = await session.testAgent.post('/v1/human/setup').send(body);
    expect(res.status).to.equal(200, JSON.stringify(res.body));

    return res.body.data as { subscriberId: string; agentId: string };
  }

  async function findSubscriber(subscriberId: string) {
    return subscriberRepository.findOne({ subscriberId, _environmentId: session.environment._id });
  }

  /** Links an integration to an agent, the way `human setup <channel>` does for the relay. */
  async function linkIntegration(
    agentId: string,
    integration: { providerId: string; channel: ChannelTypeEnum; credentials?: Record<string, string> }
  ) {
    const created = await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      providerId: integration.providerId,
      channel: integration.channel,
      credentials: encryptCredentials(integration.credentials ?? {}),
      active: true,
      identifier: `${integration.providerId}-contacts-e2e-${Date.now()}`,
      priority: 1,
      primary: false,
      deleted: false,
    });

    await linkExistingIntegration(agentId, created._id);

    return created;
  }

  async function linkExistingIntegration(agentId: string, integrationId: string) {
    await agentIntegrationRepository.create({
      _agentId: agentId,
      _integrationId: integrationId,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });
  }

  function linkTelegram(agentId: string) {
    return linkIntegration(agentId, {
      providerId: ChatProviderIdEnum.Telegram,
      channel: ChannelTypeEnum.CHAT,
      credentials: { apiToken: '12345678:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', token: 'e2e-contacts-telegram-secret' },
    });
  }

  /** Stands in for the person finishing `/start` in Telegram. */
  async function connectTelegram(subscriberId: string, integrationIdentifier: string) {
    await channelEndpointRepository.create({
      identifier: `ce-contacts-e2e-${subscriberId}-${Date.now()}`,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      integrationIdentifier,
      providerId: ChatProviderIdEnum.Telegram,
      channel: ChannelTypeEnum.CHAT,
      subscriberId,
      contextKeys: [],
      type: ENDPOINT_TYPES.TELEGRAM_CHAT,
      endpoint: { chatId: '777003' },
    });
  }

  function findTelegramEndpoint(subscriberId: string, integrationIdentifier: string) {
    return channelEndpointRepository.findOne({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      subscriberId,
      integrationIdentifier,
    });
  }

  async function createInvite(subscriberId: string) {
    const res = await session.testAgent.post('/v1/human/invites').send({ subscriberId });
    expect(res.status).to.equal(201, JSON.stringify(res.body));

    return res.body.data as { url: string; expiresAt: string };
  }

  async function listContacts() {
    const res = await session.testAgent.get('/v1/human/contacts');
    expect(res.status).to.equal(200, JSON.stringify(res.body));

    return new Map((res.body.data as Array<Record<string, any>>).map((row) => [row.id as string, row]));
  }

  describe('POST /v1/human/setup names', () => {
    it('creates the subscriber with firstName and lastName', async () => {
      const subscriberId = `contact-${Date.now()}`;
      await setup({ subscriberId, firstName: 'Alice', lastName: 'Chen' });

      const subscriber = await findSubscriber(subscriberId);
      expect(subscriber?.firstName).to.equal('Alice');
      expect(subscriber?.lastName).to.equal('Chen');
    });

    it('replaces the name on re-setup and keeps it when omitted', async () => {
      const subscriberId = `contact-${Date.now()}`;
      await setup({ subscriberId, firstName: 'Alice' });
      await setup({ subscriberId, firstName: 'Alicia', lastName: 'Chen' });

      let subscriber = await findSubscriber(subscriberId);
      expect(subscriber?.firstName).to.equal('Alicia');
      expect(subscriber?.lastName).to.equal('Chen');

      await setup({ subscriberId });
      subscriber = await findSubscriber(subscriberId);
      expect(subscriber?.firstName).to.equal('Alicia');
      expect(subscriber?.lastName).to.equal('Chen');
    });
  });

  describe('GET /v1/human/contacts', () => {
    it('lists every subscriber in the environment with only contact fields', async () => {
      const stamp = Date.now();
      await setup({ subscriberId: `alice-${stamp}`, firstName: 'Alice', lastName: 'Chen' });
      await setup({ subscriberId: `bob-${stamp}`, email: 'bob@example.com' });
      await subscriberRepository.create({
        subscriberId: `carol-${stamp}`,
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        phone: '+15550000000',
        data: { role: 'on-call' },
      });

      const res = await session.testAgent.get('/v1/human/contacts');
      expect(res.status).to.equal(200, JSON.stringify(res.body));

      const rows = res.body.data as Array<Record<string, unknown>>;
      const byId = new Map(rows.map((row) => [row.id as string, row]));
      expect(byId.has(`alice-${stamp}`)).to.equal(true);
      expect(byId.has(`bob-${stamp}`)).to.equal(true);
      expect(byId.has(`carol-${stamp}`)).to.equal(true);

      const alice = byId.get(`alice-${stamp}`);
      expect(alice?.firstName).to.equal('Alice');
      expect(alice?.lastName).to.equal('Chen');
      expect(byId.get(`bob-${stamp}`)?.email).to.equal('bob@example.com');

      const carol = byId.get(`carol-${stamp}`);
      expect(carol?.phone).to.equal('+15550000000');
      expect(carol?.data).to.deep.equal({ role: 'on-call' });
      expect(carol?.createdAt).to.be.a('string');
      expect(carol?.updatedAt).to.be.a('string');

      // Nobody connected a channel or was sent a link yet.
      expect(carol?.channels).to.deep.equal([]);
      expect(carol?.status).to.equal('invite_sent');
      expect(carol).to.not.have.property('defaultVia');
      expect(carol).to.not.have.property('invite');

      const allowedKeys = new Set([
        'id',
        'firstName',
        'lastName',
        'email',
        'phone',
        'data',
        'channels',
        'defaultVia',
        'status',
        'invite',
        'createdAt',
        'updatedAt',
      ]);
      for (const row of rows) {
        for (const key of Object.keys(row)) {
          expect(allowedKeys.has(key), `unexpected contact field "${key}"`).to.equal(true);
        }
      }
    });

    it('pages with limit and after', async () => {
      const stamp = Date.now();
      await setup({ subscriberId: `p1-${stamp}` });
      await setup({ subscriberId: `p2-${stamp}` });

      const first = await session.testAgent.get('/v1/human/contacts').query({ limit: 1 });
      expect(first.status).to.equal(200);
      expect(first.body.data).to.have.length(1);
      expect(first.body.next).to.be.a('string');

      const second = await session.testAgent.get('/v1/human/contacts').query({ limit: 1, after: first.body.next });
      expect(second.status).to.equal(200);
      expect(second.body.data).to.have.length(1);
      expect(second.body.data[0].id).to.not.equal(first.body.data[0].id);
    });

    it('returns an empty page for a malformed cursor', async () => {
      const res = await session.testAgent.get('/v1/human/contacts').query({ after: 'not-a-cursor' });
      expect(res.status).to.equal(200);
      expect(res.body.data).to.deep.equal([]);
      expect(res.body.next).to.equal(null);
    });

    it('reports channels, the default channel, the status and the pending invite', async () => {
      const stamp = Date.now();
      const joinedId = `joined-${stamp}`;
      const invitedId = `invited-${stamp}`;
      const emailId = `email-${stamp}`;

      const { agentId } = await setup({ subscriberId: joinedId });
      await setup({ subscriberId: invitedId });
      await setup({ subscriberId: emailId, email: 'erin@example.com' });

      const telegram = await linkTelegram(agentId);
      await linkIntegration(agentId, { providerId: EmailProviderIdEnum.NovuAgent, channel: ChannelTypeEnum.EMAIL });
      await connectTelegram(joinedId, telegram.identifier);
      const invite = await createInvite(invitedId);

      const contacts = await listContacts();

      const joined = contacts.get(joinedId);
      expect(joined?.status).to.equal('joined');
      expect(joined?.defaultVia).to.equal('telegram');
      expect(joined?.channels).to.have.length(1);
      expect(joined?.channels[0]).to.deep.include({ via: 'telegram', isDefault: true });
      expect(joined?.channels[0].connectedAt).to.be.a('string');
      expect(joined).to.not.have.property('invite');

      const invited = contacts.get(invitedId);
      expect(invited?.status).to.equal('invite_sent');
      expect(invited?.channels).to.deep.equal([]);
      expect(invited).to.not.have.property('defaultVia');
      expect(invited?.invite).to.deep.equal({ url: invite.url, expiresAt: invite.expiresAt });

      const email = contacts.get(emailId);
      expect(email?.status).to.equal('joined');
      expect(email?.defaultVia).to.equal('email');
      expect(email?.channels).to.deep.equal([{ via: 'email', isDefault: true }]);
    });

    it('shows the newest invite link that still works', async () => {
      const subscriberId = `invitee-${Date.now()}`;
      const { agentId } = await setup({ subscriberId });
      await linkTelegram(agentId);

      const older = await createInvite(subscriberId);
      const newest = await createInvite(subscriberId);

      expect((await listContacts()).get(subscriberId)?.invite?.url).to.equal(newest.url);

      const decline = await session.testAgent
        .post('/v1/human/invites/decline')
        .send({ token: newest.url.split('/').pop() });
      expect(decline.status).to.equal(200, JSON.stringify(decline.body));

      expect((await listContacts()).get(subscriberId)?.invite?.url).to.equal(older.url);
    });
  });

  describe('DELETE /v1/human/contacts/:subscriberId', () => {
    async function inviteStatus(inviteUrl: string) {
      const res = await session.testAgent.get(`/v1/human/invites/status?token=${inviteUrl.split('/').pop()}`);
      expect(res.status).to.equal(200, JSON.stringify(res.body));

      return res.body.data;
    }

    it('cancels open interactions, retires the invite link and deletes the contact', async () => {
      const subscriberId = `removed-${Date.now()}`;
      const { agentId } = await setup({ subscriberId, firstName: 'Rae', email: 'rae@example.com' });
      const telegram = await linkTelegram(agentId);
      const invite = await createInvite(subscriberId);
      await connectTelegram(subscriberId, telegram.identifier);
      await setup({ subscriberId, defaultVia: 'telegram' });

      const created = await session.testAgent
        .post('/v1/human/interactions')
        .send({ kind: 'approve', to: subscriberId, via: 'telegram', card: { title: 'Ship it?' } });
      expect(created.status).to.equal(201, JSON.stringify(created.body));
      const interactionId = created.body.data.id as string;

      const res = await session.testAgent.delete(`/v1/human/contacts/${subscriberId}`);
      expect(res.status).to.equal(200, JSON.stringify(res.body));
      expect(res.body.data).to.deep.equal({ id: subscriberId, canceledInteractions: 1 });

      const interaction = await session.testAgent.get(`/v1/human/interactions/${interactionId}`);
      expect(interaction.body.data.status).to.equal(HumanInteractionStatusEnum.CANCELED);

      expect(await findTelegramEndpoint(subscriberId, telegram.identifier)).to.equal(null);
      expect(await humanContactRepository.findContact(session.environment._id, agentId, subscriberId)).to.equal(null);
      expect(await inviteStatus(invite.url)).to.deep.equal({ valid: false, reason: 'declined' });

      expect(await findSubscriber(subscriberId)).to.equal(null);
      expect((await listContacts()).has(subscriberId)).to.equal(false);

      const again = await session.testAgent.delete(`/v1/human/contacts/${subscriberId}`);
      expect(again.status).to.equal(404);
    });

    it('removes a contact who never connected or was asked anything', async () => {
      const subscriberId = `quiet-${Date.now()}`;
      await setup({ subscriberId });

      const res = await session.testAgent.delete(`/v1/human/contacts/${subscriberId}`);
      expect(res.status).to.equal(200, JSON.stringify(res.body));
      expect(res.body.data).to.deep.equal({ id: subscriberId, canceledInteractions: 0 });
      expect(await findSubscriber(subscriberId)).to.equal(null);
    });

    it('answers 404 for someone who is not a contact', async () => {
      const res = await session.testAgent.delete(`/v1/human/contacts/nobody-${Date.now()}`);

      expect(res.status).to.equal(404);
    });

    it('needs a login', async () => {
      const subscriberId = `guarded-${Date.now()}`;
      await setup({ subscriberId });

      const anonymous = axios.create({ baseURL: session.serverUrl, validateStatus: () => true });
      const res = await anonymous.delete(`/v1/human/contacts/${subscriberId}`);

      expect(res.status).to.equal(401);
      expect(await findSubscriber(subscriberId)).to.not.equal(null);
    });
  });
});
