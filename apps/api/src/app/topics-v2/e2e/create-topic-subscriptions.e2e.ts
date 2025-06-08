import { Novu } from '@novu/api';
import { SubscriberEntity, TopicRepository, TopicSubscribersRepository } from '@novu/dal';
import { SubscribersService, UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Create topic subscriptions - /v2/topics/:topicKey/subscriptions (POST) #novu-v2', async () => {
  let session: UserSession;
  let novuClient: Novu;
  let subscriber1: SubscriberEntity;
  let subscriber2: SubscriberEntity;
  let subscriber3: SubscriberEntity;
  let topicSubscribersRepository: TopicSubscribersRepository;
  let topicRepository: TopicRepository;

  before(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdk(session);
    topicSubscribersRepository = new TopicSubscribersRepository();
    topicRepository = new TopicRepository();

    // Create subscribers
    const subscribersService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber1 = await subscribersService.createSubscriber();
    subscriber2 = await subscribersService.createSubscriber();
    subscriber3 = await subscribersService.createSubscriber();
  });

  it('should create subscriptions for subscribers to an existing topic', async () => {
    const topicKey = `topic-key-${Date.now()}`;

    // Create a topic first
    const createResponse = await novuClient.topics.create({
      key: topicKey,
      name: 'Test Topic',
    });
    const topicId = createResponse.result.id;

    // Add subscribers to topic
    const response = await novuClient.topics.subscriptions.create(
      {
        subscriberIds: [subscriber1.subscriberId, subscriber2.subscriberId],
      },
      topicKey
    );

    expect(response).to.exist;
    expect(response.result.data.length).to.equal(2);
    expect(response.result.meta.successful).to.equal(2);
    expect(response.result.meta.failed).to.equal(0);

    // Verify subscribers were added to the topic
    const subscribers = await topicSubscribersRepository.findSubscribersByTopicId(
      session.environment._id,
      session.organization._id,
      topicId
    );
    expect(subscribers.length).to.equal(2);

    // Verify the structure of the response data
    response.result.data.forEach((subscription) => {
      expect(subscription).to.have.property('id');
      expect(subscription).to.have.property('topic');
      expect(subscription).to.have.property('subscriber');
      expect(subscription.topic.id).to.equal(topicId);
      expect(subscription.topic.key).to.equal(topicKey);
      expect([subscriber1.subscriberId, subscriber2.subscriberId]).to.include(
        subscription.subscriber?.subscriberId as string
      );
    });
  });

  it('should automatically create a topic when subscribing to a non-existing topic', async () => {
    const nonExistingTopicKey = `non-existing-topic-${Date.now()}`;

    // Try to get the topic - should not exist
    try {
      await novuClient.topics.get(nonExistingTopicKey);
      throw new Error('Topic should not exist');
    } catch (error) {
      expect(error.statusCode).to.equal(404);
    }

    // Add subscribers to non-existing topic
    const response = await novuClient.topics.subscriptions.create(
      {
        subscriberIds: [subscriber3.subscriberId],
      },
      nonExistingTopicKey
    );

    expect(response).to.exist;
    expect(response.result.data.length).to.equal(1);
    expect(response.result.meta.successful).to.equal(1);
    expect(response.result.meta.failed).to.equal(0);

    // Verify topic was created
    const topic = await novuClient.topics.get(nonExistingTopicKey);
    expect(topic).to.exist;
    expect(topic.result.key).to.equal(nonExistingTopicKey);

    // Verify subscriber was added to the topic
    const subscribers = await topicSubscribersRepository.findSubscribersByTopicId(
      session.environment._id,
      session.organization._id,
      topic.result.id
    );
    expect(subscribers.length).to.equal(1);
    expect(subscribers[0]?._subscriberId).to.equal(subscriber3._id);
  });

  it('should handle removal of subscribers from a topic', async () => {
    const topicKey = `topic-key-removal-${Date.now()}`;

    // Create a topic
    const createResponse = await novuClient.topics.create({
      key: topicKey,
      name: 'Test Topic for Removal',
    });
    const topicId = createResponse.result.id;

    // Add subscribers to topic
    await novuClient.topics.subscriptions.create(
      {
        subscriberIds: [subscriber1.subscriberId, subscriber2.subscriberId],
      },
      topicKey
    );

    // Verify subscribers were added
    let subscribers = await topicSubscribersRepository.findSubscribersByTopicId(
      session.environment._id,
      session.organization._id,
      topicId
    );
    expect(subscribers.length).to.equal(2);

    // Remove one subscriber
    const deleteResponse = await novuClient.topics.subscriptions.delete(
      {
        subscriberIds: [subscriber1.subscriberId],
      },
      topicKey
    );

    expect(deleteResponse).to.exist;
    expect(deleteResponse.result.data.length).to.equal(1);
    expect(deleteResponse.result.meta.successful).to.equal(1);
    expect(deleteResponse.result.meta.failed).to.equal(0);

    // Verify subscriber was removed
    subscribers = await topicSubscribersRepository.findSubscribersByTopicId(
      session.environment._id,
      session.organization._id,
      topicId
    );
    expect(subscribers.length).to.equal(1);
    expect(subscribers[0]?._subscriberId).to.equal(subscriber2._id);
  });

  it('should handle partial success when some subscribers do not exist', async () => {
    const topicKey = `topic-key-partial-${Date.now()}`;

    // Create a topic
    await novuClient.topics.create({
      key: topicKey,
      name: 'Test Topic for Partial Success',
    });

    // Add existing and non-existing subscribers
    const nonExistingSubscriberId = 'non-existing-subscriber-id';
    const response = await novuClient.topics.subscriptions.create(
      {
        subscriberIds: [subscriber1.subscriberId, nonExistingSubscriberId],
      },
      topicKey
    );

    // Verify partial success response
    expect(response).to.exist;
    expect(response.result.meta.successful).to.equal(1);
    expect(response.result.meta.failed).to.equal(1);
    expect(response.result.errors?.length).to.equal(1);
    expect(response.result.errors?.[0]?.subscriberId).to.equal(nonExistingSubscriberId);
  });

  it('should handle adding the same subscriber multiple times', async () => {
    const topicKey = `topic-key-duplicate-${Date.now()}`;

    // Create a topic
    const createResponse = await novuClient.topics.create({
      key: topicKey,
      name: 'Test Topic for Duplicates',
    });
    const topicId = createResponse.result.id;

    // Add a subscriber
    await novuClient.topics.subscriptions.create(
      {
        subscriberIds: [subscriber1.subscriberId],
      },
      topicKey
    );

    // Add the same subscriber again
    const response = await novuClient.topics.subscriptions.create(
      {
        subscriberIds: [subscriber1.subscriberId],
      },
      topicKey
    );

    // Should still be successful (idempotent operation)
    expect(response).to.exist;
    expect(response.result.data.length).to.equal(1);
    expect(response.result.meta.successful).to.equal(1);
    expect(response.result.meta.failed).to.equal(0);

    // Verify only one subscription exists
    const subscribers = await topicSubscribersRepository.findSubscribersByTopicId(
      session.environment._id,
      session.organization._id,
      topicId
    );
    expect(subscribers.length).to.equal(1);
    expect(subscribers[0]?._subscriberId).to.equal(subscriber1._id);
  });
});
