import { IntegrationRepository } from '@novu/dal';
import { buildDashboardWebChatSubscriberId, ChannelTypeEnum, InAppProviderIdEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Inbox subscriber hash - /environments/me/inbox-subscriber-hash (GET) #novu-v2', () => {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should mint a hash that can initialize an HMAC inbox session', async () => {
    await setInAppHmac(session, true);

    const { body, status } = await session.testAgent.get(
      `/v1/environments/me/inbox-subscriber-hash?subscriberId=${encodeURIComponent(session.user._id)}`
    );

    expect(status).to.equal(200);
    expect(body.data.subscriberHash).to.be.a('string').and.not.empty;

    const sessionResponse = await session.testAgent.post('/v1/inbox/session').send({
      applicationIdentifier: session.environment.identifier,
      subscriberId: session.user._id,
      subscriberHash: body.data.subscriberHash,
    });

    expect(sessionResponse.status).to.equal(201);
    expect(sessionResponse.body.data.token).to.be.ok;
  });

  it('should mint a hash for the dashboard web-chat tester subscriber', async () => {
    await setInAppHmac(session, true);
    const webChatSubscriberId = buildDashboardWebChatSubscriberId(session.user._id);

    const { body, status } = await session.testAgent.get(
      `/v1/environments/me/inbox-subscriber-hash?subscriberId=${encodeURIComponent(webChatSubscriberId)}`
    );

    expect(status).to.equal(200);

    const sessionResponse = await session.testAgent.post('/v1/inbox/session').send({
      applicationIdentifier: session.environment.identifier,
      subscriberId: webChatSubscriberId,
      subscriberHash: body.data.subscriberHash,
    });

    expect(sessionResponse.status).to.equal(201);
    expect(sessionResponse.body.data.token).to.be.ok;
  });

  it('should reject subscriber ids that are not owned by the dashboard user', async () => {
    const { status } = await session.testAgent.get(
      `/v1/environments/me/inbox-subscriber-hash?subscriberId=${encodeURIComponent('someone-else')}`
    );

    expect(status).to.equal(403);
  });

  it('should not initialize an HMAC inbox session without a subscriberHash', async () => {
    await setInAppHmac(session, true);

    const sessionResponse = await session.testAgent.post('/v1/inbox/session').send({
      applicationIdentifier: session.environment.identifier,
      subscriberId: session.user._id,
    });

    expect(sessionResponse.status).to.equal(400);
    expect(sessionResponse.body.message).to.equal('Please provide a valid HMAC hash');
  });
});

async function setInAppHmac(session: UserSession, hmac: boolean) {
  const integrationRepository = new IntegrationRepository();

  await integrationRepository.update(
    {
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      providerId: InAppProviderIdEnum.Novu,
      channel: ChannelTypeEnum.IN_APP,
      active: true,
    },
    {
      $set: {
        'credentials.hmac': hmac,
        active: true,
      },
    }
  );
}
