import { Novu } from '@novu/api';
import { SubscriberEntity, TopicSubscribersRepository } from '@novu/dal';
import { CreateWorkflowDto, StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { SubscribersService, UserSession } from '@novu/testing';
import { expect } from 'chai';
import { expectSdkExceptionGeneric, initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Update topic subscription - /v2/topics/:topicKey/subscriptions/:identifier (PATCH) #novu-v2', async () => {
  let session: UserSession;
  let novuClient: Novu;
  let subscriber1: SubscriberEntity;
  let subscriber2: SubscriberEntity;
  let topicSubscribersRepository: TopicSubscribersRepository;

  before(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdk(session);
    topicSubscribersRepository = new TopicSubscribersRepository();

    const subscribersService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber1 = await subscribersService.createSubscriber();
    subscriber2 = await subscribersService.createSubscriber();

    const workflow1Dto: CreateWorkflowDto = {
      name: 'Workflow 1',
      workflowId: 'workflow-1',
      __source: WorkflowCreationSourceEnum.DASHBOARD,
      tags: ['tag1', 'important'],
      active: true,
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          name: 'Test Step',
          controlValues: {
            body: 'Test content',
          },
        },
      ],
    };

    const workflow2Dto: CreateWorkflowDto = {
      name: 'Workflow 2',
      workflowId: 'workflow-2',
      __source: WorkflowCreationSourceEnum.DASHBOARD,
      tags: ['tag2'],
      active: true,
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          name: 'Test Step',
          controlValues: {
            body: 'Test content',
          },
        },
      ],
    };

    const workflow3Dto: CreateWorkflowDto = {
      name: 'Workflow 3',
      workflowId: 'workflow-3',
      __source: WorkflowCreationSourceEnum.DASHBOARD,
      tags: ['tag3'],
      active: true,
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          name: 'Test Step',
          controlValues: {
            body: 'Test content',
          },
        },
      ],
    };

    await session.testAgent.post('/v2/workflows').send(workflow1Dto);
    await session.testAgent.post('/v2/workflows').send(workflow2Dto);
    await session.testAgent.post('/v2/workflows').send(workflow3Dto);
  });

  it('should update subscription preferences', async () => {
    const topicKey = `topic-key-update-${Date.now()}`;

    await novuClient.topics.create({
      key: topicKey,
      name: 'Test Topic',
    });

    const subscriptionResponse = await novuClient.topics.subscriptions.create(
      {
        subscriberIds: [subscriber1.subscriberId],
        preferences: [
          {
            filter: { workflowIds: ['workflow-1'], tags: ['tag1'] },
            enabled: true,
          },
        ],
      },
      topicKey
    );

    expect(subscriptionResponse.result.data.length, 'Should have created a subscription').to.equal(1);
    const subscriptionIdentifier = subscriptionResponse.result.data[0].identifier;

    const updateResponse = await novuClient.topics.subscriptions.update({
      topicKey,
      identifier: subscriptionIdentifier,
      updateTopicSubscriptionRequestDto: {
        preferences: [
          {
            filter: { workflowIds: ['workflow-2'], tags: ['tag2'] },
            enabled: false,
          },
        ],
      },
    });

    expect(updateResponse, 'Should have updated the subscription').to.exist;
    expect(updateResponse.result.identifier, 'Should have updated the subscription').to.equal(subscriptionIdentifier);
    expect(updateResponse.result.preferences, 'Should have preferences').to.exist;
    expect(updateResponse.result.preferences?.length, 'Should have preferences').to.be.greaterThan(0);

    const subscription = await topicSubscribersRepository.findOne({
      identifier: subscriptionIdentifier,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    expect(subscription, 'Should have found the subscription').to.exist;
  });

  it('should update subscription with multiple preferences', async () => {
    const topicKey = `topic-key-multiple-preferences-${Date.now()}`;

    await novuClient.topics.create({
      key: topicKey,
      name: 'Test Topic',
    });

    const subscriptionResponse = await novuClient.topics.subscriptions.create(
      {
        subscriberIds: [subscriber2.subscriberId],
        preferences: [
          {
            filter: { workflowIds: ['workflow-1'], tags: ['tag1'] },
            enabled: true,
          },
        ],
      },
      topicKey
    );

    const subscriptionIdentifier = subscriptionResponse.result.data[0].identifier;

    const updateResponse = await novuClient.topics.subscriptions.update({
      topicKey,
      identifier: subscriptionIdentifier,
      updateTopicSubscriptionRequestDto: {
        preferences: [
          {
            filter: { workflowIds: ['workflow-2'], tags: ['tag2'] },
            condition: { and: [{ '==': [{ var: 'status' }, 'active'] }] },
            enabled: true,
          },
          {
            filter: { tags: ['tag3'] },
            enabled: false,
          },
        ],
      },
    });

    expect(updateResponse).to.exist;
    expect(updateResponse.result.identifier).to.equal(subscriptionIdentifier);
    expect(updateResponse.result.preferences).to.exist;
  });

  it('should return 404 when subscription does not exist', async () => {
    const topicKey = `topic-key-404-${Date.now()}`;

    await novuClient.topics.create({
      key: topicKey,
      name: 'Test Topic',
    });

    const nonExistentSubscriptionIdentifier = 'non-existent-identifier';

    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.topics.subscriptions.update({
        topicKey,
        identifier: nonExistentSubscriptionIdentifier,
        updateTopicSubscriptionRequestDto: {
          preferences: [
            {
              filter: { workflowIds: ['workflow-1'] },
              enabled: true,
            },
          ],
        },
      })
    );

    expect(error, 'Should have returned an error').to.exist;
    expect(error?.statusCode, 'Should be 404 error').to.equal(404);
  });

  it('should return 404 when topic does not exist', async () => {
    const nonExistentTopicKey = `non-existent-topic-${Date.now()}`;
    const nonExistentSubscriptionIdentifier = 'non-existent-identifier';

    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.topics.subscriptions.update({
        topicKey: nonExistentTopicKey,
        identifier: nonExistentSubscriptionIdentifier,
        updateTopicSubscriptionRequestDto: {
          preferences: [
            {
              filter: { workflowIds: ['workflow-1'] },
              enabled: true,
            },
          ],
        },
      })
    );

    expect(error, 'Should have returned an error').to.exist;
    expect(error?.statusCode, 'Should be 404 error').to.equal(404);
  });

  it('should handle empty update request', async () => {
    const topicKey = `topic-key-empty-${Date.now()}`;

    await novuClient.topics.create({
      key: topicKey,
      name: 'Test Topic',
    });

    const subscriptionResponse = await novuClient.topics.subscriptions.create(
      {
        subscriberIds: [subscriber1.subscriberId],
        preferences: [
          {
            filter: { workflowIds: ['workflow-1'] },
            enabled: true,
          },
        ],
      },
      topicKey
    );

    const subscriptionIdentifier = subscriptionResponse.result.data[0].identifier;

    const updateResponse = await novuClient.topics.subscriptions.update({
      topicKey,
      identifier: subscriptionIdentifier,
      updateTopicSubscriptionRequestDto: {},
    });

    expect(updateResponse).to.exist;
    expect(updateResponse.result.identifier).to.equal(subscriptionIdentifier);
  });

  it('should update subscription with custom condition preferences', async () => {
    const topicKey = `topic-key-custom-${Date.now()}`;

    await novuClient.topics.create({
      key: topicKey,
      name: 'Test Topic',
    });

    const subscriptionResponse = await novuClient.topics.subscriptions.create(
      {
        subscriberIds: [subscriber1.subscriberId],
      },
      topicKey
    );

    const subscriptionIdentifier = subscriptionResponse.result.data[0].identifier;

    const customCondition = {
      and: [{ '==': [{ var: 'priority' }, 'high'] }, { '>': [{ var: 'amount' }, 100] }],
    };

    const updateResponse = await novuClient.topics.subscriptions.update({
      topicKey,
      identifier: subscriptionIdentifier,
      updateTopicSubscriptionRequestDto: {
        preferences: [
          {
            filter: { workflowIds: ['workflow-1'], tags: ['important'] },
            condition: customCondition,
            enabled: true,
          },
        ],
      },
    });

    expect(updateResponse).to.exist;
    expect(updateResponse.result.identifier).to.equal(subscriptionIdentifier);
    expect(updateResponse.result.preferences).to.exist;
    expect(updateResponse.result.preferences?.length).to.be.greaterThan(0);
  });

  it('should update subscription name', async () => {
    const topicKey = `topic-key-name-${Date.now()}`;

    await novuClient.topics.create({
      key: topicKey,
      name: 'Test Topic',
    });

    const subscriptionResponse = await novuClient.topics.subscriptions.create(
      {
        subscriberIds: [subscriber1.subscriberId],
      },
      topicKey
    );

    const subscriptionIdentifier = subscriptionResponse.result.data[0].identifier;

    const updateResponse = await novuClient.topics.subscriptions.update({
      topicKey,
      identifier: subscriptionIdentifier,
      updateTopicSubscriptionRequestDto: {
        name: 'Updated Subscription Name',
      },
    });

    expect(updateResponse).to.exist;
    expect(updateResponse.result.identifier).to.equal(subscriptionIdentifier);

    const subscription = await topicSubscribersRepository.findOne({
      identifier: subscriptionIdentifier,
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });

    expect(subscription?.name).to.equal('Updated Subscription Name');
  });
});
