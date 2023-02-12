import { SubscriberRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Get in-app activated - /organization/in-app/activated (GET)', async () => {
  let session: UserSession;
  let otherSession: UserSession;

  const subscriberRepository = new SubscriberRepository();

  before(async () => {
    session = new UserSession();
    await session.initialize();

    otherSession = new UserSession();
    await otherSession.initialize({
      noOrganization: true,
    });
  });

  it('should get in app activated falsy on organization set up', async () => {
    const { body } = await session.testAgent.get('/v1/organizations/in-app/activated').expect(200);

    expect(JSON.stringify(body.data)).to.equal('false');
  });

  it('should get in app activated falsy on organization set up after CLI onboarding', async () => {
    await subscriberRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      subscriberId: 'cli-123',
      isOnline: true,
      lastOnlineAt: new Date().toISOString(),
    });

    const { body } = await session.testAgent.get('/v1/organizations/in-app/activated').expect(200);

    expect(JSON.stringify(body.data)).to.equal('false');
  });

  it('should get in app activated truthy on in-app set up', async () => {
    await subscriberRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      subscriberId: '123',
      isOnline: true,
      lastOnlineAt: new Date().toISOString(),
    });

    const { body } = await session.testAgent.get('/v1/organizations/in-app/activated').expect(200);

    expect(JSON.stringify(body.data)).to.equal('true');
  });

  it('should get in app activated truthy on in-app set up after CLI onboarding', async () => {
    await subscriberRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      subscriberId: '123',
      isOnline: true,
      lastOnlineAt: new Date().toISOString(),
    });

    await subscriberRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      subscriberId: 'cli-123',
      isOnline: false,
      lastOnlineAt: new Date().toISOString(),
    });

    const { body } = await session.testAgent.get('/v1/organizations/in-app/activated').expect(200);

    expect(JSON.stringify(body.data)).to.equal('true');
  });
});
