import { SubscriberRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Get in-app activated - /integrations/in-app/activated (GET)', async () => {
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
    const { body } = await session.testAgent.get('/v1/integrations/in-app/status').expect(200);

    expect(body.data.active).to.equal(false);
  });

  it('should get in app activated truthy on in-app set up', async () => {
    await subscriberRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      subscriberId: 'on-boarding-subscriber-id-123',
      isOnline: true,
      lastOnlineAt: new Date().toISOString(),
    });

    const { body } = await session.testAgent.get('/v1/integrations/in-app/status').expect(200);

    expect(body.data.active).to.equal(true);
  });
});
