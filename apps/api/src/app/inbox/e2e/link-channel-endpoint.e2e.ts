import { IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum } from '@novu/shared';
import { testServer, UserSession } from '@novu/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { IssueTelegramSubscriberLink } from '../../telegram-linking/issue-telegram-subscriber-link/issue-telegram-subscriber-link.usecase';

const integrationRepository = new IntegrationRepository();

describe('Inbox - link channel endpoint - POST /v1/inbox/channel-endpoints/link #novu-v2', () => {
  let session: UserSession;
  let subscriberToken: string;
  let issueTelegramSubscriberLinkStub: sinon.SinonStub | undefined;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    const inboxSession = await session.testAgent.post('/v1/inbox/session').send({
      applicationIdentifier: session.environment.identifier,
      subscriberId: session.subscriberId,
    });
    expect(inboxSession.status).to.equal(201);
    subscriberToken = inboxSession.body.data.token;
  });

  afterEach(() => {
    issueTelegramSubscriberLinkStub?.restore();
    issueTelegramSubscriberLinkStub = undefined;
  });

  async function createTelegramIntegration(): Promise<string> {
    const identifier = `telegram-link-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      providerId: ChatProviderIdEnum.Telegram,
      channel: ChannelTypeEnum.CHAT,
      credentials: {},
      active: true,
      identifier,
    });

    return identifier;
  }

  async function createSlackIntegration(): Promise<string> {
    const identifier = `slack-link-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      providerId: ChatProviderIdEnum.Slack,
      channel: ChannelTypeEnum.CHAT,
      credentials: {},
      active: true,
      identifier,
    });

    return identifier;
  }

  function linkChannelEndpoint(integrationIdentifier: string, token = subscriberToken) {
    return session.testAgent
      .post('/v1/inbox/channel-endpoints/link')
      .set('Authorization', `Bearer ${token}`)
      .send({ integrationIdentifier });
  }

  it('issues a Telegram deep link for the authenticated subscriber', async () => {
    const integrationIdentifier = await createTelegramIntegration();

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const usecase = testServer.getService(IssueTelegramSubscriberLink);
    issueTelegramSubscriberLinkStub = sinon.stub(usecase, 'execute').resolves({
      deepLinkUrl: 'https://t.me/TestBot?start=abc123',
      botUsername: 'TestBot',
      expiresAt,
    });

    const response = await linkChannelEndpoint(integrationIdentifier);

    expect(response.status).to.equal(200);
    expect(response.body.data.url).to.equal('https://t.me/TestBot?start=abc123');
    expect(response.body.data.providerMetadata).to.deep.equal({
      botUsername: 'TestBot',
      expiresAt,
    });

    // The subscriber identity must be derived from the session token, never the body.
    expect(issueTelegramSubscriberLinkStub.calledOnce).to.equal(true);
    const command = issueTelegramSubscriberLinkStub.firstCall.args[0];
    expect(command.subscriberId).to.equal(session.subscriberId);
    expect(command.integrationIdentifier).to.equal(integrationIdentifier);
    expect(command.environmentId).to.equal(session.environment._id);
    expect(command.organizationId).to.equal(session.organization._id);
  });

  it('rejects non-Telegram providers with 400', async () => {
    const integrationIdentifier = await createSlackIntegration();

    const response = await linkChannelEndpoint(integrationIdentifier);

    expect(response.status).to.equal(400);
    expect(response.body.message).to.match(/does not support subscriber chat linking/i);
  });

  it('returns 404 when the integration does not exist', async () => {
    const response = await linkChannelEndpoint(`missing-${Date.now()}`);

    expect(response.status).to.equal(404);
  });

  it('requires a subscriber JWT', async () => {
    const integrationIdentifier = await createTelegramIntegration();

    const response = await session.testAgent
      .post('/v1/inbox/channel-endpoints/link')
      .send({ integrationIdentifier });

    expect(response.status).to.equal(401);
  });
});
