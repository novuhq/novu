import { Novu } from '@novu/api';
import { SubscriberEntity, TopicSubscribersRepository } from '@novu/dal';
import { CreateWorkflowDto, StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { SubscribersService, UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Get topic subscription - /v2/topics/:topicKey/subscriptions/:identifier (GET) #novu-v2', async () => {
  let session: UserSession;
  let novuClient: Novu;
  let subscriber: SubscriberEntity;
  let topicSubscribersRepository: TopicSubscribersRepository;

  before(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdk(session);
    topicSubscribersRepository = new TopicSubscribersRepository();

    const subscribersService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscribersService.createSubscriber();

    const workflowDto: CreateWorkflowDto = {
      name: 'Workflow 1',
      workflowId: 'get-subscription-workflow-1',
      __source: WorkflowCreationSourceEnum.DASHBOARD,
      tags: ['tag1'],
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

    await session.testAgent.post('/v2/workflows').send(workflowDto);
  });

  const createSubscription = async (topicKey: string) => {
    await novuClient.topics.create({ key: topicKey, name: 'Test Topic' });

    const subscriptionResponse = await novuClient.topics.subscriptions.create(
      {
        subscriberIds: [subscriber.subscriberId],
        preferences: [
          {
            filter: { workflowIds: ['get-subscription-workflow-1'] },
            enabled: false,
          },
        ],
      },
      topicKey
    );

    expect(subscriptionResponse.result.data.length, 'Should have created a subscription').to.equal(1);

    const identifier = subscriptionResponse.result.data[0].identifier;
    expect(identifier, 'Should have an identifier').to.be.a('string');

    return { identifier: identifier as string };
  };

  it('should return the subscription with its preferences when queried by identifier', async () => {
    const topicKey = `topic-key-get-by-identifier-${Date.now()}`;
    const subscription = await createSubscription(topicKey);

    const response = await session.testAgent.get(
      `/v2/topics/${topicKey}/subscriptions/${encodeURIComponent(subscription.identifier)}`
    );

    expect(response.status).to.equal(200);
    expect(response.body.data.identifier).to.equal(subscription.identifier);
    expect(response.body.data.preferences?.length).to.be.greaterThan(0);
    expect(response.body.data.preferences[0].enabled).to.equal(false);
  });

  it('should return the subscription when queried by its internal id', async () => {
    const topicKey = `topic-key-get-by-internal-id-${Date.now()}`;
    const subscription = await createSubscription(topicKey);

    const subscriptionEntity = await topicSubscribersRepository.findOne({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      identifier: subscription.identifier,
    });

    const response = await session.testAgent.get(`/v2/topics/${topicKey}/subscriptions/${subscriptionEntity?._id}`);

    expect(response.status).to.equal(200);
    expect(response.body.data.id).to.equal(subscriptionEntity?._id);
    expect(response.body.data.identifier).to.equal(subscription.identifier);
  });

  it('should return the subscription by internal id when it has no identifier', async () => {
    const topicKey = `topic-key-get-legacy-${Date.now()}`;
    const topicResponse = await novuClient.topics.create({ key: topicKey, name: 'Legacy Topic' });

    await topicSubscribersRepository.createSubscriptions([
      {
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        _subscriberId: subscriber._id,
        _topicId: topicResponse.result.id,
        topicKey,
        externalSubscriberId: subscriber.subscriberId,
        identifier: '',
      },
    ]);

    const subscriptionEntity = await topicSubscribersRepository.findOne({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      topicKey,
    });

    const response = await session.testAgent.get(`/v2/topics/${topicKey}/subscriptions/${subscriptionEntity?._id}`);

    expect(response.status).to.equal(200);
    expect(response.body.data.id).to.equal(subscriptionEntity?._id);
  });

  it('should return 204 when the subscription does not exist', async () => {
    const topicKey = `topic-key-get-missing-${Date.now()}`;
    await createSubscription(topicKey);

    const response = await session.testAgent.get(`/v2/topics/${topicKey}/subscriptions/does-not-exist`);

    expect(response.status).to.equal(204);
  });
});
