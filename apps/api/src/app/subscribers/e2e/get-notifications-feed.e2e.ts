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

  it('should throw exception when invalid payload query param is passed', async function () {
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);

    await session.awaitRunningJobs(template._id);

    try {
      await getNotificationsFeed(subscriberId, session.apiKey, { limit: 5, payload: 'invalid' });
    } catch (err) {
      expect(err.response.status).to.equals(400);
      expect(err.response.data.message).to.eq(`Invalid payload, the JSON object should be encoded to base64 string.`);

      return;
    }

    expect.fail('Should have thrown an bad request exception');
  });

  it('should allow filtering by custom data from the payload', async function () {
    const partialPayload = { foo: 123 };
    const payload = { ...partialPayload, bar: 'bar' };

    await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    await session.awaitRunningJobs(template._id);

    await session.triggerEvent(template.triggers[0].identifier, subscriberId, payload);
    await session.awaitRunningJobs(template._id);

    const payloadQueryValue = Buffer.from(JSON.stringify(partialPayload)).toString('base64');
    const { data } = await getNotificationsFeed(subscriberId, session.apiKey, { limit: 5, payload: payloadQueryValue });

    expect(data.length).to.equal(1);
    expect(data[0].payload).to.deep.equal(payload);
  });

  it('should allow filtering by custom nested data from the payload', async function () {
    const partialPayload = { foo: { bar: 123 } };
    const payload = { ...partialPayload, baz: 'baz' };

    await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    await session.awaitRunningJobs(template._id);

    await session.triggerEvent(template.triggers[0].identifier, subscriberId, payload);
    await session.awaitRunningJobs(template._id);

    const payloadQueryValue = Buffer.from(JSON.stringify(partialPayload)).toString('base64');
    const { data } = await getNotificationsFeed(subscriberId, session.apiKey, { limit: 5, payload: payloadQueryValue });

    expect(data.length).to.equal(1);
    expect(data[0].payload).to.deep.equal(payload);
  });
});

async function getNotificationsFeed(subscriberId: string, apiKey: string, query = {}) {
  const response = await axios.get(
    `http://127.0.0.1:${process.env.PORT}/v1/subscribers/${subscriberId}/notifications/feed`,
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
