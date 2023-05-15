import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import axios from 'axios';
import { NotificationTemplateEntity, SubscriberRepository } from '@novu/dal';

describe('Get Notifications feed - /:subscriberId/notifications/feed (GET)', function () {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriberId: string;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    template = await session.createTemplate({
      noFeedId: false,
    });

    subscriberId = SubscriberRepository.createObjectId();
  });

  it('should throw exception on invalid subscriber id', async function () {
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);

    await session.awaitRunningJobs(template._id);

    const notificationsFeedResponse = await getNotificationsFeed(subscriberId, session.apiKey, { limit: 5 });
    expect(notificationsFeedResponse.pageSize).to.equal(5);

    try {
      await getNotificationsFeed(subscriberId + '111', session.apiKey, { seen: false, limit: 5 });
    } catch (err) {
      expect(err.response.status).to.equals(400);
      expect(err.response.data.message).to.contain(
        `Subscriber not found for this environment with the id: ${
          subscriberId + '111'
        }. Make sure to create a subscriber before fetching the feed.`
      );
    }
  });
});

async function getNotificationsFeed(subscriberId: string, apiKey: string, query = {}) {
  const response = await axios.get(
    `http://localhost:${process.env.PORT}/v1/subscribers/${subscriberId}/notifications/feed`,
    {
      params: {
        ...query,
      },
      headers: {
        authorization: `ApiKey ${apiKey}`,
      },
    }
  );

  return response.data;
}
