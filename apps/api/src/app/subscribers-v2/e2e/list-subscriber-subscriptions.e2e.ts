import { Novu } from '@novu/api';
import { SubscriberEntity, TopicSubscribersRepository } from '@novu/dal';
import { SubscribersService, UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('List subscriber subscriptions - /v2/subscribers/:subscriberId/subscriptions (GET) #novu-v2', async () => {
  let session: UserSession;
  let novuClient: Novu;
  let subscriber: SubscriberEntity;
  let topicSubscribersRepository: TopicSubscribersRepository;
  const topicKeys: string[] = [];

  before(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdk(session);
    topicSubscribersRepository = new TopicSubscribersRepository();

    // Create a subscriber
    const subscribersService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscribersService.createSubscriber();

    // Create multiple topics
    for (let i = 0; i < 3; i++) {
      const topicKey = `topic-key-${Date.now()}-${i}`;
      topicKeys.push(topicKey);

      await novuClient.topics.create({
        key: topicKey,
        name: `Test Topic ${i}`,
      });
    }

    // Add subscriber to topics
    for (const topicKey of topicKeys) {
      await novuClient.topics.subscriptions.create(
        {
          subscriberIds: [subscriber.subscriberId],
        },
        topicKey
      );
    }
  });

  it('should list all topic subscriptions for a subscriber', async () => {
    const response = await novuClient.subscribers.topics.list({
      subscriberId: subscriber.subscriberId,
    });

    expect(response).to.exist;
    expect(response.result.data.length).to.equal(topicKeys.length);

    // Check response structure for each subscription
    response.result.data.forEach((subscription) => {
      expect(subscription).to.have.property('id');
      expect(subscription).to.have.property('topic');
      expect(subscription).to.have.property('subscriber');
      expect(subscription.subscriber.subscriberId).to.equal(subscriber.subscriberId);
      expect(topicKeys).to.include(subscription.topic.key);
    });
  });

  it('should filter subscriptions by topic key', async () => {
    const targetTopicKey = topicKeys[0];
    const response = await novuClient.subscribers.topics.list({
      subscriberId: subscriber.subscriberId,
      key: targetTopicKey,
    });

    expect(response).to.exist;
    expect(response.result.data.length).to.equal(1);
    expect(response.result.data[0].topic.key).to.equal(targetTopicKey);
    expect(response.result.data[0].subscriber.subscriberId).to.equal(subscriber.subscriberId);
  });

  it('should paginate subscriptions with limit parameter and provide correct cursors', async () => {
    const limit = 1;

    // First page
    const firstPageResponse = await novuClient.subscribers.topics.list({
      subscriberId: subscriber.subscriberId,
      limit,
    });

    expect(firstPageResponse).to.exist;
    expect(firstPageResponse.result.data.length).to.equal(limit);
    expect(firstPageResponse.result.next).to.be.a('string');
    expect(firstPageResponse.result.previous).to.be.null;

    // Second page using 'after' cursor
    const secondPageResponse = await novuClient.subscribers.topics.list({
      subscriberId: subscriber.subscriberId,
      limit,
      after: firstPageResponse.result.next as string,
    });

    expect(secondPageResponse).to.exist;
    expect(secondPageResponse.result.data.length).to.be.at.most(limit);
    expect(secondPageResponse.result.previous).to.be.a('string'); // This should now be set correctly

    if (topicKeys.length > 2) {
      expect(secondPageResponse.result.next).to.be.a('string');

      // Third page using 'after' cursor
      const thirdPageResponse = await novuClient.subscribers.topics.list({
        subscriberId: subscriber.subscriberId,
        limit,
        after: secondPageResponse.result.next as string,
      });

      expect(thirdPageResponse).to.exist;
      expect(thirdPageResponse.result.data.length).to.be.at.most(limit);
      expect(thirdPageResponse.result.previous).to.be.a('string');

      // Go back to second page using 'before' cursor from third page
      const backToSecondResponse = await novuClient.subscribers.topics.list({
        subscriberId: subscriber.subscriberId,
        limit,
        before: thirdPageResponse.result.previous as string,
      });

      expect(backToSecondResponse).to.exist;
      expect(backToSecondResponse.result.data.length).to.be.at.most(limit);
      expect(backToSecondResponse.result.next).to.be.a('string');
      expect(backToSecondResponse.result.previous).to.be.a('string');

      // IDs should match the second page we got earlier
      expect(backToSecondResponse.result.data[0].id).to.equal(secondPageResponse.result.data[0].id);
    }

    // Verify different items on each page
    const firstPageIds = firstPageResponse.result.data.map((sub) => sub.id);
    const secondPageIds = secondPageResponse.result.data.map((sub) => sub.id);

    // No duplicate items between pages
    const intersection = firstPageIds.filter((id) => secondPageIds.includes(id));
    expect(intersection.length).to.equal(0);
  });

  it('should return 404 for non-existent subscriber', async () => {
    const nonExistentId = 'non-existent-subscriber-id';

    try {
      await novuClient.subscribers.topics.list({
        subscriberId: nonExistentId,
      });
      throw new Error('Should have failed to list subscriptions for non-existent subscriber');
    } catch (error) {
      expect(error.statusCode).to.equal(404);
      expect(error.message).to.include('Subscriber not found');
    }
  });

  it('should return empty array for subscriber with no subscriptions', async () => {
    // Create a subscriber with no subscriptions
    const subscribersService = new SubscribersService(session.organization._id, session.environment._id);
    const newSubscriber = await subscribersService.createSubscriber();

    const response = await novuClient.subscribers.topics.list({
      subscriberId: newSubscriber.subscriberId,
    });

    expect(response).to.exist;
    expect(response.result.data).to.be.an('array').that.is.empty;
    expect(response.result.next).to.be.null;
    expect(response.result.previous).to.be.null;
  });
});
