import { Novu } from '@novu/api';
import { SubscriberEntity, TopicSubscribersRepository } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
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

  before(async () => {
    (process.env as Record<string, string>).IS_CONTEXT_PREFERENCES_ENABLED = 'true';

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

  it('should create multiple subscriptions for the same subscriber with different conditions', async () => {
    const topicKey = `topic-key-conditions-${Date.now()}`;

    const workflow1 = await session.createTemplate({
      name: 'Workflow 1',
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Test content',
        },
      ],
    });

    const workflow2 = await session.createTemplate({
      name: 'Workflow 2',
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Test content',
        },
      ],
    });

    const preferencesA = [
      {
        filter: { workflowIds: [workflow1._id] },
        condition: {
          and: [{ '==': [{ var: 'status' }, 'active'] }, { '==': [{ var: 'priority' }, 'high'] }],
        },
      },
    ];

    const responseA = await novuClient.topics.subscriptions.create(
      {
        subscriptions: [
          { identifier: `${subscriber1.subscriberId}-subscription-a`, subscriberId: subscriber1.subscriberId },
        ],
        preferences: preferencesA,
      },
      topicKey
    );

    expect(responseA.result.data.length, 'responseA.result.data.length').to.equal(1);
    expect(responseA.result.data[0].id, 'responseA.result.data[0].id').to.exist;
    expect(responseA.result.data[0].topic.key, 'responseA.result.data[0].topic.key').to.equal(topicKey);

    const preferencesB = [
      {
        filter: { workflowIds: [workflow2._id] },
        condition: {
          and: [{ '==': [{ var: 'status' }, 'pending'] }, { '==': [{ var: 'priority' }, 'low'] }],
        },
      },
    ];

    const responseB = await novuClient.topics.subscriptions.create(
      {
        subscriptions: [
          { identifier: `${subscriber1.subscriberId}-subscription-b`, subscriberId: subscriber1.subscriberId },
        ],
        preferences: preferencesB,
      },
      topicKey
    );

    expect(responseB.result.data.length, 'responseB.result.data.length').to.equal(1);
    expect(responseB.result.data[0].id, 'responseB.result.data[0].id').to.exist;
    expect(responseB.result.data[0].topic.key, 'responseB.result.data[0].topic.key').to.equal(topicKey);

    const subscriptions = await topicSubscribersRepository.find({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      topicKey,
      externalSubscriberId: subscriber1.subscriberId,
    });

    expect(subscriptions.length, 'expect subscriptions.length to be 2').to.equal(2);

    await novuClient.topics.subscriptions.create(
      {
        subscriptions: [
          { identifier: `${subscriber1.subscriberId}-subscription-a`, subscriberId: subscriber1.subscriberId },
        ],
        preferences: preferencesA,
      },
      topicKey
    );

    const subscriptionsAfterDuplicate = await topicSubscribersRepository.find({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      topicKey,
      externalSubscriberId: subscriber1.subscriberId,
    });
    expect(subscriptionsAfterDuplicate.length, 'expect subscriptionsAfterDuplicate.length to be 2').to.equal(2);
  });

  it('should enforce subscription limit of 10 per subscriber per topic', async () => {
    try {
      const topicKey = `topic-key-limit-${Date.now()}`;
      const MAX_SUBSCRIPTIONS_PER_SUBSCRIBER = 10;

      // Create a topic
      const createResponse = await novuClient.topics.create({
        key: topicKey,
        name: 'Test Topic for Limit',
      });
      const topicId = createResponse.result.id;

      // Create a single workflow
      const workflow = await session.createTemplate({
        name: 'Test Workflow',
        steps: [
          {
            type: StepTypeEnum.IN_APP,
            content: 'Test content',
          },
        ],
      });

      // Create 10 subscriptions with different conditions for the same subscriber
      for (let i = 0; i < MAX_SUBSCRIPTIONS_PER_SUBSCRIBER; i++) {
        const response = await novuClient.topics.subscriptions.create(
          {
            subscriptions: [
              { identifier: `${subscriber1.subscriberId}-subscription-${i}`, subscriberId: subscriber1.subscriberId },
            ],
            preferences: [
              {
                filter: { workflowIds: [workflow._id] },
                condition: {
                  and: [{ '==': [{ var: 'status' }, `status-${i}`] }, { '==': [{ var: 'priority' }, `priority-${i}`] }],
                },
                enabled: true,
              },
            ],
          },
          topicKey
        );

        expect(response.result.meta.successful, `Subscription should be successful, index ${i}`).to.equal(1);
        expect(response.result.meta.failed, `Subscription should be successful, index ${i}`).to.equal(0);
      }

      // Verify we have exactly 10 subscriptions
      const subscriptions = await topicSubscribersRepository.find({
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        _topicId: topicId,
        _subscriberId: subscriber1._id,
      });
      expect(subscriptions.length, `Subscriptions should be exactly of limit max`).to.equal(
        MAX_SUBSCRIPTIONS_PER_SUBSCRIBER
      );

      // Try to create an 11th subscription - should fail with 400 error
      try {
        await novuClient.topics.subscriptions.create(
          {
            subscriptions: [
              { identifier: `${subscriber1.subscriberId}-subscription-10`, subscriberId: subscriber1.subscriberId },
            ],
            preferences: [
              {
                filter: { workflowIds: [workflow._id] },
                condition: {
                  and: [{ '==': [{ var: 'status' }, 'status-11'] }, { '==': [{ var: 'priority' }, 'priority-11'] }],
                },
                enabled: true,
              },
            ],
          },
          topicKey
        );
        // Should never reach here - request should throw an error
        expect.fail('Request should have thrown an error when exceeding subscription limit');
      } catch (error: any) {
        // When all subscriptions fail, the controller returns 400 and SDK throws ErrorDto
        expect(error.statusCode || error.data$?.statusCode || error.status, 'should be 400 error').to.equal(400);
        const errorContext = error.ctx || error.data$?.ctx;

        expect(errorContext, 'error should have ctx with response data').to.exist;

        const errorResponse = errorContext;
        expect(errorResponse.meta.successful, 'should not create extra subscriptions').to.equal(0);
        expect(errorResponse.meta.failed, 'should fail 1 due to limit').to.equal(1);
        expect(errorResponse.errors?.length, 'should have 1 error for limit').to.equal(1);
        expect(errorResponse.errors?.[0]?.code, 'should have limit error code').to.equal('SUBSCRIPTION_LIMIT_EXCEEDED');
        expect(errorResponse.errors?.[0]?.subscriberId, 'should reference correct subscriber id').to.equal(
          subscriber1.subscriberId
        );
        expect(errorResponse.errors?.[0]?.message, 'should mention limit and attempted request').to.include(
          `Subscriber ${subscriber1.subscriberId} has reached the maximum allowed of ${MAX_SUBSCRIPTIONS_PER_SUBSCRIBER} subscriptions for topic "${topicKey}"`
        );
      }

      // Verify we still have exactly 10 subscriptions (no new one was created)
      const subscriptionsAfterLimit = await topicSubscribersRepository.find({
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        _topicId: topicId,
        _subscriberId: subscriber1._id,
      });
      expect(subscriptionsAfterLimit.length, 'Subscriptions should still be exactly of limit max').to.equal(
        MAX_SUBSCRIPTIONS_PER_SUBSCRIBER
      );
    } catch (error) {
      throw error;
    }
  });

  describe('Context-aware subscriptions', () => {
    it('should create subscriptions with context payload', async () => {
      const topicKey = `topic-key-context-${Date.now()}`;

      const response = await novuClient.topics.subscriptions.create(
        {
          subscriberIds: [subscriber1.subscriberId],
          context: { tenant: 'org-123', project: 'proj-456' },
        },
        topicKey
      );

      expect(response).to.exist;
      expect(response.result.data.length).to.equal(1);
      expect(response.result.meta.successful).to.equal(1);
      expect(response.result.meta.failed).to.equal(0);
      expect(response.result.data[0].contextKeys).to.have.members(['project:proj-456', 'tenant:org-123']);

      const subscriptionIdentifier = response.result.data[0].identifier;
      expect(subscriptionIdentifier).to.exist;

      // Verify we can retrieve the subscription by identifier alone (no contextKeys needed)
      const getResponse = await novuClient.topics.subscriptions.getSubscription(
        topicKey,
        subscriptionIdentifier as string
      );

      expect(getResponse.result).to.exist;
      expect(getResponse.result.contextKeys).to.have.members(['project:proj-456', 'tenant:org-123']);
      expect(getResponse.result.identifier).to.include(':ctx_');
    });

    it('should create separate subscriptions for same subscriber with different contexts', async () => {
      const topicKey = `topic-key-multi-context-${Date.now()}`;

      const responseA = await novuClient.topics.subscriptions.create(
        {
          subscriberIds: [subscriber1.subscriberId],
          context: { tenant: 'org-a' },
        },
        topicKey
      );

      expect(responseA.result.data.length).to.equal(1);
      expect(responseA.result.meta.successful).to.equal(1);
      expect(responseA.result.data[0].contextKeys).to.deep.equal(['tenant:org-a']);

      const responseB = await novuClient.topics.subscriptions.create(
        {
          subscriberIds: [subscriber1.subscriberId],
          context: { tenant: 'org-b' },
        },
        topicKey
      );

      expect(responseB.result.data.length).to.equal(1);
      expect(responseB.result.meta.successful).to.equal(1);
      expect(responseB.result.data[0].contextKeys).to.deep.equal(['tenant:org-b']);

      const identifierA = responseA.result.data[0].identifier;
      const identifierB = responseB.result.data[0].identifier;

      expect(identifierA).to.not.equal(identifierB);

      // Verify we can retrieve both subscriptions via SDK
      const getResponseA = await novuClient.topics.subscriptions.getSubscription(topicKey, identifierA as string);
      const getResponseB = await novuClient.topics.subscriptions.getSubscription(topicKey, identifierB as string);

      const subscriptionA = getResponseA.result;
      const subscriptionB = getResponseB.result;

      expect(subscriptionA).to.exist;
      expect(subscriptionB).to.exist;
      expect(subscriptionA?.contextKeys).to.deep.equal(['tenant:org-a']);
      expect(subscriptionB?.contextKeys).to.deep.equal(['tenant:org-b']);

      const allSubscriptions = await topicSubscribersRepository.find({
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        topicKey,
        externalSubscriberId: subscriber1.subscriberId,
      });

      expect(allSubscriptions.length).to.equal(2);
    });

    it('should create subscription without context when context not provided', async () => {
      const topicKey = `topic-key-no-context-${Date.now()}`;

      const response = await novuClient.topics.subscriptions.create(
        {
          subscriberIds: [subscriber1.subscriberId],
        },
        topicKey
      );

      expect(response).to.exist;
      expect(response.result.data.length).to.equal(1);
      expect(response.result.meta.successful).to.equal(1);
      const contextKeys = response.result.data[0].contextKeys;
      expect(contextKeys === undefined || (Array.isArray(contextKeys) && contextKeys.length === 0)).to.be.true;

      const subscriptionIdentifier = response.result.data[0].identifier;
      expect(subscriptionIdentifier).to.exist;

      // Verify we can retrieve the subscription via SDK
      const getResponse = await novuClient.topics.subscriptions.getSubscription(
        topicKey,
        subscriptionIdentifier as string
      );

      expect(getResponse.result).to.exist;
      expect(getResponse.result.contextKeys).to.deep.equal([]);
      expect(getResponse.result.identifier).to.not.include(':ctx_');
    });
  });
});
