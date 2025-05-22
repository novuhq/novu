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

    // Create subscribers
    const subscribersService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber1 = await subscribersService.createSubscriber();
    subscriber2 = await subscribersService.createSubscriber();
    subscriber3 = await subscribersService.createSubscriber();

    // Create a topic
    const createResponse = await novuClient.topics.create({
      key: topicKey,
      name: 'Test Topic',
    });
    topicId = createResponse.result.id;

    // Add subscribers to topic
    await novuClient.topics.subscriptions.create(
      {
        subscriberIds: [subscriber1.subscriberId, subscriber2.subscriberId, subscriber3.subscriberId],
      },
      topicKey
    );
  });

  it('should list topic subscriptions with pagination', async () => {
    const response = await novuClient.topics.subscriptions.list({
      topicKey,
      limit: 2,
    });

    expect(response).to.exist;
    expect(response.result.data.length).to.equal(2);
    expect(response.result.next).to.be.a('string');
    expect(response.result.previous).to.be.null;

    // Check response structure for each subscription
    response.result.data.forEach((subscription) => {
      expect(subscription).to.have.property('id');
      expect(subscription).to.have.property('topic');
      expect(subscription).to.have.property('subscriber');
      expect(subscription.topic.id).to.equal(topicId);
      expect(subscription.topic.key).to.equal(topicKey);
    });

    // Get next page
    const nextResponse = await novuClient.topics.subscriptions.list({
      topicKey,
      limit: 2,
      after: response.result.next as string,
    });

    expect(nextResponse).to.exist;
    // We have 3 subscribers total, with 2 per page, so the second page has 1 subscriber
    const expectedSubscribersInSecondPage = 1;
    expect(nextResponse.result.data.length).to.equal(expectedSubscribersInSecondPage);
    expect(nextResponse.result.next).to.be.null;
    expect(nextResponse.result.previous).to.be.a('string');
  });

  it('should filter subscriptions by subscriberId', async () => {
    const response = await novuClient.topics.subscriptions.list({
      topicKey,
      subscriberId: subscriber1.subscriberId,
    });

    expect(response).to.exist;
    expect(response.result.data.length).to.equal(1);
    expect(response.result.data[0].subscriber.subscriberId).to.equal(subscriber1.subscriberId);
  });

  it('should return 404 for non-existent topic', async () => {
    const nonExistentKey = 'non-existent-topic-key';
    try {
      await novuClient.topics.subscriptions.list({
        topicKey: nonExistentKey,
      });
      throw new Error('Should have failed to list subscriptions for non-existent topic');
    } catch (error) {
      expect(error.statusCode).to.equal(404);
      expect(error.message).to.include(nonExistentKey);
    }
  });

  it('should return empty array for topic with no subscriptions', async () => {
    // Create a topic with no subscribers
    const emptyTopicKey = `empty-topic-${Date.now()}`;
    await novuClient.topics.create({
      key: emptyTopicKey,
      name: 'Empty Topic',
    });

    const response = await novuClient.topics.subscriptions.list({
      topicKey: emptyTopicKey,
    });

    expect(response).to.exist;
    expect(response.result.data).to.be.an('array').that.is.empty;
    expect(response.result.next).to.be.null;
    expect(response.result.previous).to.be.null;
  });
});
