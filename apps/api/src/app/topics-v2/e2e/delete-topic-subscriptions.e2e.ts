import { Novu } from '@novu/api';
import { SubscriberEntity, TopicSubscribersRepository } from '@novu/dal';
import { SubscribersService, UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Delete topic subscriptions - /v2/topics/:topicKey/subscriptions (DELETE) #novu-v2', async () => {
  let session: UserSession;
  let novuClient: Novu;
  let subscriber1: SubscriberEntity;
  let subscriber2: SubscriberEntity;
  let subscriber3: SubscriberEntity;
  let topicSubscribersRepository: TopicSubscribersRepository;

  before(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdk(session);
    topicSubscribersRepository = new TopicSubscribersRepository();

    // Create subscribers
    const subscribersService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber1 = await subscribersService.createSubscriber();
    subscriber2 = await subscribersService.createSubscriber();
    subscriber3 = await subscribersService.createSubscriber();
  });

  it('should delete a single subscription from a topic', async () => {
    const topicKey = `topic-key-${Date.now()}`;

    // Create a topic
    const createResponse = await novuClient.topics.create({
      key: topicKey,
      name: 'Test Topic for Single Deletion',
    });
    const topicId = createResponse.result.id;

    // Add multiple subscribers to topic
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

    // Delete one subscriber
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

    // Verify the subscription was removed
    subscribers = await topicSubscribersRepository.findSubscribersByTopicId(
      session.environment._id,
      session.organization._id,
      topicId
    );
    expect(subscribers.length).to.equal(1);
    expect(subscribers[0]?._subscriberId).to.equal(subscriber2._id);
  });

  it('should delete multiple subscriptions from a topic', async () => {
    const topicKey = `topic-key-multiple-${Date.now()}`;

    // Create a topic
    const createResponse = await novuClient.topics.create({
      key: topicKey,
      name: 'Test Topic for Multiple Deletion',
    });
    const topicId = createResponse.result.id;

    // Add multiple subscribers to topic
    await novuClient.topics.subscriptions.create(
      {
        subscriberIds: [subscriber1.subscriberId, subscriber2.subscriberId, subscriber3.subscriberId],
      },
      topicKey
    );

    // Verify subscribers were added
    let subscribers = await topicSubscribersRepository.findSubscribersByTopicId(
      session.environment._id,
      session.organization._id,
      topicId
    );
    expect(subscribers.length).to.equal(3);

    // Delete multiple subscribers
    const deleteResponse = await novuClient.topics.subscriptions.delete(
      {
        subscriberIds: [subscriber1.subscriberId, subscriber2.subscriberId],
      },
      topicKey
    );

    expect(deleteResponse).to.exist;
    expect(deleteResponse.result.data.length).to.equal(2);
    expect(deleteResponse.result.meta.successful).to.equal(2);
    expect(deleteResponse.result.meta.failed).to.equal(0);

    // Verify the subscriptions were removed
    subscribers = await topicSubscribersRepository.findSubscribersByTopicId(
      session.environment._id,
      session.organization._id,
      topicId
    );
    expect(subscribers.length).to.equal(1);
    expect(subscribers[0]?._subscriberId).to.equal(subscriber3._id);
  });

  it('should handle partial success when deleting subscriptions', async () => {
    const topicKey = `topic-key-partial-${Date.now()}`;

    // Create a topic
    const createResponse = await novuClient.topics.create({
      key: topicKey,
      name: 'Test Topic for Partial Success',
    });
    const topicId = createResponse.result.id;

    // Add one subscriber to topic
    await novuClient.topics.subscriptions.create(
      {
        subscriberIds: [subscriber1.subscriberId],
      },
      topicKey
    );

    // Try to delete one existing and one non-existing subscriber
    const nonExistingSubscriberId = 'non-existing-subscriber-id';
    const deleteResponse = await novuClient.topics.subscriptions.delete(
      {
        subscriberIds: [subscriber1.subscriberId, nonExistingSubscriberId],
      },
      topicKey
    );

    // Should return partial success
    expect(deleteResponse).to.exist;
    expect(deleteResponse.result.data.length).to.equal(1);
    expect(deleteResponse.result.meta.successful).to.equal(1);
    expect(deleteResponse.result.meta.failed).to.equal(1);
    expect(deleteResponse.result.errors?.length).to.equal(1);
    expect(deleteResponse.result.errors?.[0]?.subscriberId).to.equal(nonExistingSubscriberId);

    // Verify the subscription was removed
    const subscribers = await topicSubscribersRepository.findSubscribersByTopicId(
      session.environment._id,
      session.organization._id,
      topicId
    );
    expect(subscribers.length).to.equal(0);
  });

  it('should handle deleting from a non-existent topic', async () => {
    const nonExistentTopicKey = `non-existent-topic-${Date.now()}`;

    try {
      await novuClient.topics.subscriptions.delete(
        {
          subscriberIds: [subscriber1.subscriberId],
        },
        nonExistentTopicKey
      );
      throw new Error('Should have failed to delete subscriptions from non-existent topic');
    } catch (error) {
      expect(error.statusCode).to.equal(404);
      expect(error.message).to.include(nonExistentTopicKey);
    }
  });
});
