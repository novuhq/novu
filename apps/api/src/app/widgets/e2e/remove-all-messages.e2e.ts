import axios from 'axios';
import { MessageRepository, NotificationTemplateEntity, SubscriberRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { ChannelTypeEnum } from '@novu/shared';

describe('Remove all messages - /widgets/messages (DELETE)', function () {
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

  it('should remove all messages', async function () {
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);

    await session.awaitRunningJobs(template._id);

    const messagesBefore = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriberProfile?._id,
      channel: ChannelTypeEnum.IN_APP,
    });

    expect(messagesBefore.length).to.equal(3);
    await axios.delete(`http://127.0.0.1:${process.env.PORT}/v1/widgets/messages`, {
      headers: {
        Authorization: `Bearer ${subscriberToken}`,
      },
    });

    const messagesAfter = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriberProfile?._id,
      channel: ChannelTypeEnum.IN_APP,
    });

    expect(messagesAfter.length).to.equal(0);
  });

  it('should remove all messages of a specific feed', async function () {
    const templateWithFeed = await session.createTemplate({ noFeedId: false });

    const _feedId = templateWithFeed?.steps[0]?.template?._feedId;

    await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    await session.triggerEvent(templateWithFeed.triggers[0].identifier, subscriberId);
    await session.triggerEvent(templateWithFeed.triggers[0].identifier, subscriberId);

    await session.awaitRunningJobs(templateWithFeed._id);
    await session.awaitRunningJobs(template._id);

    const messagesBefore = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriberProfile?._id,
      channel: ChannelTypeEnum.IN_APP,
    });

    expect(messagesBefore.length).to.equal(5);

    await axios.delete(`http://127.0.0.1:${process.env.PORT}/v1/widgets/messages?feedId=${_feedId}`, {
      headers: {
        Authorization: `Bearer ${subscriberToken}`,
      },
    });

    const messagesAfter = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriberProfile?._id,
      channel: ChannelTypeEnum.IN_APP,
    });

    expect(messagesAfter.length).to.equal(3);
  });
});
