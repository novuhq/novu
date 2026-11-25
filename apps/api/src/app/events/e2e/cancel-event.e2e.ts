import { Novu } from '@novu/api';
import { JobRepository, JobStatusEnum, NotificationTemplateEntity, SubscriberEntity } from '@novu/dal';
import { DelayTypeEnum, DigestTypeEnum, DigestUnitEnum, StepTypeEnum } from '@novu/shared';
import { SubscribersService, UserSession } from '@novu/testing';
import axios from 'axios';
import { expect } from 'chai';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';
import { pollForJobStatusChange } from './utils/poll-for-job-status-change.util';

const axiosInstance = axios.create();

describe('Cancel event - /v1/events/trigger/:transactionId (DELETE) #novu-v2', () => {
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

  /*
   * Cancel only affects jobs that are already DELAYED. A digest or delay becomes DELAYED after the
   * trigger step runs on the standard queue, which the workflow and subscriber queue waits do not cover.
   */
  async function waitForDelayedJobs(transactionId: string, type: StepTypeEnum, expectedCount: number) {
    const jobs = await pollForJobStatusChange({
      jobRepository,
      query: {
        _environmentId: session.environment._id,
        _templateId: template._id,
        type,
        transactionId,
      },
      findMultiple: true,
      expectedCount,
      timeout: 15000,
    });

    expect(jobs?.map((job) => job.status)).to.eql(Array(expectedCount).fill(JobStatusEnum.DELAYED));
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

    await waitForDelayedJobs(transactionId!, StepTypeEnum.DIGEST, 1);

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

    await waitForDelayedJobs(transactionId!, StepTypeEnum.DELAY, 2);

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

  it('should promote the next merged trigger when the main digest is cancelled', async () => {
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.MINUTES,
            amount: 5,
            type: DigestTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{step.events.length}}' as string,
        },
      ],
    });

    // One trigger at a time, so the first digest is the main one and the merge order is fixed.
    const transactionIds: string[] = [];
    for (const expectedStatus of [JobStatusEnum.DELAYED, JobStatusEnum.MERGED, JobStatusEnum.MERGED]) {
      const { result } = await novuClient.trigger({
        workflowId: template.triggers[0].identifier,
        to: [subscriber.subscriberId],
      });
      const digestJob = await pollForJobStatusChange({
        jobRepository,
        query: {
          _environmentId: session.environment._id,
          transactionId: result.transactionId,
          type: StepTypeEnum.DIGEST,
        },
        timeout: 15000,
      });

      expect(digestJob?.status).to.equal(expectedStatus);
      transactionIds.push(result.transactionId!);
    }

    const [mainTransactionId, followerTransactionId, lastTransactionId] = transactionIds;

    await cancelEvent(mainTransactionId);

    const findJob = (transactionId: string, type: StepTypeEnum) =>
      jobRepository.findOne({ _environmentId: session.environment._id, transactionId, type });
    const [mainDigest, mainInApp, followerDigest, followerInApp, lastDigest] = await Promise.all([
      findJob(mainTransactionId, StepTypeEnum.DIGEST),
      findJob(mainTransactionId, StepTypeEnum.IN_APP),
      findJob(followerTransactionId, StepTypeEnum.DIGEST),
      findJob(followerTransactionId, StepTypeEnum.IN_APP),
      findJob(lastTransactionId, StepTypeEnum.DIGEST),
    ]);

    expect(mainDigest?.status).to.equal(JobStatusEnum.CANCELED);
    expect(mainInApp?.status).to.equal(JobStatusEnum.CANCELED);
    expect(followerDigest?.status).to.equal(JobStatusEnum.DELAYED);
    expect(followerDigest?._mergedDigestId).to.not.exist;
    expect(followerInApp?.status).to.equal(JobStatusEnum.PENDING);
    expect(lastDigest?.status).to.equal(JobStatusEnum.MERGED);
    expect(lastDigest?._mergedDigestId).to.equal(followerDigest?._id);
  });
});
