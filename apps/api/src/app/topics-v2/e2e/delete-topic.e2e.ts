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
    // Create a topic
    const topicKey = `topic-key-${Date.now()}`;
    await session.testAgent.post('/v2/topics').send({
      key: topicKey,
      name: 'Test Topic',
    });

    // Verify topic exists
    const getResponse = await session.testAgent.get(`/v2/topics/${topicKey}`);
    expect(getResponse.statusCode).to.equal(200);

    // Delete the topic
    const response = await session.testAgent.delete(`/v2/topics/${topicKey}`);
    expect(response.statusCode).to.equal(200);
    expect(response.body.acknowledged).to.equal(true);

    // Verify topic no longer exists
    const getAfterDeleteResponse = await session.testAgent.get(`/v2/topics/${topicKey}`);
    expect(getAfterDeleteResponse.statusCode).to.equal(404);
  });

  it('should fail to delete a topic with subscribers without force flag', async () => {
    // Create a subscriber
    const subscribersService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscribersService.createSubscriber();

    // Create a topic
    const topicKey = `topic-key-${Date.now()}`;
    await session.testAgent.post('/v2/topics').send({
      key: topicKey,
      name: 'Test Topic with Subscribers',
    });

    // Add subscriber to topic
    await session.testAgent.post(`/v1/topics/${topicKey}/subscribers`).send({
      subscribers: [subscriber.subscriberId],
    });

    // Try to delete the topic without force flag
    const response = await session.testAgent.delete(`/v2/topics/${topicKey}`);
    expect(response.statusCode).to.equal(400);
    expect(response.body.message).to.include('subscribers');
    expect(response.body.message).to.include('force=true');

    // Verify topic still exists
    const getResponse = await session.testAgent.get(`/v2/topics/${topicKey}`);
    expect(getResponse.statusCode).to.equal(200);
  });

  it('should delete a topic with subscribers when force flag is used', async () => {
    // Create a subscriber
    const subscribersService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscribersService.createSubscriber();

    // Create a topic
    const topicKey = `topic-key-${Date.now()}`;
    const createResponse = await session.testAgent.post('/v2/topics').send({
      key: topicKey,
      name: 'Test Topic with Subscribers',
    });
    const topicId = createResponse.body._id;

    // Add subscriber to topic
    await session.testAgent.post(`/v1/topics/${topicKey}/subscribers`).send({
      subscribers: [subscriber.subscriberId],
    });

    // Verify subscriber is added to topic
    const subscribers = await topicSubscribersRepository.findSubscribersByTopicId(
      session.environment._id,
      session.organization._id,
      topicId
    );
    expect(subscribers.length).to.be.greaterThan(0);

    // Delete the topic with force flag
    const response = await session.testAgent.delete(`/v2/topics/${topicKey}?force=true`);
    expect(response.statusCode).to.equal(200);
    expect(response.body.acknowledged).to.equal(true);

    // Verify topic no longer exists
    const getResponse = await session.testAgent.get(`/v2/topics/${topicKey}`);
    expect(getResponse.statusCode).to.equal(404);

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
    const response = await session.testAgent.delete(`/v2/topics/${nonExistentKey}`);

    expect(response.statusCode).to.equal(404);
    expect(response.body.message).to.include(nonExistentKey);
  });
});
