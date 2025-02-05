import axios from 'axios';
import { MessageRepository, NotificationTemplateEntity, SubscriberRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { Novu } from '@novu/api';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Mark all as read - /widgets/messages/seen (POST) #novu-v1', function () {
  const messageRepository = new MessageRepository();
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriberId: string;
  let subscriberToken: string;
  let subscriberProfile: {
    _id: string;
  } | null = null;
  let novuClient: Novu;
  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    subscriberId = SubscriberRepository.createObjectId();
    novuClient = initNovuClassSdk(session);

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

  it('should mark all as seen', async function () {
    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId });
    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId });
    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId });

    await session.awaitRunningJobs(template._id);

    const unseenMessagesBefore = await getFeedCount({ seen: false });
    expect(unseenMessagesBefore.data.count).to.equal(3);

    await axios.post(
      `http://127.0.0.1:${process.env.PORT}/v1/widgets/messages/seen`,
      {},
      {
        headers: {
          Authorization: `Bearer ${subscriberToken}`,
        },
      }
    );

    const unseenMessagesAfter = await getFeedCount({ seen: false });
    expect(unseenMessagesAfter.data.count).to.equal(0);
  });

  it('should mark all as read', async function () {
    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId });
    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId });
    await novuClient.trigger({ workflowId: template.triggers[0].identifier, to: subscriberId });

    await session.awaitRunningJobs(template._id);

    const unseenMessagesBefore = await getNotificationCount('read=false');

    expect(unseenMessagesBefore.data.count).to.equal(3);

    await axios.post(
      `http://127.0.0.1:${process.env.PORT}/v1/widgets/messages/read`,
      {},
      {
        headers: {
          Authorization: `Bearer ${subscriberToken}`,
        },
      }
    );

    const unseenMessagesAfter = await getNotificationCount('read=false');

    expect(unseenMessagesAfter.data.count).to.equal(0);
  });

  async function getFeedCount(query = {}) {
    const response = await axios.get(`http://127.0.0.1:${process.env.PORT}/v1/widgets/notifications/unseen`, {
      params: {
        ...query,
      },
      headers: {
        Authorization: `Bearer ${subscriberToken}`,
      },
    });

    return response.data;
  }

  async function getNotificationCount(query: string) {
    const response = await axios.get(`http://127.0.0.1:${process.env.PORT}/v1/widgets/notifications/count?${query}`, {
      headers: {
        Authorization: `Bearer ${subscriberToken}`,
      },
    });

    return response.data;
  }
});
