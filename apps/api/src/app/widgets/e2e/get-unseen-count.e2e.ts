import axios from 'axios';
import { expect } from 'chai';
import { MessageRepository, NotificationTemplateEntity, SubscriberRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { ChannelTypeEnum } from '@novu/shared';
import {
  buildFeedKey,
  buildMessageCountKey,
  CacheInMemoryProviderService,
  CacheService,
  InvalidateCacheService,
} from '@novu/application-generic';

describe('Unseen Count - GET /widget/notifications/unseen', function () {
  const messageRepository = new MessageRepository();
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriberId: string;
  let subscriberToken: string;
  let subscriberProfile: {
    _id: string;
  } | null = null;

  let cacheInMemoryProviderService: CacheInMemoryProviderService;
  let invalidateCache: InvalidateCacheService;

  before(async () => {
    cacheInMemoryProviderService = new CacheInMemoryProviderService();
    const cacheService = new CacheService(cacheInMemoryProviderService);
    await cacheService.initialize();
    invalidateCache = new InvalidateCacheService(cacheService);
  });

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

  it('should return unseen count with no query', async function () {
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);

    await session.awaitRunningJobs(template._id);

    const messages = await messageRepository.findBySubscriberChannel(
      session.environment._id,
      String(subscriberProfile?._id),
      ChannelTypeEnum.IN_APP
    );
    const messageId = messages[0]._id;
    expect(messages[0].seen).to.equal(false);

    await axios.post(
      `http://127.0.0.1:${process.env.PORT}/v1/widgets/messages/markAs`,
      { messageId, mark: { seen: true } },
      {
        headers: {
          Authorization: `Bearer ${subscriberToken}`,
        },
      }
    );

    const unseenFeed = await getUnseenCount();
    expect(unseenFeed.data.count).to.equal(2);
  });

  it('should return unseen count with query seen false', async function () {
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);

    await session.awaitRunningJobs(template._id);

    const messages = await messageRepository.findBySubscriberChannel(
      session.environment._id,
      String(subscriberProfile?._id),
      ChannelTypeEnum.IN_APP
    );
    const messageId = messages[0]._id;
    expect(messages[0].seen).to.equal(false);

    await axios.post(
      `http://127.0.0.1:${process.env.PORT}/v1/widgets/messages/markAs`,
      { messageId, mark: { seen: true } },
      {
        headers: {
          Authorization: `Bearer ${subscriberToken}`,
        },
      }
    );

    const unseenFeed = await getUnseenCount({ seen: false });
    expect(unseenFeed.data.count).to.equal(2);
  });

  it('should return unseen count with query seen true', async function () {
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);

    await session.awaitRunningJobs(template._id);

    const messages = await messageRepository.findBySubscriberChannel(
      session.environment._id,
      String(subscriberProfile?._id),
      ChannelTypeEnum.IN_APP
    );
    const messageId = messages[0]._id;
    expect(messages[0].seen).to.equal(false);

    await axios.post(
      `http://127.0.0.1:${process.env.PORT}/v1/widgets/messages/markAs`,
      { messageId, mark: { seen: true } },
      {
        headers: {
          Authorization: `Bearer ${subscriberToken}`,
        },
      }
    );

    const seenFeed = await getUnseenCount({ seen: true });
    expect(seenFeed.data.count).to.equal(1);
  });

  it('should return unseen count after mark as request', async function () {
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);
    await session.triggerEvent(template.triggers[0].identifier, subscriberId);

    await session.awaitRunningJobs(template._id);

    const messages = await messageRepository.findBySubscriberChannel(
      session.environment._id,
      String(subscriberProfile?._id),
      ChannelTypeEnum.IN_APP
    );
    const messageId = messages[0]._id;

    let seenCount = (await getUnseenCount({ seen: false })).data.count;
    expect(seenCount).to.equal(3);

    await invalidateCache.invalidateQuery({
      key: buildFeedKey().invalidate({
        subscriberId: subscriberId,
        _environmentId: session.environment._id,
      }),
    });

    await invalidateCache.invalidateQuery({
      key: buildMessageCountKey().invalidate({
        subscriberId: subscriberId,
        _environmentId: session.environment._id,
      }),
    });

    await axios.post(
      `http://127.0.0.1:${process.env.PORT}/v1/widgets/messages/markAs`,
      { messageId, mark: { seen: true } },
      {
        headers: {
          Authorization: `Bearer ${subscriberToken}`,
        },
      }
    );

    seenCount = (await getUnseenCount({ seen: false })).data.count;
    expect(seenCount).to.equal(2);
  });

  async function getUnseenCount(query = {}) {
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
});
