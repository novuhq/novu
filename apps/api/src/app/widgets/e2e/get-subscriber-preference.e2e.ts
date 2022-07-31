import { NotificationTemplateEntity, SubscriberRepository, SubscriberPreferenceRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import axios from 'axios';
import { expect } from 'chai';

describe('GET /widget/notifications/feed', function () {
  let template: NotificationTemplateEntity;
  let session: UserSession;
  let subscriberToken: string;
  let subscriberId: string;
  let subscriberProfile: {
    _id: string;
  } = null;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    subscriberId = SubscriberRepository.createObjectId();

    template = await session.createTemplate({
      noFeedId: true,
    });

    const { body } = await session.testAgent
      .post('/v1/widgets/session/initialize')
      .send({
        applicationIdentifier: session.environment.identifier,
        subscriberId,
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
      })
      .expect(201);

    const { token, profile } = body.data;

    subscriberToken = token;
    subscriberProfile = profile;
  });

  it('should fetch a default user preference', async function () {
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);

    await session.awaitRunningJobs(template._id);

    const response = await axios.get(`http://localhost:${process.env.PORT}/v1/widgets/subscriber-preference`, {
      headers: {
        Authorization: `Bearer ${subscriberToken}`,
      },
    });

    const data = response.data.data[0];

    expect(data.preference.channels.email).to.equal(true);
    expect(data.preference.channels.sms).to.equal(true);
    expect(data.preference.channels.in_app).to.equal(true);
    expect(data.preference.channels.direct).to.equal(true);
    expect(data.preference.channels.push).to.equal(true);
  });
});

export async function getSubscriberPreference(subscriberToken: string) {
  return await axios.get(`http://localhost:${process.env.PORT}/v1/widgets/subscriber-preference`, {
    headers: {
      Authorization: `Bearer ${subscriberToken}`,
    },
  });
}
