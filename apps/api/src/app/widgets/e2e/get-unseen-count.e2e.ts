import axios from 'axios';
import { MessageRepository, NotificationTemplateEntity, SubscriberRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { ChannelTypeEnum } from '@novu/shared';

describe('Unseen Count - GET /widget/notifications/unseen', function () {
  const messageRepository = new MessageRepository();
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriberId: string;
  let subscriberToken: string;
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

  it('should return unseen count with a seen filter', async function () {
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);

    await session.awaitRunningJobs(template._id);

    const messages = await messageRepository.findBySubscriberChannel(
      session.environment._id,
      subscriberProfile._id,
      ChannelTypeEnum.IN_APP
    );
    const messageId = messages[0]._id;
    expect(messages[0].seen).to.equal(false);

    await axios.post(
      `http://localhost:${process.env.PORT}/v1/widgets/messages/${messageId}/seen`,
      {},
      {
        headers: {
          Authorization: `Bearer ${subscriberToken}`,
        },
      }
    );

    const unseenFeed = await getFeedCount({ seen: false });
    expect(unseenFeed.data.count).to.equal(2);
  });

  it('should return unread count with a read filter', async function () {
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);

    await session.awaitRunningJobs(template._id);

    const messages = await messageRepository.findBySubscriberChannel(
      session.environment._id,
      subscriberProfile._id,
      ChannelTypeEnum.IN_APP
    );
    const messageId = messages[0]._id;
    expect(messages[0].read).to.equal(false);

    await axios.post(
      `http://localhost:${process.env.PORT}/v1/widgets/messages/${messageId}/read`,
      {},
      {
        headers: {
          Authorization: `Bearer ${subscriberToken}`,
        },
      }
    );

    const readFeed = await getFeedCount({ read: true });
    expect(readFeed.data.count).to.equal(1);

    const unreadFeed = await getFeedCount({ read: false });
    expect(unreadFeed.data.count).to.equal(2);
  });

  async function getFeedCount(query = {}) {
    const response = await axios.get(`http://localhost:${process.env.PORT}/v1/widgets/notifications/count`, {
      params: {
        ...query,
      },
      headers: {
        Authorization: `Bearer ${subscriberToken}`,
      },
    });

    return response.data;
  }
});
