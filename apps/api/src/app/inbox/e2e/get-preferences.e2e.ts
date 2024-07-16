import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { NotificationTemplateEntity, SubscriberRepository } from '@novu/dal';

describe('Get Subscribers preferences - /subscribers/preferences/:subscriberId (GET)', function () {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriberRepository: SubscriberRepository;

  beforeEach(async () => {
    session = new UserSession();
    subscriberRepository = new SubscriberRepository();
    await session.initialize();
    await session.createTemplate({
      noFeedId: true,
    });
  });

  it('should get subscriber preferences', async function () {
    const response = await session.testAgent.get(`/inbox/preferences`);

    const globalPreference = response.body.data[0];

    expect(globalPreference.preference.channels.email).to.equal(true);
    expect(globalPreference.preference.channels.in_app).to.equal(true);
    expect(globalPreference.level).to.equal('global');

    const workflowPreference = response.body.data[1];

    expect(workflowPreference.preference.channels.email).to.equal(true);
    expect(workflowPreference.preference.channels.in_app).to.equal(true);
    expect(workflowPreference.level).to.equal('template');
  });

  it('should throw error when subscriber is not found', async function () {
    const response = await session.testAgent.get(`/inbox/preferences`);

    const globalPreference = response.body.data[0];

    expect(globalPreference.preference.channels.email).to.equal(true);
    expect(globalPreference.preference.channels.in_app).to.equal(true);
    expect(globalPreference.level).to.equal('global');

    await subscriberRepository.delete({
      subscriberId: session.subscriberId,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    const responseAfterDelete = await session.testAgent.get(`/inbox/preferences`);

    expect(responseAfterDelete.status).to.equal(404);
    expect(responseAfterDelete.body.message).to.equal(`Subscriber: ${session.subscriberId} not found`);
  });
});
