import { DeliveryLifecycleDetail, DeliveryLifecycleStatusEnum, PreferencesTypeEnum, StepTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { SendMessageCommand } from './send-message.command';
import { SendMessage } from './send-message.usecase';
import { SendMessageStatus } from './send-message-type.usecase';

const SUBSCRIBER = { _id: 'subscriber-db-id', subscriberId: 'subscriber-id' };

function buildCommand(overrides: Partial<SendMessageCommand> = {}): SendMessageCommand {
  const job = {
    _id: 'job-id',
    _environmentId: 'environment-id',
    _organizationId: 'organization-id',
    _subscriberId: SUBSCRIBER._id,
    _templateId: 'template-id',
    _notificationId: 'notification-id',
    subscriberId: SUBSCRIBER.subscriberId,
    transactionId: 'transaction-id',
    identifier: 'workflow',
    type: StepTypeEnum.PUSH,
    contextKeys: [],
    step: { _id: 'step-id', stepId: 'push-step', filters: [], template: { type: StepTypeEnum.PUSH } },
  };

  return {
    identifier: 'workflow',
    payload: {},
    overrides: {},
    step: job.step,
    transactionId: job.transactionId,
    notificationId: job._notificationId,
    _templateId: job._templateId,
    environmentId: job._environmentId,
    organizationId: job._organizationId,
    userId: 'user-id',
    subscriberId: job.subscriberId,
    _subscriberId: job._subscriberId,
    jobId: job._id,
    job,
    tags: [],
    contextKeys: [],
    workflow: { _id: 'template-id', steps: [] },
    subscriber: SUBSCRIBER,
    ...overrides,
  } as unknown as SendMessageCommand;
}

function buildUsecase(channelEnabled: boolean) {
  const subscriberRepository = { findOne: sinon.stub().resolves(SUBSCRIBER) };
  const executeBridgeJob = { execute: sinon.stub().resolves({ outputs: {}, options: {} }) };
  const sendMessagePush = { execute: sinon.stub().resolves({ status: SendMessageStatus.SUCCESS }) };
  const getSubscriberTemplatePreference = {
    execute: sinon.stub().resolves({
      preference: { enabled: true, channels: { push: channelEnabled } },
      type: PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
    }),
  };
  const environmentRepository = {
    findByIdAndOrganization: sinon.stub().resolves({ _id: 'environment-id', name: 'Production', type: 'prod' }),
  };
  const passThroughCache = { get: (_store: unknown, _key: string, fetch: () => Promise<unknown>) => fetch() };

  const usecase = Object.assign(Object.create(SendMessage.prototype), {
    sendMessagePush,
    createExecutionDetails: { execute: sinon.stub().resolves() },
    getSubscriberTemplatePreferenceUsecase: getSubscriberTemplatePreference,
    conditionsFilter: { filter: sinon.stub().resolves({ passed: true, conditions: [] }) },
    subscriberRepository,
    tenantRepository: { findOne: sinon.stub().resolves(null) },
    analyticsService: { mixpanelTrack: sinon.stub() },
    contextRepository: { findByKeys: sinon.stub().resolves([]) },
    environmentVariableRepository: { findByEnvironment: sinon.stub().resolves([]) },
    environmentRepository,
    executeBridgeJob,
    inMemoryLRUCacheService: passThroughCache,
    createStepConditionEvaluationDetail: { execute: sinon.stub().resolves() },
  }) as SendMessage;

  return {
    usecase,
    executeBridgeJob,
    environmentRepository,
    sendMessagePush,
    subscriberRepository,
    getSubscriberTemplatePreference,
  };
}

describe('SendMessage - preference gate', () => {
  it('skips a step disabled by preferences before building variables or calling the bridge', async () => {
    const { usecase, executeBridgeJob, environmentRepository, sendMessagePush, subscriberRepository } =
      buildUsecase(false);

    const result = await usecase.execute(buildCommand());

    expect(result).to.deep.equal({
      status: SendMessageStatus.SKIPPED,
      deliveryLifecycleState: {
        status: DeliveryLifecycleStatusEnum.SKIPPED,
        detail: DeliveryLifecycleDetail.SUBSCRIBER_PREFERENCE,
      },
    });
    expect(executeBridgeJob.execute.called).to.equal(false);
    expect(environmentRepository.findByIdAndOrganization.called).to.equal(false);
    expect(subscriberRepository.findOne.called).to.equal(false);
    expect(sendMessagePush.execute.called).to.equal(false);
  });

  it('hands the global preference read by RunJob to the preference evaluation', async () => {
    const { usecase, getSubscriberTemplatePreference } = buildUsecase(false);
    const subscriberGlobalPreference = { _id: 'global-preference-id' };

    await usecase.execute(buildCommand({ subscriberGlobalPreference } as unknown as Partial<SendMessageCommand>));

    expect(getSubscriberTemplatePreference.execute.firstCall.args[0].subscriberGlobalPreference).to.deep.equal(
      subscriberGlobalPreference
    );
  });

  it('passes the loaded environment to the bridge and delivers an enabled step', async () => {
    const { usecase, executeBridgeJob, environmentRepository, sendMessagePush } = buildUsecase(true);

    const result = await usecase.execute(buildCommand());

    expect(result.status).to.equal(SendMessageStatus.SUCCESS);
    expect(environmentRepository.findByIdAndOrganization.calledOnce).to.equal(true);
    expect(executeBridgeJob.execute.firstCall.args[0].environment).to.deep.include({ _id: 'environment-id' });
    expect(sendMessagePush.execute.calledOnce).to.equal(true);
  });

  it('fetches the subscriber when RunJob did not provide it', async () => {
    const { usecase, subscriberRepository } = buildUsecase(false);

    await usecase.execute(buildCommand({ subscriber: undefined }));

    expect(subscriberRepository.findOne.calledOnce).to.equal(true);
  });
});
