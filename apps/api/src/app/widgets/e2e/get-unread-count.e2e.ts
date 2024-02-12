import axios from 'axios';
import { expect } from 'chai';
import { MessageRepository, NotificationTemplateEntity, SubscriberRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { ChannelTypeEnum } from '@novu/shared';

describe('Unread Count - GET /widget/notifications/unread', function () {
  const messageRepository = new MessageRepository();
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriberId: string;
  let subscriberToken: string;
  let subscriberProfile: {
    _id: string;
  } | null = null;

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

  it('should return unread count with no query', async function () {
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);

    await session.awaitRunningJobs(template._id);

    const messages = await messageRepository.findBySubscriberChannel(
      session.environment._id,
      subscriberProfile!._id,
      ChannelTypeEnum.IN_APP
    );
    const messageId = messages[0]._id;
    expect(messages[0].read).to.equal(false);

    await axios.post(
      `http://127.0.0.1:${process.env.PORT}/v1/widgets/messages/markAs`,
      { messageId, mark: { read: true } },
      {
        headers: {
          Authorization: `Bearer ${subscriberToken}`,
        },
      }
    );

    const unreadFeed = await getUnreadCount();
    expect(unreadFeed.data.count).to.equal(2);
  });

  it('should return unread count with query read false', async function () {
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);

    await session.awaitRunningJobs(template._id);

    const messages = await messageRepository.findBySubscriberChannel(
      session.environment._id,
      subscriberProfile!._id,
      ChannelTypeEnum.IN_APP
    );
    const messageId = messages[0]._id;
    expect(messages[0].read).to.equal(false);

    await axios.post(
      `http://127.0.0.1:${process.env.PORT}/v1/widgets/messages/markAs`,
      { messageId, mark: { read: true } },
      {
        headers: {
          Authorization: `Bearer ${subscriberToken}`,
        },
      }
    );

    const unreadFeed = await getUnreadCount({ read: false });
    expect(unreadFeed.data.count).to.equal(2);
  });

  it('should return unread count with query read true', async function () {
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);

    await session.awaitRunningJobs(template._id);

    const messages = await messageRepository.findBySubscriberChannel(
      session.environment._id,
      subscriberProfile!._id,
      ChannelTypeEnum.IN_APP
    );
    const messageId = messages[0]._id;
    expect(messages[0].read).to.equal(false);

    await axios.post(
      `http://127.0.0.1:${process.env.PORT}/v1/widgets/messages/markAs`,
      { messageId, mark: { read: true } },
      {
        headers: {
          Authorization: `Bearer ${subscriberToken}`,
        },
      }
    );

    const readFeed = await getUnreadCount({ read: true });
    expect(readFeed.data.count).to.equal(1);
  });

  async function getUnreadCount(query = {}) {
    const response = await axios.get(`http://127.0.0.1:${process.env.PORT}/v1/widgets/notifications/unread`, {
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
