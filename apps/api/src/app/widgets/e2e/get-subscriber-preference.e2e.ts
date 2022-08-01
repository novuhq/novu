import { NotificationTemplateEntity } from '@novu/dal';
import { UserSession } from '@novu/testing';
import axios from 'axios';
import { expect } from 'chai';

describe('GET /widget/notifications/feed', function () {
  let template: NotificationTemplateEntity;
  let session: UserSession;
  let subscriberId: string;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    template = await session.createTemplate({
      noFeedId: true,
    });
  });

  it('should fetch a default user preference', async function () {
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);

    const response = await getSubscriberPreference(session.subscriberToken);

    const data = response.data.data[0];

    expect(data.preference.channels.email).to.equal(true);
    expect(data.preference.channels.in_app).to.equal(true);
  });
});

export async function getSubscriberPreference(subscriberToken: string) {
  return await axios.get(`http://localhost:${process.env.PORT}/v1/widgets/preferences`, {
    headers: {
      Authorization: `Bearer ${subscriberToken}`,
    },
  });
}
