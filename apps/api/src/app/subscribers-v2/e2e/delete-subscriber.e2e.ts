import { Novu } from '@novu/api';
import {
  MessageEntity,
  MessageRepository,
  PreferencesRepository,
  SubscriberEntity,
  SubscriberRepository,
  TopicRepository,
  TopicSubscribersRepository,
} from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { randomBytes } from 'crypto';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Delete Subscriber - /subscribers/:subscriberId (DELETE) #novu-v2', () => {
  let session: UserSession;
  let novuClient: Novu;
  let messageRepository: MessageRepository;
  let subscriberRepository: SubscriberRepository;
  let topicRepository: TopicRepository;
  let topicSubscribersRepository: TopicSubscribersRepository;
  let preferencesRepository: PreferencesRepository;
  let subscriberId: string;
  let environmentId: string;
  let organizationId: string;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdk(session);

    messageRepository = new MessageRepository();
    subscriberRepository = new SubscriberRepository();
    topicRepository = new TopicRepository();
    topicSubscribersRepository = new TopicSubscribersRepository();
    preferencesRepository = new PreferencesRepository();

    subscriberId = `test-subscriber-${randomBytes(4).toString('hex')}`;
    environmentId = session.environment._id;
    organizationId = session.organization._id;
  });

  it('should delete subscriber and all associated data', async () => {
    const { result: subscriberResult } = await novuClient.subscribers.create({
      subscriberId,
      firstName: 'Test',
      lastName: 'Subscriber',
      email: 'test@example.com',
      data: { test: 'value' },
    });

    const subscriberEntity = await subscriberRepository.findOne({
      _environmentId: environmentId,
      subscriberId,
    });
    expect(subscriberEntity).to.not.be.null;
    const subscriberInternalId = subscriberEntity?._id;

    const topicKey = `topic-${randomBytes(4).toString('hex')}`;
    const createTopicResponse = await novuClient.topics.create({
      key: topicKey,
      name: 'Test Topic',
    });

    await novuClient.topics.subscriptions.create(
      {
        subscriberIds: [subscriberId],
      },
      topicKey
    );

    const topicSubscriptions = await topicSubscribersRepository.find({
      _environmentId: environmentId,
      _organizationId: organizationId,
      externalSubscriberId: subscriberId,
    });
    expect(topicSubscriptions.length).to.be.greaterThan(0);

    const testMessages: MessageEntity[] = [];
    for (let i = 0; i < 3; i += 1) {
      const message = await messageRepository.create({
        _environmentId: environmentId,
        _organizationId: organizationId,
        _subscriberId: subscriberInternalId,
        content: `Test message ${i}`,
        channel: ChannelTypeEnum.IN_APP,
        transactionId: `transaction-${i}`,
      });
      testMessages.push(message);
    }

    const messagesBeforeDeletion = await messageRepository.find({
      _environmentId: environmentId,
      _subscriberId: subscriberInternalId,
    });
    expect(messagesBeforeDeletion.length).to.equal(3);

    await novuClient.subscribers.delete(subscriberId);

    const subscriberAfterDeletion = await subscriberRepository.findOne({
      _environmentId: environmentId,
      subscriberId,
    });
    expect(subscriberAfterDeletion).to.be.null;

    const messagesAfterDeletion = await messageRepository.find({
      _environmentId: environmentId,
      _subscriberId: subscriberInternalId,
    });
    expect(messagesAfterDeletion.length).to.equal(0);

    const topicSubscriptionsAfterDeletion = await topicSubscribersRepository.find({
      _environmentId: environmentId,
      _organizationId: organizationId,
      externalSubscriberId: subscriberId,
    });
    expect(topicSubscriptionsAfterDeletion.length).to.equal(0);
  });
});
