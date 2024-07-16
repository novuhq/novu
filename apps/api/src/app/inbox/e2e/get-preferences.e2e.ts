import { SubscriberRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

describe('Get all preferences - /inbox/preferences (GET)', function () {
  let session: UserSession;
  let subscriberRepository: SubscriberRepository;

  beforeEach(async () => {
    session = new UserSession();
    subscriberRepository = new SubscriberRepository();
    await session.initialize();
  });

  it('should always get the global preferences even if workflow preferences are not present', async function () {
    const response = await session.testAgent
      .get('/v1/inbox/preferences')
      .set('Authorization', `Bearer ${session.subscriberToken}`);

    const globalPreference = response.body.data[0];

    expect(globalPreference.preferences.channels.email).to.equal(true);
    expect(globalPreference.preferences.channels.in_app).to.equal(true);
    expect(globalPreference.level).to.equal('global');
    expect(response.body.data.length).to.equal(1);
  });

  it('should get both global and workflow preferences if workflow is present', async function () {
    await session.createTemplate({
      noFeedId: true,
    });

    const response = await session.testAgent
      .get('/v1/inbox/preferences')
      .set('Authorization', `Bearer ${session.subscriberToken}`);

    const globalPreference = response.body.data[0];

    expect(globalPreference.preferences.channels.email).to.equal(true);
    expect(globalPreference.preferences.channels.in_app).to.equal(true);
    expect(globalPreference.level).to.equal('global');

    const workflowPreference = response.body.data[1];

    expect(workflowPreference.preferences.channels.email).to.equal(true);
    expect(workflowPreference.preferences.channels.in_app).to.equal(true);
    expect(workflowPreference.level).to.equal('template');
  });

  it('should throw error when made unauthorized call', async function () {
    const response = await session.testAgent.get(`/v1/inbox/preferences`).set('Authorization', `Bearer InvalidToken`);

    expect(response.status).to.equal(401);
  });
});
