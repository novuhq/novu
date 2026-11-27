import { IntegrationRepository, SubscriberRepository } from '@novu/dal';
import { ChannelTypeEnum, InAppProviderIdEnum, UserSessionData } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import jwt, { JwtPayload } from 'jsonwebtoken';

const integrationRepository = new IntegrationRepository();
const subscriberRepository = new SubscriberRepository();

describe('Dashboard Inbox token - /environments/me/dashboard-inbox-token (POST) #novu-v2', () => {
  let session: UserSession;
  let previousFlag: string | undefined;

  beforeEach(async () => {
    previousFlag = process.env.IS_SUBSCRIBER_TOKENS_ENABLED;
    process.env.IS_SUBSCRIBER_TOKENS_ENABLED = 'true';
    session = new UserSession();
    await session.initialize();
    await requireHmac(session);
  });

  afterEach(() => {
    if (previousFlag === undefined) {
      delete process.env.IS_SUBSCRIBER_TOKENS_ENABLED;
    } else {
      process.env.IS_SUBSCRIBER_TOKENS_ENABLED = previousFlag;
    }
  });

  function requestToken() {
    return session.testAgent.post('/v1/environments/me/dashboard-inbox-token').send({});
  }

  async function openInbox() {
    const minted = await requestToken();
    expect(minted.status, JSON.stringify(minted.body)).to.equal(201);

    return session.testAgent.post('/v1/inbox/session').send({ subscriberToken: minted.body.data.token });
  }

  it('should sign the session user into an HMAC-protected Inbox with their dashboard profile', async () => {
    const sessionUser = jwt.decode(session.token.split(' ')[1]) as UserSessionData;

    const res = await openInbox();

    expect(res.status, JSON.stringify(res.body)).to.equal(201);
    const claims = jwt.decode(res.body.data.token) as JwtPayload;
    expect(claims.subscriberId).to.equal(session.user._id);
    expect(claims.environmentId).to.equal(session.environment._id);

    const stored = await subscriberRepository.findOne({
      _environmentId: session.environment._id,
      subscriberId: session.user._id,
    });
    expect(stored).to.include({
      firstName: sessionUser.firstName,
      lastName: sessionUser.lastName,
      email: sessionUser.email,
    });

    const feed = await session.testAgent
      .get('/v1/inbox/notifications')
      .set('Authorization', `Bearer ${res.body.data.token}`);
    expect(feed.status).to.equal(200);
  });

  it('should keep opening the Inbox after the environment API keys are regenerated', async () => {
    const before = await openInbox();
    expect(before.status, JSON.stringify(before.body)).to.equal(201);

    const regenerated = await session.testAgent.post('/v1/environments/api-keys/regenerate').send({});
    expect(regenerated.status).to.equal(201);
    expect(regenerated.body.data[0].key).to.not.equal(session.apiKey);

    const after = await openInbox();

    expect(after.status, JSON.stringify(after.body)).to.equal(201);
    expect((jwt.decode(after.body.data.token) as JwtPayload).subscriberId).to.equal(session.user._id);
  });

  it('should sign the subscriber of the environment the dashboard has selected', async () => {
    await session.switchToProdEnvironment();
    await requireHmac(session);

    const res = await openInbox();

    expect(res.status, JSON.stringify(res.body)).to.equal(201);
    expect(res.body.data.applicationIdentifier).to.equal(session.environment.identifier);
    expect((jwt.decode(res.body.data.token) as JwtPayload).environmentId).to.equal(session.environment._id);
  });

  it('should return 404 when subscriber tokens are disabled', async () => {
    process.env.IS_SUBSCRIBER_TOKENS_ENABLED = 'false';

    const res = await requestToken();

    expect(res.status).to.equal(404);
  });
});

async function requireHmac(session: UserSession) {
  await integrationRepository.update(
    {
      _environmentId: session.environment._id,
      _organizationId: session.environment._organizationId,
      providerId: InAppProviderIdEnum.Novu,
      channel: ChannelTypeEnum.IN_APP,
      active: true,
    },
    { $set: { 'credentials.hmac': true, active: true } }
  );
}
