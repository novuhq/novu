import { Novu } from '@novu/api';
import { JobRepository, JobStatusEnum, NotificationTemplateEntity, SubscriberEntity } from '@novu/dal';
import { DelayTypeEnum, DigestTypeEnum, StepTypeEnum } from '@novu/shared';
import { SubscribersService, UserSession } from '@novu/testing';
import axios from 'axios';
import { expect } from 'chai';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';
import { pollForJobStatusChange } from './utils/poll-for-job-status-change.util';

const axiosInstance = axios.create();

describe('Complete event - /v1/events/trigger/complete (POST) #novu-v2', () => {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;
  const jobRepository = new JobRepository();
  let novuClient: Novu;

  async function completeMatchingSteps(query: Record<string, string | string[]>) {
    await axiosInstance.post(`${session.serverUrl}/v1/events/trigger/complete`, undefined, {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
      params: query,
    });
  }

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    template = await session.createTemplate();
    subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber();
    novuClient = initNovuClassSdk(session);
  });

  it('should complete a none digest via query filters', async () => {
    template = await session.createTemplate({
      steps: [
        {
          name: 'Digest approval batch',
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            digestKey: 'groupId',
            type: DigestTypeEnum.NONE,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{step.events.length}}' as string,
        },
      ],
    });

    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: {
        groupId: 'wait-group-1',
        customVar: 'trigger_1_data',
      },
    });

    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: {
        groupId: 'wait-group-1',
        customVar: 'trigger_2_data',
      },
    });

    await session.waitForWorkflowQueueCompletion();
    await session.waitForSubscriberQueueCompletion();

    const activeDigestJobs = await pollForJobStatusChange({
      jobRepository,
      query: {
        _environmentId: session.environment._id,
        _templateId: template._id,
        type: StepTypeEnum.DIGEST,
      },
      findMultiple: true,
    });

    expect(activeDigestJobs?.filter((job) => job.status === JobStatusEnum.DELAYED).length).to.eql(1);
    expect(activeDigestJobs?.filter((job) => job.status === JobStatusEnum.MERGED).length).to.eql(1);

    await completeMatchingSteps({
      subscriberId: subscriber.subscriberId,
      workflowId: template.triggers[0].identifier,
      digestKey: 'groupId',
      stepName: 'Digest approval batch',
      stepType: StepTypeEnum.DIGEST,
    });

    const completedDigestJobs = await pollForJobStatusChange({
      jobRepository,
      query: {
        _environmentId: session.environment._id,
        _templateId: template._id,
        status: JobStatusEnum.COMPLETED,
        type: StepTypeEnum.DIGEST,
      },
      findMultiple: true,
    });

    expect(completedDigestJobs?.length).to.eql(1);
    expect(completedDigestJobs?.[0]?.digest?.events?.length).to.eql(2);
  });

  it('should complete none delay steps in bulk using transactionIds', async () => {
    template = await session.createTemplate({
      steps: [
        {
          name: 'Wait for approval',
          type: StepTypeEnum.DELAY,
          content: '',
          metadata: {
            type: DelayTypeEnum.NONE,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{customVar}}' as string,
        },
      ],
    });

    const { result: firstResult } = await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: {
        customVar: 'trigger_1_data',
      },
    });

    const { result: secondResult } = await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: {
        customVar: 'trigger_2_data',
      },
    });

    await session.waitForWorkflowQueueCompletion();
    await session.waitForSubscriberQueueCompletion();

    const delayedJobs = await pollForJobStatusChange({
      jobRepository,
      query: {
        _environmentId: session.environment._id,
        _templateId: template._id,
        status: JobStatusEnum.DELAYED,
        type: StepTypeEnum.DELAY,
      },
      findMultiple: true,
    });

    expect(delayedJobs?.length).to.eql(2);

    await completeMatchingSteps({
      transactionId: [firstResult.transactionId as string, secondResult.transactionId as string],
      workflowId: template.triggers[0].identifier,
      stepName: 'Wait for approval',
      stepType: StepTypeEnum.DELAY,
    });

    const completedDelayJobs = await pollForJobStatusChange({
      jobRepository,
      query: {
        _environmentId: session.environment._id,
        _templateId: template._id,
        status: JobStatusEnum.COMPLETED,
        type: StepTypeEnum.DELAY,
      },
      findMultiple: true,
    });

    expect(completedDelayJobs?.length).to.eql(2);
  });

  it('should complete multiple digest and delay workflows at once when stepType is omitted', async () => {
    const secondSubscriber = await subscriberService.createSubscriber();

    const digestTemplate = await session.createTemplate({
      steps: [
        {
          name: 'Shared approval gate',
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            digestKey: 'groupId',
            type: DigestTypeEnum.NONE,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Digest {{step.events.length}}' as string,
        },
      ],
    });

    const delayTemplate = await session.createTemplate({
      steps: [
        {
          name: 'Shared approval gate',
          type: StepTypeEnum.DELAY,
          content: '',
          metadata: {
            type: DelayTypeEnum.NONE,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Delay {{customVar}}' as string,
        },
      ],
    });

    await novuClient.trigger({
      workflowId: digestTemplate.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: {
        groupId: 'digest-a',
        customVar: 'digest_1',
      },
    });

    await novuClient.trigger({
      workflowId: digestTemplate.triggers[0].identifier,
      to: [secondSubscriber.subscriberId],
      payload: {
        groupId: 'digest-b',
        customVar: 'digest_2',
      },
    });

    await novuClient.trigger({
      workflowId: delayTemplate.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: {
        customVar: 'delay_1',
      },
    });

    await novuClient.trigger({
      workflowId: delayTemplate.triggers[0].identifier,
      to: [secondSubscriber.subscriberId],
      payload: {
        customVar: 'delay_2',
      },
    });

    await session.waitForWorkflowQueueCompletion();
    await session.waitForSubscriberQueueCompletion();

    const activeDigestJobs = await pollForJobStatusChange({
      jobRepository,
      query: {
        _environmentId: session.environment._id,
        _templateId: digestTemplate._id,
        status: JobStatusEnum.DELAYED,
        type: StepTypeEnum.DIGEST,
      },
      findMultiple: true,
    });

    const activeDelayJobs = await pollForJobStatusChange({
      jobRepository,
      query: {
        _environmentId: session.environment._id,
        _templateId: delayTemplate._id,
        status: JobStatusEnum.DELAYED,
        type: StepTypeEnum.DELAY,
      },
      findMultiple: true,
    });

    expect(activeDigestJobs?.length).to.eql(2);
    expect(activeDelayJobs?.length).to.eql(2);

    await completeMatchingSteps({
      subscriberId: [subscriber.subscriberId, secondSubscriber.subscriberId],
      stepName: 'Shared approval gate',
    });

    const completedDigestJobs = await pollForJobStatusChange({
      jobRepository,
      query: {
        _environmentId: session.environment._id,
        _templateId: digestTemplate._id,
        status: JobStatusEnum.COMPLETED,
        type: StepTypeEnum.DIGEST,
      },
      findMultiple: true,
    });

    const completedDelayJobs = await pollForJobStatusChange({
      jobRepository,
      query: {
        _environmentId: session.environment._id,
        _templateId: delayTemplate._id,
        status: JobStatusEnum.COMPLETED,
        type: StepTypeEnum.DELAY,
      },
      findMultiple: true,
    });

    expect(completedDigestJobs?.length).to.eql(2);
    expect(completedDelayJobs?.length).to.eql(2);
  });
});
