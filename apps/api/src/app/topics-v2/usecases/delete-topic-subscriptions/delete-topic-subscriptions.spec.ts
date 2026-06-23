import {
  PreferencesRepository,
  SubscriberEntity,
  SubscriberRepository,
  TopicEntity,
  TopicRepository,
  TopicSubscribersEntity,
  TopicSubscribersRepository,
} from '@novu/dal';
import { PreferencesTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { DeleteTopicSubscriptionsCommand } from './delete-topic-subscriptions.command';
import { DeleteTopicSubscriptionsUsecase } from './delete-topic-subscriptions.usecase';

describe('DeleteTopicSubscriptionsUsecase', () => {
  const validEnvId = '507f1f77bcf86cd799439011';
  const validOrgId = '507f1f77bcf86cd799439012';
  const validTopicId = '507f1f77bcf86cd799439013';
  const validSubscriberInternalId = '507f1f77bcf86cd799439014';
  const validSubscriptionId = '507f1f77bcf86cd799439015';
  const externalSubscriberId = 'external-subscriber-1';
  const topicKey = 'test-topic';

  let topicRepositoryMock: sinon.SinonStubbedInstance<TopicRepository>;
  let topicSubscribersRepositoryMock: sinon.SinonStubbedInstance<TopicSubscribersRepository>;
  let subscriberRepositoryMock: sinon.SinonStubbedInstance<SubscriberRepository>;
  let preferencesRepositoryMock: sinon.SinonStubbedInstance<PreferencesRepository>;

  let usecase: DeleteTopicSubscriptionsUsecase;

  const fakeSession = { id: 'fake-session' } as any;

  const mockTopic = {
    _id: validTopicId,
    _organizationId: validOrgId,
    _environmentId: validEnvId,
    key: topicKey,
    name: 'Test Topic',
  } as TopicEntity;

  const mockSubscriber = {
    _id: validSubscriberInternalId,
    _organizationId: validOrgId,
    _environmentId: validEnvId,
    subscriberId: externalSubscriberId,
  } as SubscriberEntity;

  const mockSubscription = {
    _id: validSubscriptionId,
    _organizationId: validOrgId,
    _environmentId: validEnvId,
    _topicId: validTopicId,
    _subscriberId: validSubscriberInternalId,
    topicKey,
    externalSubscriberId,
  } as TopicSubscribersEntity;

  beforeEach(() => {
    topicRepositoryMock = sinon.createStubInstance(TopicRepository);
    topicSubscribersRepositoryMock = sinon.createStubInstance(TopicSubscribersRepository);
    subscriberRepositoryMock = sinon.createStubInstance(SubscriberRepository);
    preferencesRepositoryMock = sinon.createStubInstance(PreferencesRepository);

    topicRepositoryMock.findTopicByKey.resolves(mockTopic);
    subscriberRepositoryMock.searchByExternalSubscriberIds.resolves([mockSubscriber]);
    topicSubscribersRepositoryMock.find.resolves([mockSubscription]);

    // @ts-expect-error Mock withTransaction to invoke the callback with our fake session
    topicSubscribersRepositoryMock.withTransaction = sinon
      .stub()
      .callsFake(async (callback: (session: unknown) => Promise<unknown>) => callback(fakeSession));

    preferencesRepositoryMock.delete.resolves({ acknowledged: true, deletedCount: 1 } as any);
    topicSubscribersRepositoryMock.delete.resolves({ acknowledged: true, deletedCount: 1 } as any);

    usecase = new DeleteTopicSubscriptionsUsecase(
      topicRepositoryMock as any,
      topicSubscribersRepositoryMock as any,
      subscriberRepositoryMock as any,
      preferencesRepositoryMock as any
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  function createCommand(): DeleteTopicSubscriptionsCommand {
    return DeleteTopicSubscriptionsCommand.create({
      environmentId: validEnvId,
      organizationId: validOrgId,
      userId: 'user-id',
      topicKey,
      subscriptions: [{ subscriberId: externalSubscriberId }],
    });
  }

  it('passes the transaction session to the preferences delete and scopes by organization', async () => {
    await usecase.execute(createCommand());

    expect(preferencesRepositoryMock.delete.calledOnce).to.equal(true);
    const [filter, options] = preferencesRepositoryMock.delete.firstCall.args;
    expect(filter).to.deep.include({
      _environmentId: validEnvId,
      _organizationId: validOrgId,
      type: PreferencesTypeEnum.SUBSCRIPTION_SUBSCRIBER_WORKFLOW,
    });
    expect(filter._topicSubscriptionId).to.deep.equal({ $in: [validSubscriptionId] });
    expect(options).to.deep.equal({ session: fakeSession });
  });

  it('passes the transaction session to the topic subscribers delete and scopes by organization', async () => {
    await usecase.execute(createCommand());

    expect(topicSubscribersRepositoryMock.delete.calledOnce).to.equal(true);
    const [filter, options] = topicSubscribersRepositoryMock.delete.firstCall.args;
    expect(filter).to.deep.include({
      _environmentId: validEnvId,
      _organizationId: validOrgId,
    });
    expect(filter._id).to.deep.equal({ $in: [validSubscriptionId] });
    expect(options).to.deep.equal({ session: fakeSession });
  });

  it('uses a single transaction for both deletes (preferences first, then subscribers)', async () => {
    await usecase.execute(createCommand());

    expect(topicSubscribersRepositoryMock.withTransaction.calledOnce).to.equal(true);
    expect(preferencesRepositoryMock.delete.calledBefore(topicSubscribersRepositoryMock.delete)).to.equal(true);
  });

  it('rolls back by surfacing the error when the second delete fails inside the transaction', async () => {
    const failure = new Error('subscription delete failed');
    topicSubscribersRepositoryMock.delete.rejects(failure);

    let caught: Error | undefined;
    try {
      await usecase.execute(createCommand());
    } catch (err) {
      caught = err as Error;
    }

    expect(caught).to.equal(failure);
    expect(preferencesRepositoryMock.delete.calledOnce).to.equal(true);
    expect(topicSubscribersRepositoryMock.delete.calledOnce).to.equal(true);
    const [, prefOptions] = preferencesRepositoryMock.delete.firstCall.args;
    const [, subOptions] = topicSubscribersRepositoryMock.delete.firstCall.args;
    expect(prefOptions).to.deep.equal({ session: fakeSession });
    expect(subOptions).to.deep.equal({ session: fakeSession });
  });
});
