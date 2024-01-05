import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import axios from 'axios';
import { NotificationTemplateEntity, SubscriberRepository } from '@novu/dal';

describe('Get Unseen Count - /:subscriberId/notifications/unseen (GET)', function () {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriberId: string;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    template = await session.createTemplate({
      noFeedId: true,
    });

    subscriberId = SubscriberRepository.createObjectId();
  });

  it('should throw exception on invalid subscriber id', async function () {
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);

    await session.awaitRunningJobs(template._id);

    const seenCount = (await getUnSeenCount(subscriberId, session.apiKey, { seen: false })).data.count;
    expect(seenCount).to.equal(1);

    try {
      await getUnSeenCount(subscriberId + '111', session.apiKey, { seen: false });
    } catch (err) {
      expect(err.response.status).to.equals(400);
      expect(err.response.data.message).to.contain(`Subscriber ${subscriberId + '111'} is not exist in environment`);
    }
  });
});

async function getUnSeenCount(subscriberId: string, apiKey: string, query = {}) {
  const response = await axios.get(
    `http://127.0.0.1:${process.env.PORT}/v1/subscribers/${subscriberId}/notifications/unseen`,
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
