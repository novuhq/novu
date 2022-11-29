import axios from 'axios';
import { MessageRepository, NotificationTemplateEntity, SubscriberRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { ChannelTypeEnum } from '@novu/shared';

describe('GET /widget/notifications/feed', function () {
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

  it('should fetch a feed without filters', async function () {
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);

    await session.awaitRunningJobs(template._id);

    const response = await getSubscriberFeed();
    expect(response.data.length).to.equal(2);
  });

  it('should filter only unseen messages', async function () {
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

    await markMessageAsSeen(messageId);

    const seenFeed = await getSubscriberFeed({ seen: true });
    expect(seenFeed.data.length).to.equal(1);
    expect(seenFeed.data[0]._id).to.equal(messageId);

    const unseenFeed = await getSubscriberFeed({ seen: false });
    expect(unseenFeed.data.length).to.equal(1);
    expect(unseenFeed.data[0]._id).to.not.equal(messageId);
  });

  it('should return seen and unseen', async function () {
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

    await markMessageAsSeen(messageId);

    const seenFeed = await getSubscriberFeed({ seen: true });
    expect(seenFeed.data.length).to.equal(1);
    expect(seenFeed.data[0]._id).to.equal(messageId);

    const unseenFeed = await getSubscriberFeed({ seen: false });
    expect(unseenFeed.data.length).to.equal(1);
    expect(unseenFeed.data[0]._id).to.not.equal(messageId);

    const seenUnseenFeed = await getSubscriberFeed();
    expect(seenUnseenFeed.data.length).to.equal(2);
  });

  async function getSubscriberFeed(query = {}) {
    const response = await axios.get(`http://localhost:${process.env.PORT}/v1/widgets/notifications/feed`, {
      params: {
        page: 0,
        ...query,
      },
      headers: {
        Authorization: `Bearer ${subscriberToken}`,
      },
    });

    return response.data;
  }

  async function markMessageAsSeen(messageId: string) {
    return await axios.post(
      `http://localhost:${process.env.PORT}/v1/widgets/messages/${messageId}/seen`,
      {},
      {
        headers: {
          Authorization: `Bearer ${subscriberToken}`,
        },
      }
    );
  }
});
