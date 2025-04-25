import { Novu } from '@novu/api';
import { SubscriberEntity } from '@novu/dal';
import { SubscribersService, UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('List topic subscriptions - /v2/topics/:topicKey/subscriptions (GET) #novu-v2', async () => {
  let session: UserSession;
  let novuClient: Novu;
  let subscriber1: SubscriberEntity;
  let subscriber2: SubscriberEntity;
  let subscriber3: SubscriberEntity;
  const topicKey = `topic-key-${Date.now()}`;
  let topicId: string;

  before(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdk(session);

    const result = await novuClient.topics.subscriptions.delete({ topicKey });

    // Create subscribers
    const subscribersService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber1 = await subscribersService.createSubscriber();
    subscriber2 = await subscribersService.createSubscriber();
    subscriber3 = await subscribersService.createSubscriber();

    // Create a topic
    const createResponse = await session.testAgent.post('/v2/topics').send({
      key: topicKey,
      name: 'Test Topic',
    });
    topicId = createResponse.body._id;

    // Add subscribers to topic
    await session.testAgent.post(`/v1/topics/${topicKey}/subscribers`).send({
      subscribers: [subscriber1.subscriberId, subscriber2.subscriberId, subscriber3.subscriberId],
    });
  });

  it('should list topic subscriptions with pagination', async () => {
    const response = await session.testAgent.get(`/v2/topics/${topicKey}/subscriptions?limit=2`);

    expect(response.statusCode).to.equal(200);
    expect(response.body.data.length).to.equal(2);
    expect(response.body.next).to.be.a('string');
    expect(response.body.previous).to.be.null;

    // Check response structure for each subscription
    response.body.data.forEach((subscription) => {
      expect(subscription).to.have.property('_id');
      expect(subscription).to.have.property('topic');
      expect(subscription).to.have.property('subscriber');
      expect(subscription.topic._id).to.equal(topicId);
      expect(subscription.topic.key).to.equal(topicKey);
    });

    // Get next page
    const nextResponse = await session.testAgent.get(
      `/v2/topics/${topicKey}/subscriptions?limit=2&after=${response.body.next}`
    );
    expect(nextResponse.statusCode).to.equal(200);
    expect(nextResponse.body.data.length).to.equal(1); // Only one subscriber left
    expect(nextResponse.body.next).to.be.null;
    expect(nextResponse.body.previous).to.be.a('string');
  });

  it('should filter subscriptions by subscriberId', async () => {
    const response = await session.testAgent.get(
      `/v2/topics/${topicKey}/subscriptions?subscriberId=${subscriber1.subscriberId}`
    );

    expect(response.statusCode).to.equal(200);
    expect(response.body.data.length).to.equal(1);
    expect(response.body.data[0].subscriber.subscriberId).to.equal(subscriber1.subscriberId);
  });

  it('should return 404 for non-existent topic', async () => {
    const nonExistentKey = 'non-existent-topic-key';
    const response = await session.testAgent.get(`/v2/topics/${nonExistentKey}/subscriptions`);

    expect(response.statusCode).to.equal(404);
    expect(response.body.message).to.include(nonExistentKey);
  });

  it('should return empty array for topic with no subscriptions', async () => {
    // Create a topic with no subscribers
    const emptyTopicKey = `empty-topic-${Date.now()}`;
    await session.testAgent.post('/v2/topics').send({
      key: emptyTopicKey,
      name: 'Empty Topic',
    });

    const response = await session.testAgent.get(`/v2/topics/${emptyTopicKey}/subscriptions`);

    expect(response.statusCode).to.equal(200);
    expect(response.body.data).to.be.an('array').that.is.empty;
    expect(response.body.next).to.be.null;
    expect(response.body.previous).to.be.null;
  });
});
