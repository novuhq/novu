import { encryptCredentials } from '@novu/application-generic';
import { AgentIntegrationRepository, ChannelEndpointRepository, IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum, ENDPOINT_TYPES } from '@novu/shared';
import { UserSession } from '@novu/testing';
import axios from 'axios';
import { expect } from 'chai';
import { startTelegramApiStub, type TelegramApiStub } from '../../agents/e2e/helpers/telegram-api-stub';

const integrationRepository = new IntegrationRepository();
const agentIntegrationRepository = new AgentIntegrationRepository();
const channelEndpointRepository = new ChannelEndpointRepository();

describe('Human invites (invite link → page → connect) #novu-v2', () => {
  let session: UserSession;
  let telegramApiStub: TelegramApiStub;
  let subscriberId: string;
  let relayAgentId: string;
  let telegramIdentifier: string;
  let slackIdentifier: string;

  before(async () => {
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
    telegramApiStub = await startTelegramApiStub();
  });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    telegramApiStub.reset();

    subscriberId = `invitee-${Date.now()}`;
    const setupRes = await session.testAgent.post('/v1/human/setup').send({ subscriberId });
    expect(setupRes.status).to.equal(200, JSON.stringify(setupRes.body));
    relayAgentId = setupRes.body.data.agentId as string;
  });

  async function linkChannel(providerId: ChatProviderIdEnum, credentials: Record<string, string>) {
    const integration = await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      providerId,
      channel: ChannelTypeEnum.CHAT,
      credentials: encryptCredentials(credentials),
      active: true,
      identifier: `${providerId}-invite-e2e-${Date.now()}`,
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

  async function linkTelegramAndSlack() {
    telegramIdentifier = await linkChannel(ChatProviderIdEnum.Telegram, {
      apiToken: '12345678:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      token: 'e2e-invite-telegram-secret',
    });
    slackIdentifier = await linkChannel(ChatProviderIdEnum.Slack, {
      clientId: 'e2e-slack-client',
      secretKey: 'e2e-slack-secret',
    });
  }

  /** Stands in for the person finishing `/start` in Telegram or the Slack OAuth callback. */
  async function connectEndpoint(integrationIdentifier: string, type: 'telegram' | 'slack') {
    await channelEndpointRepository.create({
      identifier: `ce-invite-e2e-${type}-${Date.now()}`,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      integrationIdentifier,
      providerId: type === 'telegram' ? ChatProviderIdEnum.Telegram : ChatProviderIdEnum.Slack,
      channel: ChannelTypeEnum.CHAT,
      subscriberId,
      contextKeys: [],
      type: type === 'telegram' ? ENDPOINT_TYPES.TELEGRAM_CHAT : ENDPOINT_TYPES.SLACK_USER,
      endpoint: type === 'telegram' ? { chatId: '777002' } : { userId: `U${Date.now()}` },
    });
  }

  async function createInvite(body: Record<string, unknown> = {}) {
    const res = await session.testAgent.post('/v1/human/invites').send({ subscriberId, ...body });
    expect(res.status).to.equal(201, JSON.stringify(res.body));

    const data = res.body.data as {
      url: string;
      expiresAt: string;
      channels: Array<{ via: string; connected: boolean }>;
    };

    return { ...data, token: data.url.split('/').pop() as string };
  }

  async function getStatus(token: string) {
    const res = await session.testAgent.get(`/v1/human/invites/status?token=${token}`);
    expect(res.status).to.equal(200, JSON.stringify(res.body));

    return res.body.data;
  }

  it('creates a dashboard invite link that offers every chat app the inviter set up', async () => {
    await linkTelegramAndSlack();

    const invite = await createInvite({ firstName: 'Alice', lastName: 'Chen' });

    expect(invite.url).to.match(/^http:\/\/127\.0\.0\.1:4300\/invite\/[A-Za-z0-9]{32}$/);
    expect(Date.parse(invite.expiresAt) - Date.now()).to.be.greaterThan(2 * 24 * 60 * 60 * 1000);
    expect(invite.channels.map(({ via, connected }) => ({ via, connected }))).to.deep.equal([
      { via: 'telegram', connected: false },
      { via: 'slack', connected: false },
    ]);

    expect(await getStatus(invite.token)).to.deep.include({
      valid: true,
      agentName: 'Human',
      inviteeName: 'Alice Chen',
      channels: [
        { via: 'telegram', connected: false, isDefault: false },
        { via: 'slack', connected: false, isDefault: false },
      ],
    });
  });

  it('serves the page endpoints without a login while creating an invite still needs one', async () => {
    await linkTelegramAndSlack();
    const invite = await createInvite();
    const anonymous = axios.create({ baseURL: session.serverUrl, validateStatus: () => true });

    const status = await anonymous.get(`/v1/human/invites/status?token=${invite.token}`);
    expect(status.status).to.equal(200, JSON.stringify(status.data));
    expect(status.data.data.valid).to.equal(true);

    const create = await anonymous.post('/v1/human/invites', { subscriberId });
    expect(create.status).to.equal(401);
  });

  it('offers only the apps that are set up', async () => {
    telegramIdentifier = await linkChannel(ChatProviderIdEnum.Telegram, {
      apiToken: '12345678:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      token: 'e2e-invite-telegram-secret',
    });
    const invite = await createInvite();

    const status = await getStatus(invite.token);
    expect(status.channels).to.deep.equal([{ via: 'telegram', connected: false, isDefault: false }]);

    const res = await session.testAgent.post('/v1/human/invites/connect').send({ token: invite.token, via: 'slack' });
    expect(res.status).to.equal(400);
    expect(res.body.code).to.equal('channel_unavailable');
  });

  it('refuses to create an invite before Telegram or Slack is set up', async () => {
    const res = await session.testAgent.post('/v1/human/invites').send({ subscriberId });

    expect(res.status).to.equal(404);
    expect(res.body.message).to.include('human setup telegram');
  });

  it('mints fresh Telegram and Slack connect links from the page', async () => {
    await linkTelegramAndSlack();
    const invite = await createInvite();

    const telegram = await session.testAgent
      .post('/v1/human/invites/connect')
      .send({ token: invite.token, via: 'telegram' });
    expect(telegram.status).to.equal(200, JSON.stringify(telegram.body));
    expect(telegram.body.data.url).to.match(/^https:\/\/t\.me\/novu_e2e_bot\?start=[A-Za-z0-9]{32}$/);

    const slack = await session.testAgent.post('/v1/human/invites/connect').send({ token: invite.token, via: 'slack' });
    expect(slack.status).to.equal(200, JSON.stringify(slack.body));
    const slackUrl = new URL(slack.body.data.url);
    expect(slackUrl.origin + slackUrl.pathname).to.equal('https://slack.com/oauth/v2/authorize');
    expect(slackUrl.searchParams.get('client_id')).to.equal('e2e-slack-client');
  });

  it('lets the person connect several apps, keeps the first as default, and switch it', async () => {
    await linkTelegramAndSlack();
    const invite = await createInvite();

    await connectEndpoint(telegramIdentifier, 'telegram');
    await connectEndpoint(slackIdentifier, 'slack');

    let status = await getStatus(invite.token);
    expect(status.channels).to.deep.equal([
      { via: 'telegram', connected: true, isDefault: true },
      { via: 'slack', connected: true, isDefault: false },
    ]);

    const again = await session.testAgent
      .post('/v1/human/invites/connect')
      .send({ token: invite.token, via: 'telegram' });
    expect(again.status).to.equal(409);
    expect(again.body.code).to.equal('channel_already_connected');

    const setDefault = await session.testAgent
      .post('/v1/human/invites/default')
      .send({ token: invite.token, via: 'slack' });
    expect(setDefault.status).to.equal(200, JSON.stringify(setDefault.body));

    // The inviter's --via must not override the person's own choice.
    await session.testAgent.post('/v1/human/setup').send({ subscriberId, defaultVia: 'telegram' });

    status = await getStatus(invite.token);
    expect(status.channels).to.deep.equal([
      { via: 'telegram', connected: true, isDefault: false },
      { via: 'slack', connected: true, isDefault: true },
    ]);
  });

  it("uses the inviter's --via as the default until the person picks their own", async () => {
    await linkTelegramAndSlack();
    await session.testAgent.post('/v1/human/setup').send({ subscriberId, defaultVia: 'slack' });
    const invite = await createInvite();

    await connectEndpoint(telegramIdentifier, 'telegram');
    await connectEndpoint(slackIdentifier, 'slack');

    const status = await getStatus(invite.token);
    expect(status.channels).to.deep.equal([
      { via: 'telegram', connected: true, isDefault: false },
      { via: 'slack', connected: true, isDefault: true },
    ]);
  });

  it('only lets an app that is connected become the default', async () => {
    await linkTelegramAndSlack();
    const invite = await createInvite();

    const res = await session.testAgent.post('/v1/human/invites/default').send({ token: invite.token, via: 'slack' });

    expect(res.status).to.equal(400);
    expect(res.body.code).to.equal('channel_not_connected');
  });

  it('declines before anything is connected and then refuses further actions', async () => {
    await linkTelegramAndSlack();
    const invite = await createInvite();

    const decline = await session.testAgent.post('/v1/human/invites/decline').send({ token: invite.token });
    expect(decline.status).to.equal(200, JSON.stringify(decline.body));

    expect(await getStatus(invite.token)).to.deep.equal({ valid: false, reason: 'declined' });

    const connect = await session.testAgent
      .post('/v1/human/invites/connect')
      .send({ token: invite.token, via: 'telegram' });
    expect(connect.status).to.equal(409);
    expect(connect.body.code).to.equal('invite_declined');
  });

  it('does not let a connected person decline', async () => {
    await linkTelegramAndSlack();
    const invite = await createInvite();
    await connectEndpoint(telegramIdentifier, 'telegram');

    const res = await session.testAgent.post('/v1/human/invites/decline').send({ token: invite.token });

    expect(res.status).to.equal(409);
    expect(res.body.code).to.equal('channel_already_connected');
  });

  it('reports unknown and malformed tokens', async () => {
    expect(await getStatus('a'.repeat(32))).to.deep.equal({ valid: false, reason: 'expired' });
    expect(await getStatus('nope')).to.deep.equal({ valid: false, reason: 'invalid' });
  });
});
