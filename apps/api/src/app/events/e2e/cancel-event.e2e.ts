import { Novu } from '@novu/api';
import { JobRepository, JobStatusEnum, NotificationTemplateEntity, SubscriberEntity } from '@novu/dal';
import { DelayTypeEnum, DigestTypeEnum, DigestUnitEnum, StepTypeEnum } from '@novu/shared';
import { SubscribersService, UserSession } from '@novu/testing';
import axios from 'axios';
import { expect } from 'chai';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';
import { pollForJobStatusChange } from './utils/poll-for-job-status-change.util';

const axiosInstance = axios.create();

describe('Cancel event - /v1/events/trigger (DELETE) #novu-v2', () => {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;
  const jobRepository = new JobRepository();
  let novuClient: Novu;

  async function cancelEvent(transactionId: string) {
    // TODO: Replace with await novuClient.cancel(transactionId) when the response validation error is fixed
    await axiosInstance.delete(`${session.serverUrl}/v1/events/trigger/${transactionId}`, {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    });
  }

  async function cancelEventByQuery(query: Record<string, string | string[]>) {
    await axiosInstance.delete(`${session.serverUrl}/v1/events/trigger`, {
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

  it('should cancel a digest step', async () => {
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.SECONDS,
            amount: 2,
            digestKey: 'id',
            type: DigestTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{step.events.length}}' as string,
        },
      ],
    });

    const { result } = await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
    });

    const { transactionId } = result;

    await session.waitForWorkflowQueueCompletion();
    await session.waitForSubscriberQueueCompletion();

    await cancelEvent(transactionId!);

    const cancelledDigestJobs = await pollForJobStatusChange({
      jobRepository,
      query: {
        _environmentId: session.environment._id,
        _templateId: template._id,
        status: JobStatusEnum.CANCELED,
        type: StepTypeEnum.DIGEST,
        transactionId,
      },
      findMultiple: true,
    });

    expect(cancelledDigestJobs?.length).to.eql(1);
  });

  it('should cancel active digests by query filters without a transactionId', async () => {
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.SECONDS,
            amount: 30,
            digestKey: 'groupId',
            type: DigestTypeEnum.REGULAR,
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
        groupId: 'group-1',
        customVar: 'trigger_1_data',
      },
    });

    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: {
        groupId: 'group-1',
        customVar: 'trigger_2_data',
      },
    });

    await session.waitForWorkflowQueueCompletion();
    await session.waitForSubscriberQueueCompletion();

    await cancelEventByQuery({
      subscriberId: subscriber.subscriberId,
      workflowId: template.triggers[0].identifier,
      digestKey: 'groupId',
      digestValue: 'group-1',
    });

    const cancelledDigestJobs = await pollForJobStatusChange({
      jobRepository,
      query: {
        _environmentId: session.environment._id,
        _templateId: template._id,
        status: JobStatusEnum.CANCELED,
        type: StepTypeEnum.DIGEST,
      },
      findMultiple: true,
    });

    expect(cancelledDigestJobs?.length).to.eql(2);
  });

  it('should cancel active delay steps by query filters using stepName and stepType', async () => {
    const secondSubscriber = await subscriberService.createSubscriber();
    template = await session.createTemplate({
      steps: [
        {
          name: 'Wait for cancellation',
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

    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: {
        customVar: 'trigger_1_data',
      },
    });

    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [secondSubscriber.subscriberId],
      payload: {
        customVar: 'trigger_2_data',
      },
    });

    await session.waitForWorkflowQueueCompletion();
    await session.waitForSubscriberQueueCompletion();

    await cancelEventByQuery({
      workflowId: template.triggers[0].identifier,
      stepName: 'Wait for cancellation',
      stepType: StepTypeEnum.DELAY,
    });

    const cancelledDelayJobs = await pollForJobStatusChange({
      jobRepository,
      query: {
        _environmentId: session.environment._id,
        _templateId: template._id,
        status: JobStatusEnum.CANCELED,
        type: StepTypeEnum.DELAY,
      },
      findMultiple: true,
    });

    expect(cancelledDelayJobs?.length).to.eql(2);
  });

  it('should cancel multiple delayed digests using an array of transactionIds', async () => {
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.SECONDS,
            amount: 30,
            digestKey: 'groupId',
            type: DigestTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{step.events.length}}' as string,
        },
      ],
    });

    const { result: firstResult } = await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: {
        groupId: 'bulk-group-1',
      },
    });

    const { result: secondResult } = await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: {
        groupId: 'bulk-group-2',
      },
    });

    await session.waitForWorkflowQueueCompletion();
    await session.waitForSubscriberQueueCompletion();

    await cancelEventByQuery({
      transactionId: [firstResult.transactionId as string, secondResult.transactionId as string],
    });

    const cancelledDigestJobs = await pollForJobStatusChange({
      jobRepository,
      query: {
        _environmentId: session.environment._id,
        _templateId: template._id,
        status: JobStatusEnum.CANCELED,
        type: StepTypeEnum.DIGEST,
      },
      findMultiple: true,
    });

    expect(cancelledDigestJobs?.length).to.eql(2);
  });

  it('should cancel multiple digest and delay workflows at once when stepType is omitted', async () => {
    const secondSubscriber = await subscriberService.createSubscriber();

    const digestTemplate = await session.createTemplate({
      steps: [
        {
          name: 'Shared cancel gate',
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
          name: 'Shared cancel gate',
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

    await cancelEventByQuery({
      subscriberId: [subscriber.subscriberId, secondSubscriber.subscriberId],
      stepName: 'Shared cancel gate',
    });

    const cancelledDigestJobs = await pollForJobStatusChange({
      jobRepository,
      query: {
        _environmentId: session.environment._id,
        _templateId: digestTemplate._id,
        status: JobStatusEnum.CANCELED,
        type: StepTypeEnum.DIGEST,
      },
      findMultiple: true,
    });

    const cancelledDelayJobs = await pollForJobStatusChange({
      jobRepository,
      query: {
        _environmentId: session.environment._id,
        _templateId: delayTemplate._id,
        status: JobStatusEnum.CANCELED,
        type: StepTypeEnum.DELAY,
      },
      findMultiple: true,
    });

    expect(cancelledDigestJobs?.length).to.eql(2);
    expect(cancelledDelayJobs?.length).to.eql(2);
  });

  it('should cancel a delay step for all subscribers', async () => {
    const secondSubscriber = await subscriberService.createSubscriber();
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DELAY,
          content: '',
          metadata: {
            unit: DigestUnitEnum.SECONDS,
            amount: 3,
            type: DelayTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{customVar}}' as string,
        },
      ],
    });

    const { result } = await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId, secondSubscriber.subscriberId],
    });

    const { transactionId } = result;

    await session.waitForWorkflowQueueCompletion();
    await session.waitForSubscriberQueueCompletion();

    await cancelEvent(transactionId!);

    const delayedJobs = await pollForJobStatusChange({
      jobRepository,
      query: {
        _environmentId: session.environment._id,
        _templateId: template._id,
        type: StepTypeEnum.DELAY,
        transactionId,
        status: JobStatusEnum.CANCELED,
      },
      findMultiple: true,
    });

    await session.waitForJobCompletion();

    expect(delayedJobs?.[0]?.status).to.equal(JobStatusEnum.CANCELED);
    expect(delayedJobs?.[1]?.status).to.equal(JobStatusEnum.CANCELED);
  });

  it.skip('should cancel a digest after it has already digested some triggers', async () => {
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.SECONDS,
            amount: 1,
            digestKey: 'id',
            type: DigestTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{step.events.length}}' as string,
        },
      ],
    });

    const { result: result1 } = await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: {
        customVar: 'trigger_1_data',
      },
    });

    const { result: result2 } = await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: {
        customVar: 'trigger_2_data',
      },
    });

    const { result: result3 } = await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: {
        customVar: 'trigger_2_data',
      },
    });

    // Wait for trigger2 to be merged to trigger1
    await session.waitForJobCompletion();

    await cancelEvent(result2.transactionId!);

    await session.waitForWorkflowQueueCompletion();
    await session.waitForSubscriberQueueCompletion();

    const digestJobs = await jobRepository.find(
      {
        _environmentId: session.environment._id,
        _templateId: template._id,
        type: StepTypeEnum.DIGEST,
      },
      undefined,
      { sort: { createdAt: 1 } }
    );

    expect(digestJobs.length).to.eql(3);

    expect(digestJobs[0]!.status).to.eql(JobStatusEnum.COMPLETED);
    expect(digestJobs[1]!.status).to.eql(JobStatusEnum.CANCELED);
    expect(digestJobs[2]!.status).to.eql(JobStatusEnum.MERGED);

    const jobs = await jobRepository.find(
      {
        _environmentId: session.environment._id,
        _templateId: template._id,
        type: StepTypeEnum.IN_APP,
      },
      undefined,
      { sort: { createdAt: 1 } }
    );

    const rootTrigger = jobs[0];
    expect(rootTrigger.status).to.eql(JobStatusEnum.COMPLETED);
    expect(rootTrigger.payload.customVar).to.eql('trigger_1_data');
    expect(rootTrigger.digest?.events?.length).to.eql(2);
    expect(rootTrigger.digest?.events?.[0].customVar).to.eql('trigger_1_data');
    expect(rootTrigger.digest?.events?.[1].customVar).to.eql('trigger_3_data');

    const secondCancelledTrigger = jobs[1];
    expect(secondCancelledTrigger.payload.customVar).to.eql('trigger_2_data');
    expect(secondCancelledTrigger.status).to.eql(JobStatusEnum.CANCELED);

    const thirdMergedTrigger = jobs[2];
    expect(thirdMergedTrigger.payload.customVar).to.eql('trigger_3_data');
    expect(thirdMergedTrigger.status).to.eql(JobStatusEnum.MERGED);
  });

  it.skip('should be able to cancel 1st main digest', async () => {
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.SECONDS,
            amount: 1,
            digestKey: 'id',
            type: DigestTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{step.events.length}}' as string,
        },
      ],
    });

    const { result: result1 } = await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: {
        customVar: 'trigger_1_data',
      },
    });
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
    const { result: result2 } = await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: {
        customVar: 'trigger_2_data',
      },
    });

    // Wait for trigger2 to be merged to trigger1
    await session.waitForJobCompletion(template?._id);
    await cancelEvent(result1.transactionId!);

    const { result: result3 } = await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: {
        customVar: 'trigger_3_data',
      },
    });

    await session.waitForJobCompletion(template?._id);

    const delayedJobs = await jobRepository.find(
      {
        _environmentId: session.environment._id,
        _templateId: template._id,
        type: StepTypeEnum.DIGEST,
      },
      undefined,
      { sort: { createdAt: 1 } }
    );

    expect(delayedJobs.length).to.eql(3);

    const cancelledDigestJobs = await jobRepository.find(
      {
        _environmentId: session.environment._id,
        _templateId: template._id,
        status: JobStatusEnum.CANCELED,
        type: StepTypeEnum.DIGEST,
        transactionId: result1.transactionId,
      },
      undefined,
      { sort: { createdAt: 1 } }
    );

    expect(cancelledDigestJobs.length).to.eql(1);

    const inpAppJobs = await jobRepository.find(
      {
        _environmentId: session.environment._id,
        _templateId: template._id,
        type: StepTypeEnum.IN_APP,
      },
      undefined,
      { sort: { createdAt: 1 } }
    );

    const firstMainCanceledTrigger = inpAppJobs[0];
    expect(firstMainCanceledTrigger.status).to.eql(JobStatusEnum.CANCELED);
    expect(firstMainCanceledTrigger.payload.customVar).to.eql('trigger_1_data');
    expect(firstMainCanceledTrigger.digest?.events?.length).to.eql(0);

    const secondTrigger = inpAppJobs[1];
    expect(secondTrigger.payload.customVar).to.eql('trigger_2_data');
    expect(secondTrigger.status).to.eql(JobStatusEnum.COMPLETED);
    expect(secondTrigger.digest?.events?.length).to.eql(2);
    expect(secondTrigger.digest?.events?.[0].customVar).to.eql('trigger_2_data');
    expect(secondTrigger.digest?.events?.[1].customVar).to.eql('trigger_3_data');

    const thirdMergedTrigger = inpAppJobs[2];
    expect(thirdMergedTrigger.payload.customVar).to.eql('trigger_3_data');
    expect(thirdMergedTrigger.digest?.events?.length).to.eql(0);
    expect(thirdMergedTrigger.status).to.eql(JobStatusEnum.MERGED);
  });

  it.skip('should be able to cancel 1st main digest and then its follower', async () => {
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.SECONDS,
            amount: 1,
            digestKey: 'id',
            type: DigestTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{step.events.length}}' as string,
        },
      ],
    });
    const { result: result1 } = await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: {
        customVar: 'trigger_1_data',
      },
    });
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
    const { result: result2 } = await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: {
        customVar: 'trigger_2_data',
      },
    });

    // Wait for trigger2 to be merged to trigger1
    const mainDigest = result1.transactionId;
    await session.waitForJobCompletion(template?._id);
    await cancelEvent(mainDigest!);
    const { result: result3 } = await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: {
        customVar: 'trigger_3_data',
      },
    });

    // Wait for trigger3 to be merged to trigger2
    const followerDigest = result2.transactionId;
    await session.waitForJobCompletion(template?._id);
    await cancelEvent(followerDigest!);
    const { result: result4 } = await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: {
        customVar: 'trigger_4_data',
      },
    });

    await session.waitForJobCompletion(template?._id);

    const delayedJobs = await jobRepository.find(
      {
        _environmentId: session.environment._id,
        _templateId: template._id,
        type: StepTypeEnum.DIGEST,
      },
      undefined,
      { sort: { createdAt: 1 } }
    );

    expect(delayedJobs.length).to.eql(4);

    const cancelledDigestJobs = await jobRepository.find(
      {
        _environmentId: session.environment._id,
        _templateId: template._id,
        type: StepTypeEnum.DIGEST,
        transactionId: [result1.transactionId, result2.transactionId],
      },
      undefined,
      { sort: { createdAt: 1 } }
    );

    expect(cancelledDigestJobs.length).to.eql(2);

    const inpAppJobs = await jobRepository.find(
      {
        _environmentId: session.environment._id,
        _templateId: template._id,
        type: StepTypeEnum.IN_APP,
      },
      undefined,
      { sort: { createdAt: 1 } }
    );
    const firstMainCanceledTrigger = inpAppJobs[0];
    expect(firstMainCanceledTrigger.status).to.eql(JobStatusEnum.CANCELED);
    expect(firstMainCanceledTrigger.payload.customVar).to.eql('trigger_1_data');
    expect(firstMainCanceledTrigger.digest?.events?.length).to.eql(0);

    const secondFollowerCanceledTrigger = inpAppJobs[1];
    expect(secondFollowerCanceledTrigger.status).to.eql(JobStatusEnum.CANCELED);
    expect(secondFollowerCanceledTrigger.payload.customVar).to.eql('trigger_2_data');
    expect(secondFollowerCanceledTrigger.digest?.events?.length).to.eql(0);

    const thirdTriggerLatestFollower = inpAppJobs[2];
    expect(thirdTriggerLatestFollower.payload.customVar).to.eql('trigger_3_data');
    expect(thirdTriggerLatestFollower.status).to.eql(JobStatusEnum.COMPLETED);
    expect(thirdTriggerLatestFollower.digest?.events?.length).to.eql(2);
    expect(thirdTriggerLatestFollower.digest?.events?.[0].customVar).to.eql('trigger_3_data');
    expect(thirdTriggerLatestFollower.digest?.events?.[1].customVar).to.eql('trigger_4_data');

    const fourthMergedTrigger = inpAppJobs[3];
    expect(fourthMergedTrigger.payload.customVar).to.eql('trigger_4_data');
    expect(fourthMergedTrigger.digest?.events?.length).to.eql(0);
    expect(fourthMergedTrigger.status).to.eql(JobStatusEnum.MERGED);
  });

  it.skip('should be able to cancel 1st main digest and then its follower and last merged notification', async () => {
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.SECONDS,
            amount: 1,
            digestKey: 'id',
            type: DigestTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{step.events.length}}' as string,
        },
      ],
    });

    const { result: result1 } = await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: {
        customVar: 'trigger_1_data',
      },
    });
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
    const { result: result2 } = await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: {
        customVar: 'trigger_2_data',
      },
    });

    const mainDigest = result1.transactionId;
    await session.waitForJobCompletion(template?._id);
    await cancelEvent(mainDigest!);

    const { result: result3 } = await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: {
        customVar: 'trigger_3_data',
      },
    });

    // Wait for trigger3 to be merged to trigger2
    const followerDigest = result2.transactionId;
    await session.waitForJobCompletion(template?._id);
    await cancelEvent(followerDigest!);

    const { result } = await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload: {
        customVar: 'trigger_4_data',
      },
    });

    const { transactionId } = result;

    // Wait for trigger4 to be merged to trigger3
    await session.waitForJobCompletion(template?._id);
    await cancelEvent(transactionId!);

    const delayedJobs = await jobRepository.find(
      {
        _environmentId: session.environment._id,
        _templateId: template._id,
        type: StepTypeEnum.DIGEST,
      },
      undefined,
      { sort: { createdAt: 1 } }
    );

    expect(delayedJobs.length).to.eql(4);

    const cancelledDigestJobs = await jobRepository.find(
      {
        _environmentId: session.environment._id,
        _templateId: template._id,
        type: StepTypeEnum.DIGEST,
        transactionId: [result1.transactionId, result2.transactionId, result.transactionId],
      },
      undefined,
      { sort: { createdAt: 1 } }
    );

    expect(cancelledDigestJobs.length).to.eql(3);

    const inpAppJobs = await jobRepository.find(
      {
        _environmentId: session.environment._id,
        _templateId: template._id,
        type: StepTypeEnum.IN_APP,
      },
      undefined,
      { sort: { createdAt: 1 } }
    );

    const firstMainCanceledTrigger = inpAppJobs[0];
    expect(firstMainCanceledTrigger.status).to.eql(JobStatusEnum.CANCELED);
    expect(firstMainCanceledTrigger.payload.customVar).to.eql('trigger_1_data');
    expect(firstMainCanceledTrigger.digest?.events?.length).to.eql(0);

    const secondFollowerCanceledTrigger = inpAppJobs[1];
    expect(secondFollowerCanceledTrigger.status).to.eql(JobStatusEnum.CANCELED);
    expect(secondFollowerCanceledTrigger.payload.customVar).to.eql('trigger_2_data');
    expect(secondFollowerCanceledTrigger.digest?.events?.length).to.eql(0);

    const thirdTriggerLatestFollower = inpAppJobs[2];
    expect(thirdTriggerLatestFollower.payload.customVar).to.eql('trigger_3_data');
    expect(thirdTriggerLatestFollower.status).to.eql(JobStatusEnum.COMPLETED);
    expect(thirdTriggerLatestFollower.digest?.events?.length).to.eql(1);
    expect(thirdTriggerLatestFollower.digest?.events?.[0].customVar).to.eql('trigger_3_data');

    const fourthMergedTrigger = inpAppJobs[3];
    expect(fourthMergedTrigger.payload.customVar).to.eql('trigger_4_data');
    expect(fourthMergedTrigger.digest?.events?.length).to.eql(0);
    expect(fourthMergedTrigger.status).to.eql(JobStatusEnum.CANCELED);
  });
});
