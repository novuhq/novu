import { Novu } from '@novu/api';
import { SubscriberEntity, TopicSubscribersRepository } from '@novu/dal';
import { SubscribersService, UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Delete topic by key - /v2/topics/:topicKey (DELETE) #novu-v2', async () => {
  let session: UserSession;
  let novuClient: Novu;
  let subscriber: SubscriberEntity;
  let topicSubscribersRepository: TopicSubscribersRepository;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdk(session);
    topicSubscribersRepository = new TopicSubscribersRepository();
  });

  it('should delete a topic with no subscribers', async () => {
    const topicKey = `topic-key-${Date.now()}`;

    await novuClient.topics.create({
      key: topicKey,
      name: 'Test Topic',
    });

    // Verify topic exists
    const getTopic = await novuClient.topics.get(topicKey);

    expect(getTopic).to.exist;

    // Delete the topic
    const response = await novuClient.topics.delete(topicKey);
    expect(response).to.exist;
    expect(response.result.acknowledged).to.equal(true);

    // Verify topic no longer exists
    try {
      await novuClient.topics.get(topicKey);
      throw new Error('Topic should not exist');
    } catch (error) {
      expect(error.statusCode).to.equal(404);
    }
  });

  it('should delete a topic with subscribers', async () => {
    // Create a subscriber
    const subscribersService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscribersService.createSubscriber();

    // Create a topic
    const topicKey = `topic-key-${Date.now()}`;
    const createResponse = await novuClient.topics.create({
      key: topicKey,
      name: 'Test Topic with Subscribers',
    });
    const topicId = createResponse.result.id;

    // Add subscriber to topic
    await novuClient.topics.subscriptions.create(
      {
        subscriberIds: [subscriber.subscriberId],
      },
      topicKey
    );

    // Verify subscriber is added to topic
    const subscribers = await topicSubscribersRepository.findSubscribersByTopicId(
      session.environment._id,
      session.organization._id,
      topicId
    );
    expect(subscribers.length).to.be.greaterThan(0);

    await novuClient.topics.delete(topicKey);

    // Verify topic no longer exists
    try {
      await novuClient.topics.get(topicKey);
      throw new Error('Topic should not exist');
    } catch (error) {
      expect(error.statusCode).to.equal(404);
    }

    // Verify subscriptions have been removed
    const subscribersAfterDelete = await topicSubscribersRepository.findSubscribersByTopicId(
      session.environment._id,
      session.organization._id,
      topicId
    );
    expect(subscribersAfterDelete.length).to.equal(0);
  });

  it('should return 404 for deleting a non-existent topic key', async () => {
    const nonExistentKey = 'non-existent-topic-key';
    try {
      await novuClient.topics.delete(nonExistentKey);
      throw new Error('Should have failed to delete non-existent topic');
    } catch (error) {
      expect(error.statusCode).to.equal(404);
      expect(error.message).to.include(nonExistentKey);
    }
  });
});
